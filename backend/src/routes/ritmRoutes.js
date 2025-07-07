const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const router = express.Router();


const pythonPath = path.resolve(__dirname, '../../../ritm_interactive_segmentation/env/bin/python');



// Helper to run a Python script and return JSON
function runPythonRitm(action, payload, callback) {
  console.log(`🔧 RITM: Running action '${action}' with payload:`, payload);
  const scriptPath = path.join(__dirname, '../scripts/ritm_node_entry.py');
  const args = [action, JSON.stringify(payload || {})];
  console.log(`🔧 RITM: Spawning Python process with path: ${pythonPath}`);
  console.log(`🔧 RITM: Script path: ${scriptPath}`);
  console.log(`🔧 RITM: Args:`, args);
  
  const pythonProcess = spawn(pythonPath, [scriptPath, ...args]);
  let output = '';
  let error = '';
  
  pythonProcess.stdout.on('data', (data) => { 
    console.log(`🔧 RITM stdout: ${data.toString()}`);
    output += data.toString(); 
  });
  
  pythonProcess.stderr.on('data', (data) => { 
    console.log(`🔧 RITM stderr: ${data.toString()}`);
    error += data.toString(); 
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`🔧 RITM: Process exited with code ${code}`);
    if (code === 0) {
      try {
        const json = JSON.parse(output);
        console.log(`🔧 RITM: Success - parsed JSON:`, json);
        callback(null, json);
      } catch (e) {
        console.log(`🔧 RITM: JSON parse error:`, e);
        callback({ error: 'Invalid JSON from Python', details: output });
      }
    } else {
      console.log(`🔧 RITM: Process failed with error:`, error);
      callback({ error: error || 'Python process failed', code });
    }
  });
  
  pythonProcess.on('error', (err) => {
    console.log(`🔧 RITM: Process spawn error:`, err);
    callback({ error: 'Failed to spawn Python process', details: err.message });
  });
}

// POST /api/ritm/add_click
router.post('/add_click', (req, res) => {
  runPythonRitm('add_click', req.body, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// POST /api/ritm/finish_object
router.post('/finish_object', (req, res) => {
  runPythonRitm('finish_object', req.body, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// POST /api/ritm/undo_click
router.post('/undo_click', (req, res) => {
  runPythonRitm('undo_click', req.body, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// POST /api/ritm/reset_clicks
router.post('/reset_clicks', (req, res) => {
  runPythonRitm('reset_clicks', req.body, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// POST /api/ritm/load_image_by_name
router.post('/load_image_by_name', (req, res) => {
  runPythonRitm('load_image_by_name', req.body, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// POST /api/ritm/save_ritm_json
router.post('/save_ritm_json', (req, res) => {
  runPythonRitm('save_ritm_json', req.body, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// POST /api/ritm/xmem_single_frame
router.post('/xmem_single_frame', (req, res) => {
  const { frameNumber } = req.body;
  if (typeof frameNumber !== 'number') {
    return res.status(400).json({ error: 'frameNumber is required and must be a number' });
  }
  const scriptPath = path.join(__dirname, '../scripts/process_single_frame.py');
  const pythonProcess = spawn('python3', [scriptPath, frameNumber.toString()]);
  let output = '';
  let error = '';
  pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
  pythonProcess.stderr.on('data', (data) => { error += data.toString(); });
  pythonProcess.on('close', (code) => {
    if (code === 0) {
      try {
        const json = JSON.parse(output);
        res.json(json);
      } catch (e) {
        res.status(500).json({ error: 'Invalid JSON from Python', details: output });
      }
    } else {
      res.status(500).json({ error: error || 'Python process failed', code });
    }
  });
  pythonProcess.on('error', (err) => {
    res.status(500).json({ error: 'Failed to spawn Python process', details: err.message });
  });
});

module.exports = router; 