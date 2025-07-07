const express = require('express');
const cors = require('cors');
const setRoutes = require('./routes/jsonRoutes');
const modelRoutes = require('./routes/modelRoutes');
const ritmRoutes = require('./routes/ritmRoutes');
const maskWatcher = require('./utils/maskWatcher');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// --- Start Flask app.py as a subprocess using the bash script ---
const flaskScriptPath = path.resolve(__dirname, 'start_flask.sh');

// Verify the script exists
if (!fs.existsSync(flaskScriptPath)) {
    console.error('Error: start_flask.sh script not found at:', flaskScriptPath);
    console.error('Please make sure the start_flask.sh file exists in the backend directory');
    process.exit(1);
}

console.log('Starting Flask server using script:', flaskScriptPath);

const flaskProcess = spawn('bash', [flaskScriptPath], {
    stdio: 'inherit',
    env: { ...process.env, FLASK_ENV: 'development' }
});

flaskProcess.on('error', (error) => {
    console.error('Failed to start Flask process:', error);
});

flaskProcess.on('close', (code) => {
    console.log(`Flask server exited with code ${code}`);
});

// Cleanup processes on exit
process.on('exit', () => {
    console.log('Shutting down Flask process...');
    flaskProcess.kill();
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    flaskProcess.kill('SIGINT');
    maskWatcher.stop();
    process.exit();
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    flaskProcess.kill('SIGTERM');
    maskWatcher.stop();
    process.exit();
});

// --- End Flask integration ---

app.use(cors());
app.use(express.json());

// Add a health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Backend server is running' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend API is healthy' });
});

// Set up routes
setRoutes(app);

// Register model routes explicitly
app.use('/api/model', modelRoutes);
// Register RITM routes explicitly
app.use('/api/ritm', ritmRoutes);

// Start the mask watcher
maskWatcher.start();

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Model endpoints are available at http://localhost:${port}/api/model/run and http://localhost:${port}/api/model/run-single-frame`);
});