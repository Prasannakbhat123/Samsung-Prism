const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class JsonController {
  constructor() {
    // Create json directory if it doesn't exist with explicit permissions
    this.jsonDir = path.join(__dirname, '../../src/json');
    try {
      if (!fs.existsSync(this.jsonDir)) {
        fs.mkdirSync(this.jsonDir, { recursive: true, mode: 0o777 });
        console.log(`Created JSON directory at: ${this.jsonDir}`);
      }
    } catch (error) {
      console.error(`Failed to create JSON directory: ${error.message}`);
    }
    
    // Check permissions
    try {
      const testFile = path.join(this.jsonDir, '.permission-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('JSON directory is writable');
    } catch (error) {
      console.error(`JSON directory is not writable: ${error.message}`);
    }
  }

  // Helper method to create mask after JSON save
  createMask(jsonFileName) {
    // Remove .json extension if it exists
    const baseFileName = jsonFileName.replace(/\.json$/, '');
    const scriptPath = path.join(__dirname, '../scripts/create_masks.py');
    
    console.log('Creating mask for:', baseFileName);
    console.log('Script path:', scriptPath);
    
    // Verify script exists
    if (!fs.existsSync(scriptPath)) {
      console.error('Error: create_masks.py script not found at:', scriptPath);
      return;
    }

    // Verify JSON file exists
    const jsonPath = path.join(this.jsonDir, `${baseFileName}.json`);
    if (!fs.existsSync(jsonPath)) {
      console.error('Error: JSON file not found at:', jsonPath);
      return;
    }

    // Spawn Python process with specific file argument
    console.log('Executing Python script with args:', ['--file', `${baseFileName}.json`]);
    const pythonProcess = spawn('python3', [
      scriptPath,
      '--file',
      `${baseFileName}.json`
    ]);

    pythonProcess.stdout.on('data', (data) => {
      console.log(`Mask creation output: ${data.toString()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Mask creation error: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Mask creation process exited with code ${code}`);
      } else {
        console.log('Mask creation completed successfully');
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
    });
  }

  saveJson(req, res) {
    try {
      const { fileName, jsonData } = req.body;
      
      if (!fileName || !jsonData) {
        return res.status(400).json({ error: 'Missing fileName or jsonData' });
      }

      // Remove .json extension if it exists and add it back
      const baseFileName = fileName.replace(/\.json$/, '');
      const filePath = path.join(this.jsonDir, `${baseFileName}.json`);
      
      console.log('Saving JSON file:', filePath);
      
      // Save the JSON file
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
      console.log('JSON file saved successfully');
      
      // Create mask after saving JSON
      console.log('Triggering mask creation for:', baseFileName);
      this.createMask(baseFileName);

      res.status(200).json({ 
        // message: 'JSON saved successfully',
        fileName: `${baseFileName}.json`
      });
    } catch (error) {
      console.error('Error saving JSON:', error);
      res.status(500).json({ 
        error: 'Failed to save JSON',
        details: error.message
      });
    }
  }

  getAllJson(req, res) {
    try {
      const files = fs.readdirSync(this.jsonDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
      
      res.status(200).json(files);
    } catch (error) {
      console.error('Error getting JSON files:', error);
      res.status(500).json({ 
        error: 'Failed to get JSON files',
        details: error.message
      });
    }
  }

  getJsonByName(req, res) {
    try {
      const { fileName } = req.params;
      // Remove .json extension if it exists and add it back
      const baseFileName = fileName.replace(/\.json$/, '');
      const filePath = path.join(this.jsonDir, `${baseFileName}.json`);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.status(200).json(jsonData);
    } catch (error) {
      console.error('Error reading JSON file:', error);
      res.status(500).json({ 
        error: 'Failed to read JSON file',
        details: error.message
      });
    }
  }
}

module.exports = JsonController;