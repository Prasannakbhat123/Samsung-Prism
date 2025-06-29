const express = require('express');
const router = express.Router();
const ritmService = require('../services/ritmService');

// Load image by name
router.post('/load_image_by_name', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'No filename provided' });
    }
    
    const result = await ritmService.loadImageByName(filename);
    res.json(result);
  } catch (error) {
    console.error('Error loading image:', error);
    res.status(500).json({ 
      error: 'Failed to load image',
      details: error.message
    });
  }
});

// Add click
router.post('/add_click', async (req, res) => {
  try {
    const { x, y, is_positive = true } = req.body;
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'X and Y coordinates are required' });
    }
    
    const result = await ritmService.addClick(x, y, is_positive);
    res.json(result);
  } catch (error) {
    console.error('Error adding click:', error);
    res.status(500).json({ 
      error: 'Failed to add click',
      details: error.message
    });
  }
});

// Get model info
router.get('/model_info', async (req, res) => {
  try {
    const result = await ritmService.getModelInfo();
    res.json(result);
  } catch (error) {
    console.error('Error getting model info:', error);
    res.status(500).json({ 
      error: 'Failed to get model info',
      details: error.message
    });
  }
});

// Reset session
router.post('/reset_session', async (req, res) => {
  try {
    await ritmService.resetSession();
    res.json({ success: true, message: 'Session reset successfully' });
  } catch (error) {
    console.error('Error resetting session:', error);
    res.status(500).json({ 
      error: 'Failed to reset session',
      details: error.message
    });
  }
});

module.exports = router; 