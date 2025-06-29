const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class RITMService {
  constructor() {
    this.ritmScriptPath = path.join(__dirname, '../scripts/ritm_backend.py');
    this.currentController = null;
    this.currentImage = null;
    this.currentFilename = null;
  }

  // Load image into RITM backend
  async loadImageByName(filename) {
    console.log('=== RITM SERVICE DEBUG ===');
    console.log('Received filename:', filename);
    console.log('Type of filename:', typeof filename);
    console.log('==========================');
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        this.ritmScriptPath,
        'load_image',
        '--filename', filename
      ]);

      let result = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        console.log('RITM process closed with code:', code);
        console.log('RITM stdout:', result);
        console.log('RITM stderr:', errorOutput);
        
        if (code !== 0) {
          reject(new Error(`RITM load failed: ${errorOutput}`));
          return;
        }

        try {
          const data = JSON.parse(result);
          if (data.success) {
            this.currentFilename = filename;
            resolve(data);
          } else {
            reject(new Error(data.error || 'Failed to load image'));
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse RITM response: ${parseError.message}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start RITM process: ${error.message}`));
      });
    });
  }

  // Add click to RITM
  async addClick(x, y, isPositive = true) {
    if (!this.currentFilename) {
      throw new Error('No image loaded in RITM');
    }

    console.log('=== RITM ADD CLICK DEBUG ===');
    console.log('Current filename:', this.currentFilename);
    console.log('Click coordinates:', { x, y, isPositive });
    console.log('============================');

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        this.ritmScriptPath,
        'add_click',
        '--filename', this.currentFilename,
        '--x', x.toString(),
        '--y', y.toString(),
        '--positive', isPositive.toString()
      ]);

      let result = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        console.log('RITM add_click process closed with code:', code);
        console.log('RITM add_click stdout:', result);
        console.log('RITM add_click stderr:', errorOutput);
        
        if (code !== 0) {
          reject(new Error(`RITM click failed: ${errorOutput}`));
          return;
        }

        try {
          const data = JSON.parse(result);
          if (data.success) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Failed to process click'));
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse RITM response: ${parseError.message}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start RITM process: ${error.message}`));
      });
    });
  }

  // Get model info
  async getModelInfo() {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        this.ritmScriptPath,
        'model_info'
      ]);

      let result = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`RITM model info failed: ${errorOutput}`));
          return;
        }

        try {
          const data = JSON.parse(result);
          resolve(data);
        } catch (parseError) {
          reject(new Error(`Failed to parse RITM response: ${parseError.message}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start RITM process: ${error.message}`));
      });
    });
  }

  // Reset RITM session
  async resetSession() {
    this.currentController = null;
    this.currentImage = null;
    this.currentFilename = null;
  }
}

module.exports = new RITMService(); 