const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// POST route to run the model on a single frame
router.post('/run-single-frame', (req, res) => {
  const { frameNumber } = req.body;
  
  // Log the frame number being processed
  console.log(`Received request to process frame number: ${frameNumber}`);
  
  if (frameNumber === undefined || frameNumber === null) {
    return res.status(400).json({ error: 'Missing frameNumber parameter' });
  }
  
  // Check if it's a valid frame number
  if (isNaN(parseInt(frameNumber)) || parseInt(frameNumber) < 1) {
    return res.status(400).json({ 
      error: 'Invalid frameNumber. Must be a positive integer greater than 0.',
      receivedValue: frameNumber
    });
  }
  
  // Log the actual number being passed to the script
  const frameNumberInt = parseInt(frameNumber);
  console.log(`Processing frame ${frameNumberInt} with Python script`);
  
  // Spawn a new Python process to run the script
  const pythonProcess = spawn('python3', [
    path.join(__dirname, '../scripts/process_single_frame.py'),
    frameNumberInt
  ]);
  
  // Handle script output
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python output: ${data.toString()}`);
  });
  
  // Handle script errors
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python error: ${data.toString()}`);
  });
  
  // Handle script completion
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Python script exited with code ${code}`);
      return res.status(500).json({ error: `Script exited with code ${code}` });
    }
    
    console.log(`Frame ${frameNumberInt} processed successfully`);
    res.status(200).json({ message: `Frame ${frameNumberInt} processed successfully` });
  });
  
  pythonProcess.on('error', (error) => {
    console.error('Failed to start Python process:', error);
    res.status(500).json({ error: 'Failed to start Python process' });
  });
});

module.exports = router;