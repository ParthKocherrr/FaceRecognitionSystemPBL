function VideoStream({ onFaceDetected, onUnknownFace }) {
    try {
        const videoRef = React.useRef();
        const canvasRef = React.useRef();
        const lastDetectionRef = React.useRef(null);
        const [isInitialized, setIsInitialized] = React.useState(false);
        const [recognitionResult, setRecognitionResult] = React.useState(null);
        const [error, setError] = React.useState(null);
        const [modelLoading, setModelLoading] = React.useState(true);
        const [isProcessingUnknown, setIsProcessingUnknown] = React.useState(false);
        const unknownFaceTimeoutRef = React.useRef(null);

        React.useEffect(() => {
            let mounted = true;

            const waitForFaceApi = () => {
                return new Promise((resolve, reject) => {
                    const checkFaceApi = () => {
                        if (typeof faceapi !== 'undefined') {
                            resolve();
                        } else if (!mounted) {
                            reject(new Error('Component unmounted'));
                        } else {
                            setTimeout(checkFaceApi, 100);
                        }
                    };
                    checkFaceApi();
                });
            };

            const initializeCamera = async () => {
                try {
                    setModelLoading(true);
                    await waitForFaceApi();
                    await loadFaceApiModels();
                    
                    if (!mounted) return;

                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                            width: { ideal: 640 },
                            height: { ideal: 480 },
                            facingMode: "user"
                        } 
                    });

                    if (!mounted) {
                        stream.getTracks().forEach(track => track.stop());
                        return;
                    }

                    videoRef.current.srcObject = stream;
                    
                    await new Promise((resolve) => {
                        videoRef.current.onloadedmetadata = () => {
                            videoRef.current.play();
                            resolve();
                        };
                    });

                    if (!mounted) return;

                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                    
                    setModelLoading(false);
                    setIsInitialized(true);
                    setError(null);
                } catch (error) {
                    console.error('Error initializing camera:', error);
                    if (mounted) {
                        setError(error.message);
                        setModelLoading(false);
                        reportError(error);
                    }
                }
            };

            initializeCamera();

            return () => {
                mounted = false;
                if (videoRef.current?.srcObject) {
                    videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                }
                if (unknownFaceTimeoutRef.current) {
                    clearTimeout(unknownFaceTimeoutRef.current);
                }
            };
        }, []);

        React.useEffect(() => {
            if (!isInitialized) return;

            let mounted = true;
            let frameId;
            let lastUnknownCheck = 0;
            const unknownCheckDelay = 2000;

            const detectFaces = async () => {
                if (!mounted) return;

                try {
                    const detections = await detectFacesInVideo(videoRef.current, canvasRef.current);
                    
                    if (!mounted) return;

                    if (detections && detections.length > 0) {
                        const currentTime = Date.now();
                        onFaceDetected(detections);

                        const detection = detections[0];
                        lastDetectionRef.current = detection;
                        
                        if (detection.match) {
                            if (detection.match.name !== 'unknown') {
                                setRecognitionResult(detection.match);
                                setIsProcessingUnknown(false);
                            } else if (!isProcessingUnknown && currentTime - lastUnknownCheck >= unknownCheckDelay) {
                                lastUnknownCheck = currentTime;
                                setRecognitionResult(null);
                            }
                        }
                    } else {
                        setRecognitionResult(null);
                        lastDetectionRef.current = null;
                    }

                    frameId = requestAnimationFrame(detectFaces);
                } catch (error) {
                    console.error('Error in face detection:', error);
                    if (mounted) {
                        frameId = requestAnimationFrame(detectFaces);
                    }
                }
            };

            frameId = requestAnimationFrame(detectFaces);

            return () => {
                mounted = false;
                cancelAnimationFrame(frameId);
            };
        }, [isInitialized, isProcessingUnknown, onFaceDetected]);

        const handleCanvasClick = (event) => {
            if (!lastDetectionRef.current || lastDetectionRef.current.match.name !== 'unknown') {
                return;
            }

            const rect = canvasRef.current.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const scale = canvasRef.current.width / rect.width;
            const scaledX = x * scale;
            const scaledY = y * scale;

            const faceBox = lastDetectionRef.current.detection.box;
            const padding = 10;
            const isInBox = (
                scaledX >= (faceBox.x - padding) &&
                scaledX <= (faceBox.x + faceBox.width + padding) &&
                scaledY >= (faceBox.y - padding) &&
                scaledY <= (faceBox.y + faceBox.height + padding)
            );

            if (isInBox) {
                const canvas = document.createElement('canvas');
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoRef.current, 0, 0);

                onUnknownFace({
                    imageUrl: canvas.toDataURL('image/jpeg'),
                    descriptor: lastDetectionRef.current.descriptor,
                    age: Math.round(lastDetectionRef.current.age),
                    gender: lastDetectionRef.current.gender,
                    expression: lastDetectionRef.current.expressions ? 
                        Object.entries(lastDetectionRef.current.expressions)
                            .reduce((a, b) => a[1] > b[1] ? a : b)[0] 
                        : null
                });
            }
        };

        return (
            <div data-name="video-stream" className="video-container mx-auto mt-8">
                <video
                    data-name="webcam"
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full"
                />
                <canvas
                    data-name="face-overlay"
                    ref={canvasRef}
                    className="face-canvas cursor-pointer"
                    onClick={handleCanvasClick}
                />
                {recognitionResult && (
                    <div data-name="recognition-result" className="recognition-result">
                        <p className="name">Name: {recognitionResult.name}</p>
                        <p className="confidence">Confidence: {Math.round(recognitionResult.confidence * 100)}%</p>
                        {recognitionResult.age && (
                            <p className="age">Age: {recognitionResult.age}</p>
                        )}
                        {recognitionResult.gender && (
                            <p className="gender">Gender: {recognitionResult.gender}</p>
                        )}
                        {recognitionResult.expression && (
                            <p className="expression">Mood: {recognitionResult.expression}</p>
                        )}
                    </div>
                )}
                {(!isInitialized || modelLoading) && (
                    <div data-name="loading" className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50">
                        <div className="loading-spinner mb-4"></div>
                        <div className="text-white text-center">
                            {modelLoading ? 'Loading face detection models...' : 'Initializing camera...'}
                        </div>
                        {error && (
                            <div className="text-red-400 text-center mt-4">
                                Error: {error}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    } catch (error) {
        console.error('VideoStream component error:', error);
        reportError(error);
        return null;
    }
}
