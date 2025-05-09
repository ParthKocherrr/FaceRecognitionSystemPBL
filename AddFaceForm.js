function AddFaceForm({ onFaceAdded }) {
    try {
        const [name, setName] = React.useState('');
        const [age, setAge] = React.useState('');
        const [gender, setGender] = React.useState('');
        const [image, setImage] = React.useState(null);
        const [loading, setLoading] = React.useState(false);

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);

            try {
                const faceData = {
                    name,
                    age: parseInt(age),
                    gender,
                    imageUrl: image,
                    descriptor: await getFaceDescriptor(image)
                };

                await trickleCreateObject('face', faceData);
                setName('');
                setAge('');
                setGender('');
                setImage(null);
                onFaceAdded();
            } catch (error) {
                console.error('Error adding face:', error);
            } finally {
                setLoading(false);
            }
        };

        const handleImageChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setImage(reader.result);
                reader.readAsDataURL(file);
            }
        };

        return (
            <div data-name="add-face-form" className="mt-8">
                <h2 data-name="section-title" className="text-xl font-bold mb-4">Add New Face</h2>
                <form onSubmit={handleSubmit} className="max-w-md">
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
                    <button
                        data-name="submit-button"
                        type="submit"
                        disabled={loading}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                    >
                        {loading ? 'Adding...' : 'Add Face'}
                    </button>
                </form>
            </div>
        );
    } catch (error) {
        console.error('AddFaceForm component error:', error);
        reportError(error);
        return null;
    }
}
