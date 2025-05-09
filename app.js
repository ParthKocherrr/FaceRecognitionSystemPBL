function App() {
    try {
        const [isDialogOpen, setIsDialogOpen] = React.useState(false);
        const [unknownFaceData, setUnknownFaceData] = React.useState(null);

        const handleFaceDetected = (detections) => {
            // Handle real-time face detections if needed
        };

        const handleUnknownFace = (faceData) => {
            setUnknownFaceData(faceData);
            setIsDialogOpen(true);
        };

        const handleDialogClose = () => {
            setIsDialogOpen(false);
            setUnknownFaceData(null);
        };

        return (
            <div data-name="app" className="min-h-screen bg-gray-50">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <VideoStream 
                        onFaceDetected={handleFaceDetected}
                        onUnknownFace={handleUnknownFace}
                    />
                    <AddFaceDialog
                        isOpen={isDialogOpen}
                        onClose={handleDialogClose}
                        initialData={unknownFaceData}
                    />
                </main>
            </div>
        );
    } catch (error) {
        console.error('App component error:', error);
        reportError(error);
        return null;
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
