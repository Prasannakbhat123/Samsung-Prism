# Backend Server for Image Segmenter

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Run the server:
   ```
   npm start
   ```

3. Important Notes:
   - Ensure the `src/json` folder exists and has write permissions
   - The server runs on port 3000 by default
   - Frontend must point to the correct API endpoint

## Troubleshooting

### JSON files not being saved:

1. Check if the `src/json` folder exists
2. Verify that the folder has write permissions
3. Check server logs for any errors
4. Make sure the frontend is sending requests to the correct endpoint