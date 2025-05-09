function Header() {
    try {
        return (
            <div data-name="header" className="bg-gray-800 text-white p-4">
                <div className="container mx-auto">
                    <h1 data-name="title" className="text-2xl font-bold">Face Recognition System</h1>
                    <p data-name="subtitle" className="text-sm mt-1">Detect and recognize faces with age and gender information</p>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Header component error:', error);
        reportError(error);
        return null;
    }
}
