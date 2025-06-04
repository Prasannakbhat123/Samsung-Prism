const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');

// Keep the original route
router.post('/run', modelController.runSingleFrame);

// Add the route that the frontend is using
router.post('/run-single-frame', modelController.runSingleFrame);

module.exports = router;