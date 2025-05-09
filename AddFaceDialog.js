function AddFaceDialog({ isOpen, onClose, initialData = null }) {
    try {
        const [name, setName] = React.useState('');
        const [age, setAge] = React.useState('');
        const [gender, setGender] = React.useState('');
        const [image, setImage] = React.useState(null);
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState(null);

        React.useEffect(() => {
            if (initialData) {
                setName('');
                setAge(initialData.age || '');
                setGender(initialData.gender || '');
                setImage(initialData.imageUrl);
                setError(null);
            } else {
                setName('');
                setAge('');
                setGender('');
                setImage(null);
                setError(null);
            }
        }, [initialData, isOpen]);

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);

            try {
                let descriptor;
                if (initialData?.descriptor) {
                    descriptor = initialData.descriptor;
                } else {
                    descriptor = await getFaceDescriptor(image);
                }

                if (!descriptor) {
                    throw new Error('Could not detect a face in the image');
                }

                const faceData = {
                    name: name.trim(),
                    age: parseInt(age),
                    gender,
                    imageUrl: image,
                    descriptor: descriptor,
                    createdAt: new Date().toISOString()
                };

                await trickleCreateObject('face', faceData);
                setLoading(false);
                onClose(true);
            } catch (error) {
                console.error('Error adding face:', error);
                setError(error.message || 'Error adding face');
                setLoading(false);
            }
        };

        const handleImageChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    setError('Image size should be less than 5MB');
                    return;
                }

                const reader = new FileReader();
                reader.onloadend = () => {
                    setImage(reader.result);
                    setError(null);
                };
                reader.onerror = () => {
                    setError('Error reading image file');
                };
                reader.readAsDataURL(file);
            }
        };

        if (!isOpen) return null;

        return (
            <div data-name="dialog-overlay" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div data-name="dialog-content" className="bg-white rounded-lg p-6 w-full max-w-md">
                    <div data-name="dialog-header" className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Add New Face</h2>
                        <button
                            data-name="close-button"
                            onClick={() => onClose(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    {error && (
                        <div data-name="error-message" className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2">Name</label>
                            <input
                                data-name="name-input"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2">Age</label>
                            <input
                                data-name="age-input"
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                                required
                                min="0"
                                max="120"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2">Gender</label>
                            <select
                                data-name="gender-select"
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                                required
                            >
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        {!initialData && (
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Image</label>
                                <input
                                    data-name="image-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="w-full"
                                    required
                                />
                            </div>
                        )}
                        {(initialData?.imageUrl || image) && (
                            <div className="mb-4">
                                <img
                                    data-name="preview-image"
                                    src={initialData?.imageUrl || image}
                                    alt="Face preview"
                                    className="w-32 h-32 object-cover rounded-full mx-auto"
                                />
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <button
                                data-name="cancel-button"
                                type="button"
                                onClick={() => onClose(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                data-name="submit-button"
                                type="submit"
                                disabled={loading}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                            >
                                {loading ? 'Adding...' : 'Add Face'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    } catch (error) {
        console.error('AddFaceDialog component error:', error);
        reportError(error);
        return null;
    }
}
