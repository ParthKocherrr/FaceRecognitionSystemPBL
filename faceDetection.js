async function loadFaceApiModels() {
    try {
        if (typeof faceapi === 'undefined') {
            throw new Error('face-api.js is not loaded');
        }

        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';

        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);

        return true;
    } catch (error) {
        console.error('Error loading face-api models:', error);
        throw error;
    }
}

// Optimized box smoother with faster response
const boxSmoother = {
    history: [],
    maxHistory: 5, // Reduced history size for faster response
    weightDecay: 0.8, // Adjusted weight decay for quicker updates
    lastValidBox: null,
    noDetectionCount: 0,
    maxNoDetection: 5, // Reduced max frames without detection
    lastUpdateTime: 0,
    minUpdateInterval: 1000 / 30, // Cap at 30fps for performance

    smooth(newBox) {
        const now = performance.now();
        if (now - this.lastUpdateTime < this.minUpdateInterval) {
            return this.lastValidBox;
        }
        this.lastUpdateTime = now;

        if (!newBox) {
            this.noDetectionCount++;
            if (this.noDetectionCount > this.maxNoDetection) {
                this.reset();
                return null;
            }
            return this.lastValidBox;
        }

        // Quick return if it's the first detection
        if (!this.lastValidBox) {
            this.lastValidBox = newBox;
            this.history = [newBox];
            return newBox;
        }

        // Lerp between current position and new position
        const lerp = (start, end, t) => start + (end - start) * t;
        const lerpFactor = 0.3; // Adjust this value to control smoothing (0-1)

        const smoothedBox = {
            x: lerp(this.lastValidBox.x, newBox.x, lerpFactor),
            y: lerp(this.lastValidBox.y, newBox.y, lerpFactor),
            width: lerp(this.lastValidBox.width, newBox.width, lerpFactor),
            height: lerp(this.lastValidBox.height, newBox.height, lerpFactor)
        };

        this.history.push(smoothedBox);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        this.lastValidBox = smoothedBox;
        this.noDetectionCount = 0;

        return smoothedBox;
    },

    reset() {
        this.history = [];
        this.lastValidBox = null;
        this.noDetectionCount = 0;
        this.lastUpdateTime = 0;
    }
};

let cachedFaceMatcher = null;
let lastMatchUpdate = 0;
const MATCHER_UPDATE_INTERVAL = 1000; // Update matcher every second

async function detectFacesInVideo(videoElement, canvasElement) {
    try {
        if (!videoElement || !canvasElement) return [];

        const now = performance.now();
        const dimensions = {
            width: videoElement.videoWidth,
            height: videoElement.videoHeight
        };

        // Detect face with optimized options
        const detection = await faceapi.detectSingleFace(
            videoElement,
            new faceapi.SsdMobilenetv1Options({ 
                minConfidence: 0.5,
                maxResults: 1
            })
        )
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withAgeAndGender()
        .withFaceExpressions();

        const ctx = canvasElement.getContext('2d');
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        if (!detection) {
            const smoothedBox = boxSmoother.smooth(null);
            if (smoothedBox) {
                drawFaceBox(ctx, smoothedBox, 'unknown', {
                    age: '?',
                    gender: '?',
                    confidence: 0
                });
            }
            return [];
        }

        const resizedDetection = faceapi.resizeResults(detection, dimensions);
        const smoothedBox = boxSmoother.smooth(resizedDetection.detection.box);

        try {
            // Update face matcher cache periodically
            if (!cachedFaceMatcher || now - lastMatchUpdate > MATCHER_UPDATE_INTERVAL) {
                const response = await trickleListObjects('face', 100, true);
                const faces = response.items || [];
                
                if (faces.length > 0) {
                    const labeledDescriptors = faces
                        .filter(face => face.objectData && Array.isArray(face.objectData.descriptor))
                        .map(face => new faceapi.LabeledFaceDescriptors(
                            face.objectData.name,
                            [Float32Array.from(face.objectData.descriptor)]
                        ));

                    if (labeledDescriptors.length > 0) {
                        cachedFaceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
                        lastMatchUpdate = now;
                    }
                }
            }

            if (cachedFaceMatcher) {
                const match = cachedFaceMatcher.findBestMatch(resizedDetection.descriptor);

                drawFaceBox(ctx, smoothedBox, match.label, {
                    age: Math.round(resizedDetection.age),
                    gender: resizedDetection.gender,
                    confidence: 1 - match.distance,
                    expression: Object.entries(resizedDetection.expressions)
                        .reduce((a, b) => a[1] > b[1] ? a : b)[0]
                });

                resizedDetection.match = {
                    name: match.label,
                    confidence: 1 - match.distance,
                    age: Math.round(resizedDetection.age),
                    gender: resizedDetection.gender,
                    expression: Object.entries(resizedDetection.expressions)
                        .reduce((a, b) => a[1] > b[1] ? a : b)[0]
                };

                return [resizedDetection];
            }

            drawFaceBox(ctx, smoothedBox, 'unknown', {
                age: Math.round(resizedDetection.age),
                gender: resizedDetection.gender,
                confidence: 1,
                expression: Object.entries(resizedDetection.expressions)
                    .reduce((a, b) => a[1] > b[1] ? a : b)[0]
            });

            resizedDetection.match = {
                name: 'unknown',
                confidence: 1,
                age: Math.round(resizedDetection.age),
                gender: resizedDetection.gender,
                expression: Object.entries(resizedDetection.expressions)
                    .reduce((a, b) => a[1] > b[1] ? a : b)[0]
            };

            return [resizedDetection];
        } catch (error) {
            console.error('Error matching faces:', error);
            return [resizedDetection];
        }
    } catch (error) {
        console.error('Error detecting faces:', error);
        return [];
    }
}

function drawFaceBox(ctx, box, label, info) {
    const padding = 15;
    
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
        // Draw box with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = label !== 'unknown' ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(
            box.x - padding,
            box.y - padding,
            box.width + (padding * 2),
            box.height + (padding * 2)
        );

        // Reset shadow for text
        ctx.shadowColor = 'transparent';

        const mainLabel = label !== 'unknown' ?
            `${label} (${Math.round(info.confidence * 100)}%)` :
            'Unknown';
        
        const subLabel = `Age: ~${info.age}, ${info.gender}`;
        
        // Draw label background
        ctx.font = 'bold 16px Arial';
        const mainMetrics = ctx.measureText(mainLabel);
        const subMetrics = ctx.measureText(subLabel);
        const maxWidth = Math.max(mainMetrics.width, subMetrics.width);
        const textPadding = 8;
        const textHeight = 45;

        ctx.fillStyle = label !== 'unknown' ? 
            'rgba(0, 255, 0, 0.85)' : 
            'rgba(255, 0, 0, 0.85)';
        
        ctx.fillRect(
            box.x - padding,
            box.y - padding - textHeight - 5,
            maxWidth + (textPadding * 2),
            textHeight
        );

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(
            mainLabel,
            box.x - padding + textPadding,
            box.y - padding - textHeight + 20
        );
        ctx.fillText(
            subLabel,
            box.x - padding + textPadding,
            box.y - padding - textHeight + 40
        );
    });
}

async function getFaceDescriptor(imageUrl) {
    try {
        if (typeof faceapi === 'undefined') {
            throw new Error('face-api.js is not loaded');
        }

        const img = await faceapi.fetchImage(imageUrl);
        
        const detection = await faceapi
            .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({
                minConfidence: 0.5
            }))
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            throw new Error('No face detected in the image');
        }

        return Array.from(detection.descriptor);
    } catch (error) {
        console.error('Error getting face descriptor:', error);
        throw error;
    }
}
