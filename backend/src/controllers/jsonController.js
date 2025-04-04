const fs = require('fs');
const path = require('path');

class JsonController {
  constructor() {
    // Create json directory if it doesn't exist
    this.jsonDir = path.join(__dirname, '../../src/json');
    if (!fs.existsSync(this.jsonDir)) {
      fs.mkdirSync(this.jsonDir, { recursive: true });
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

      // Write the file
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
      
      console.log(`Successfully saved JSON to ${filePath}`);
      
      return res.status(200).json({ 
        message: 'JSON data saved successfully.', 
        filePath: filePath,
        fileName: jsonFileName
      });
    } catch (error) {
      console.error('Error saving JSON data:', error);
      return res.status(500).json({ error: 'Failed to save JSON data.' });
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
}

module.exports = JsonController;