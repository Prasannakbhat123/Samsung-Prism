const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const jsonRoutes = require('./routes/jsonRoutes');
const modelRoutes = require('./routes/modelRoutes');

const app = express();

// CORS configuration - updated to allow any frontend origin during development
const corsOptions = {
  origin: '*', // Allow all origins in development (restrict in production)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Create json folder if it doesn't exist - with specific permissions
const jsonFolder = path.join(__dirname, 'json');
if (!fs.existsSync(jsonFolder)) {
  console.log(`Creating JSON directory at ${jsonFolder}`);
  try {
    fs.mkdirSync(jsonFolder, { recursive: true, mode: 0o777 }); // Full permissions
    console.log('✅ JSON directory created successfully');
  } catch (err) {
    console.error('❌ Failed to create JSON directory:', err);
  }
} else {
  // Ensure the folder has write permissions
  try {
    fs.accessSync(jsonFolder, fs.constants.W_OK);
    console.log('✅ JSON directory exists with write permissions');
  } catch (err) {
    console.error('❌ JSON directory exists but lacks write permissions:', err);
    console.log('Attempting to set permissions...');
    try {
      fs.chmodSync(jsonFolder, 0o777);
      console.log('✅ JSON directory permissions updated');
    } catch (permErr) {
      console.error('❌ Failed to set permissions:', permErr);
    }
  }
}

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Set up routes
app.use('/api', jsonRoutes);
app.use('/api/model', modelRoutes);

// Simple test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend API is running',
    jsonFolderPath: jsonFolder,
    jsonFolderExists: fs.existsSync(jsonFolder),
    jsonFolderWritable: checkFolderWritable(jsonFolder)
  });
});

// Helper function to check if a folder is writable
function checkFolderWritable(folderPath) {
  try {
    fs.accessSync(folderPath, fs.constants.W_OK);
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = app;