# Backend Service for JSON Storage

This project provides a backend service built with Express.js to handle the storage of JSON data associated with images. The service allows for saving JSON files in a designated "json" folder whenever an image is switched.

## Project Structure

- **src/**: Contains the main application code.
  - **controllers/**: Contains the logic for handling requests related to JSON data.
    - `jsonController.js`: Manages the saving of JSON data.
  - **middleware/**: Contains middleware functions for the application.
    - `corsMiddleware.js`: Enables CORS for the application.
  - **routes/**: Defines the routes for the application.
    - `jsonRoutes.js`: Sets up routes for saving JSON data.
  - **utils/**: Contains utility functions for file operations.
    - `fileHelpers.js`: Provides functions for writing JSON data to files.
  - **json/**: Directory for storing JSON files.
    - `.gitkeep`: Ensures the "json" directory is tracked by Git.
  - `app.js`: Initializes the Express application and sets up middleware.
  - `server.js`: Entry point for starting the server.

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the backend directory:
   ```
   cd backend
   ```

3. Install the dependencies:
   ```
   npm install
   ```

## Usage

1. Start the server:
   ```
   npm start
   ```

2. The server will listen on the specified port (default is 3000). You can send requests to save JSON data associated with images.

## API Endpoints

- **POST /api/json/save**: Saves JSON data to the "json" folder based on the image file name.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.