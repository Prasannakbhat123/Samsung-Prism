const { spawn } = require('child_process');
const path = require('path');

class ModelController {
  constructor() {
    this.scriptsDir = path.join(__dirname, '../scripts');
  }

  runModel(req, res) {
    try {
      const { frameNumber } = req.body;
      
      if (!frameNumber) {
        return res.status(400).json({ error: 'Missing frameNumber parameter' });
      }

      // Convert frameNumber to integer
      const frameNum = parseInt(frameNumber);
      
      if (isNaN(frameNum) || frameNum < 2) {
        return res.status(400).json({ 
          error: 'Invalid frameNumber. Must be an integer greater than 1' 
        });
      }

      console.log('Running model for frame:', frameNum);
      
      // Path to the Python script
      const scriptPath = path.join(this.scriptsDir, 'process_single_frame.py');
      
      // Spawn Python process
      const pythonProcess = spawn('python3', [
        scriptPath,
        frameNum.toString()
      ]);

      let stdoutData = '';
      let stderrData = '';

      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
        console.error(`Model error: ${data.toString()}`);
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Model process exited with code ${code}`);
          return res.status(500).json({ 
            error: 'Model execution failed',
            details: stderrData,
            code: code
          });
        }
        
        try {
          // Parse the JSON output from the Python script
          const result = JSON.parse(stdoutData.trim());
          
          if (!result.success) {
            return res.status(500).json({ 
              error: result.error || 'Model execution failed',
              details: result.message
            });
          }
          
          res.status(200).json({ 
            message: result.message,
            success: true
          });
        } catch (parseError) {
          console.error('Failed to parse Python script output:', parseError);
          res.status(500).json({ 
            error: 'Invalid response from model',
            details: stdoutData
          });
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        res.status(500).json({ 
          error: 'Failed to start model process',
          details: error.message
        });
      });

    } catch (error) {
      console.error('Error running model:', error);
      res.status(500).json({ 
        error: 'Failed to run model',
        details: error.message
      });
    }
  }
}

module.exports = new ModelController(); 