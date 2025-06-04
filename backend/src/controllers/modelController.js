const { spawn } = require('child_process');
const path = require('path');

class ModelController {
  async runSingleFrame(req, res) {
    try {
      const { frameNumber } = req.body;
      
      if (!frameNumber && frameNumber !== 0) {
        return res.status(400).json({ error: 'Frame number is required' });
      }
      
      console.log(`Running model on frame: ${frameNumber}`);
      
      // Path to the Python script
      const scriptPath = path.join(__dirname, '..', 'scripts', 'process_single_frame.py');
      
      // Spawn a Python process to run the script
      const pythonProcess = spawn('python3', [scriptPath, frameNumber.toString()]);
      
      let result = '';
      let errorOutput = '';
      
      // Collect data from script output
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
        console.log(`Python stdout: ${data}`);
      });
      
      // Collect error data if any
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`Python stderr: ${data}`);
      });
      
      // Handle process completion
      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        
        if (code !== 0) {
          console.error('Python script execution failed:', errorOutput);
          return res.status(500).json({ 
            error: 'Failed to process frame', 
            details: errorOutput 
          });
        }
        
        try {
          // Parse the JSON output from the Python script
          const jsonResult = JSON.parse(result);
          res.json(jsonResult);
        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError);
          res.status(500).json({ 
            error: 'Failed to parse Python script output',
            details: parseError.message,
            rawOutput: result
          });
        }
      });
    } catch (error) {
      console.error('Error in runSingleFrame:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ModelController();