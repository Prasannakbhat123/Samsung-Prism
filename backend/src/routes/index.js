const express = require('express');
const router = express.Router();
const jsonRoutes = require('./jsonRoutes');
const modelRoutes = require('./modelRoutes');

// Debug endpoint for logging
router.post('/debug/log', (req, res) => {
  const { message } = req.body;
  console.log('[DEBUG]', message);
  res.json({ success: true });
});

router.use('/json', jsonRoutes);
router.use('/model', modelRoutes);

module.exports = router; 