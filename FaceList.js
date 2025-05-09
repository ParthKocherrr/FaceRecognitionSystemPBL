function FaceList() {
    try {
        const [faces, setFaces] = React.useState([]);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
            loadFaces();
        }, []);

        const loadFaces = async () => {
            try {
                const response = await trickleListObjects('face', 100, true);
                setFaces(response.items);
                setLoading(false);
            } catch (error) {
                console.error('Error loading faces:', error);
                setLoading(false);
            }
        };

        const handleDelete = async (objectId) => {
            try {
                await trickleDeleteObject('face', objectId);
                await loadFaces();
            } catch (error) {
                console.error('Error deleting face:', error);
            }
        };

        if (loading) {
            return (
                <div data-name="loading" className="flex justify-center items-center p-4">
                    <div className="loading-spinner"></div>
                </div>
            );
        }

        return (
            <div data-name="face-list" className="mt-8">
                <h2 data-name="section-title" className="text-xl font-bold mb-4">Registered Faces</h2>
                <div data-name="faces-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {faces.map(face => (
                        <div
                            data-name="face-card"
                            key={face.objectId}
                            className="border rounded-lg p-4 shadow-sm"
                        >
                            <img
                                data-name="face-image"
                                src={face.objectData.imageUrl}
                                alt={face.objectData.name}
                                className="w-32 h-32 object-cover rounded-full mx-auto"
                            />
                            <div data-name="face-info" className="mt-4 text-center">
                                <h3 className="font-semibold">{face.objectData.name}</h3>
                                <p className="text-gray-600">Age: {face.objectData.age}</p>
                                <p className="text-gray-600">Gender: {face.objectData.gender}</p>
                                <button
                                    data-name="delete-button"
                                    onClick={() => handleDelete(face.objectId)}
                                    className="mt-2 text-red-600 hover:text-red-800"
                                >
                                    <i className="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    } catch (error) {
        console.error('FaceList component error:', error);
        reportError(error);
        return null;
    }
}
