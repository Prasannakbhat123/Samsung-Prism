const fs = require('fs');
const path = require('path');

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

  async saveJson(req, res) {
    const { fileName, jsonData } = req.body;

    if (!fileName || !jsonData) {
      return res.status(400).json({ error: 'File name and JSON data are required.' });
    }

    try {
      // Ensure the file name is properly formatted
      const jsonFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
      const filePath = path.join(this.jsonDir, jsonFileName);

      // Write the file with detailed logging
      console.log(`Saving JSON file to: ${filePath}`);
      console.log(`JSON data: ${JSON.stringify(jsonData).substring(0, 100)}...`);
      
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
      
      console.log(`✅ Successfully saved JSON to ${filePath}`);
      
      return res.status(200).json({ 
        message: 'JSON data saved successfully.', 
        filePath: filePath,
        fileName: jsonFileName
      });
    } catch (error) {
      console.error('❌ Error saving JSON data:', error);
      return res.status(500).json({ 
        error: 'Failed to save JSON data.', 
        details: error.message,
        stack: error.stack
      });
    }
  }
  
  async getAllJson(req, res) {
    try {
      const files = fs.readdirSync(this.jsonDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.jsonDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            lastModified: stats.mtime
          };
        });
        
      return res.status(200).json({ files });
    } catch (error) {
      console.error('Error getting JSON files:', error);
      return res.status(500).json({ error: 'Failed to get JSON files.' });
    }
  }

  async getJsonByName(req, res) {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({ error: 'File name is required.' });
    }
    
    try {
      // Ensure the file name is properly formatted
      const jsonFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
      const filePath = path.join(this.jsonDir, jsonFileName);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'JSON file not found.' });
      }
      
      // Read the JSON file
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      console.log(`Successfully read JSON from ${filePath}`);
      
      return res.status(200).json({ 
        message: 'JSON data retrieved successfully.', 
        fileName: jsonFileName,
        data: jsonData
      });
    } catch (error) {
      console.error('Error retrieving JSON data:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve JSON data.', 
        details: error.message 
      });
    }
  }
}

module.exports = JsonController;