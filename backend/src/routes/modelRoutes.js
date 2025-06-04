const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');

// POST endpoint to run the model on a specific frame
router.post('/run', modelController.runModel.bind(modelController));

module.exports = router; 