const express = require('express');
const JsonController = require('../controllers/jsonController');

const router = express.Router();
const jsonController = new JsonController();

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

  // Mount the router on the '/api' path
  app.use('/api', router);
  
  return router;
};

module.exports = setRoutes;