const express = require('express');
const JsonController = require('../controllers/jsonController');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();
const jsonController = new JsonController();

// Configure multer for file uploads with linear structure
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempBasePath = path.join(__dirname, '..', 'temp');
    fs.mkdirSync(tempBasePath, { recursive: true });
    cb(null, tempBasePath);
  },
  filename: (req, file, cb) => {
    // Extract just the filename without the path
    const filename = file.originalname.split('/').pop();
    cb(null, filename);
  }
});

const upload = multer({ storage });

// Function to set up routes
const setRoutes = (app) => {
  // POST route to save JSON data
  router.post('/save-json', (req, res) => {
    jsonController.saveJson(req, res);
  });
  
  // GET route to fetch all JSON files
  router.get('/files', (req, res) => {
    jsonController.getAllJson(req, res);
  });

  // GET route to fetch a specific JSON file by name
  router.get('/file/:fileName', (req, res) => {
    jsonController.getJsonByName(req, res);
  });

  // POST route to handle file uploads
  router.post('/upload-files', upload.array('files'), (req, res) => {
    try {
      const tempFolderPath = path.join(__dirname, '..', 'temp');

      res.status(200).json({ 
        message: 'Files uploaded successfully',
        tempFolder: tempFolderPath
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ 
        error: 'Failed to upload files',
        details: error.message
      });
    }
  });

  // POST route to create JPEGImages folder
  router.post('/create-annotations', (req, res) => {
    const { folderPath } = req.body;
    const jpegImagesPath = path.join(__dirname, '..', 'JPEGImages');

    try {
      // Create JPEGImages directory if it doesn't exist
      if (!fs.existsSync(jpegImagesPath)) {
        fs.mkdirSync(jpegImagesPath, { recursive: true });
      }

      // Copy files directly to JPEGImages folder
      const copyFiles = (src) => {
        if (!fs.existsSync(src)) {
          throw new Error(`Source path does not exist: ${src}`);
        }

        const stats = fs.statSync(src);
        if (!stats.isDirectory()) {
          throw new Error(`Source path is not a directory: ${src}`);
        }

        // Read and sort all files
        const files = fs.readdirSync(src).sort((a, b) => a.localeCompare(b));

        // Copy each file to JPEGImages
        files.forEach(file => {
          const srcPath = path.join(src, file);
          const destPath = path.join(jpegImagesPath, file);
          
          // Only copy files, not directories
          if (fs.statSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, destPath);
          }
        });
      };

      // Copy the files
      copyFiles(folderPath);

      // Clean up temp folder after copying
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }

      res.status(200).json({ 
        message: 'JPEGImages folder created successfully',
        path: jpegImagesPath
      });
    } catch (error) {
      console.error('Error creating JPEGImages folder:', error);
      res.status(500).json({ 
        error: 'Failed to create JPEGImages folder',
        details: error.message
      });
    }
  });

  // Mount the router on the '/api' path
  app.use('/api', router);
  
  return router;
};

module.exports = setRoutes;