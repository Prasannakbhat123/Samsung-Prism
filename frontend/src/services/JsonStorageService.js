/**
 * Service to handle JSON storage for polygon data
 * Saves actual JSON files to the json folder in src
 */
class JsonStorageService {
  constructor() {
    this.jsonStorage = {};
    this.jsonFolderPath = 'src/json/';
    this.apiEndpoint = 'http://localhost:3000/api/save-json';
    
    // Attempt to load from localStorage for persistence between sessions
    try {
      const savedData = localStorage.getItem('polygonJsonData');
      if (savedData) {
        this.jsonStorage = JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error loading polygon data from storage:', error);
    }
    
    // Check if running in Node.js environment (Electron or SSR)
    this.isNode = typeof window === 'undefined' || 
      (typeof process !== 'undefined' && process.versions && process.versions.node);
    
    // Import fs dynamically if in Node environment
    if (this.isNode) {
      try {
        this.fs = require('fs');
        this.path = require('path');
      } catch (e) {
        console.warn('File system modules not available');
      }
    }
  }
  
  /**
   * Save polygon data for a specific image
   * Actually creates or updates a JSON file in the src/json folder
   */
  savePolygonData(fileName, fileUrl, polygons) {
    if (!fileName || !fileUrl || !polygons) return null;
    
    // Remove file extension for cleaner filenames
    const baseFileName = fileName.split('.')[0];
    const jsonFileName = `${baseFileName}.json`;
    const fullPath = `${this.jsonFolderPath}${jsonFileName}`;
    
    // Format the data according to the specified structure
    const formattedData = this.formatPolygonData(fileName, polygons);
    
    // Store the data with the base filename
    this.jsonStorage[baseFileName] = {
      fileUrl,
      data: formattedData,
      lastUpdated: new Date().toISOString(),
      jsonFilePath: fullPath,
      jsonFileName: jsonFileName
    };
    
    // Save to localStorage for persistence
    this._saveToLocalStorage();
    
    // Actually write the file using the appropriate method
    this._writeJsonToFile(fullPath, formattedData, jsonFileName);
    
    return {
      ...formattedData,
      jsonFilePath: fullPath,
      jsonFileName: jsonFileName
    };
  }
  
  /**
   * Get polygon data for a specific file
   * @param {string} fileName - Name of the image file
   * @returns {Object|null} - Polygon data for the specified file or null
   */
  getPolygonData(fileName) {
    if (!fileName) return null;
    
    // Remove file extension if present
    const baseFileName = fileName.split('.')[0];
    return this.jsonStorage[baseFileName]?.data || null;
  }
  
  /**
   * Get all stored polygon data
   * @returns {Object} - All stored polygon data
   */
  getAllPolygonData() {
    return this.jsonStorage;
  }
  
  /**
   * Format polygon data according to the specified structure
   * @param {string} fileName - Name of the image file
   * @param {Array} polygons - Array of polygon objects
   * @returns {Object} - Formatted polygon data
   */
  formatPolygonData(fileName, polygons) {
    // Group polygons by their class/group name
    const groupedByClass = {};
    
    polygons.forEach(polygon => {
      if (!groupedByClass[polygon.group]) {
        groupedByClass[polygon.group] = {};
      }
      
      if (!groupedByClass[polygon.group][polygon.name]) {
        groupedByClass[polygon.group][polygon.name] = [];
      }
      
      groupedByClass[polygon.group][polygon.name].push(polygon.points);
    });
    
    // Format the data according to the specified structure
    const formattedData = {
      imageName: fileName,
      classes: Object.keys(groupedByClass).map(className => ({
        className,
        instances: Object.keys(groupedByClass[className]).flatMap(instanceName =>
          groupedByClass[className][instanceName].map((points, index) => ({
            instanceId: `${instanceName}-${index + 1}`,
            name: instanceName,
            coordinates: points.map(point => [Math.round(point.x), Math.round(point.y)])
          }))
        )
      }))
    };
    
    return formattedData;
  }
  
  /**
   * Convert polygon data to a text representation
   * @param {Object} data - Formatted polygon data
   * @returns {string} - Text representation of polygon data
   */
  convertToText(data) {
    if (!data) return '';
    
    let output = `Image name: ${data.imageName}\n\n`;
    
    data.classes.forEach(classInfo => {
      output += `Class name: ${classInfo.className}\n`;
      
      classInfo.instances.forEach(instance => {
        output += `- instance ${instance.instanceId.split('-')[1]} (${instance.name})\n`;
        output += "      Point coordinates:\n";
        
        instance.coordinates.forEach(point => {
          output += `      [${point[0]}, ${point[1]}]\n`;
        });
        
        output += "\n";
      });
      
      output += "\n";
    });
    
    return output;
  }
  
  /**
   * Actually writes JSON data to a file
   * Uses different methods depending on environment
   */
  _writeJsonToFile(filePath, content, fileName) {
    const jsonString = JSON.stringify(content, null, 2);
    
    // First try to use API endpoint if in browser
    if (!this.isNode) {
      // Send to backend API
      fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileName,
          jsonData: content
        })
      })
      .then(response => {
        if (response.ok) {
          console.log(`✅ Successfully saved ${fileName} to JSON folder via API`);
          
          // Show success notification
          this._showNotification(`JSON saved: ${fileName}`, 'success');
          return response.json();
        } else {
          console.error(`Failed to save file ${fileName}`);
          
          // Fallback to localStorage only
          this._showNotification(`Could not save to server. Data saved in browser only.`, 'warning');
          return response.json().then(data => Promise.reject(data));
        }
      })
      .catch(err => {
        console.error('Error saving file:', err);
        
        // Fallback to download method if API fails
        this._offerDownload(fileName, jsonString);
      });
    } else if (this.fs) {
      // If in Node.js environment (Electron app), use the fs module
      try {
        // Ensure the json directory exists
        const dirPath = this.path.dirname(filePath);
        if (!this.fs.existsSync(dirPath)) {
          this.fs.mkdirSync(dirPath, { recursive: true });
        }
        
        // Write the file
        this.fs.writeFileSync(filePath, jsonString);
        console.log(`✅ Successfully saved ${filePath} to JSON folder`);
        return true;
      } catch (err) {
        console.error('Error writing file:', err);
        return false;
      }
    }
  }
  
  /**
   * Offers a file download in browser environments as fallback
   */
  _offerDownload(filename, content) {
    const element = document.createElement('a');
    const blob = new Blob([content], { type: 'application/json' });
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    
    // Add a notification message
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = '#2E3192';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    notification.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span>📁 JSON saved to <b>${filename}</b></span>
        <button id="download-btn" style="padding:5px 10px;background:white;color:#2E3192;border:none;border-radius:3px;cursor:pointer;">
          Save Local Copy
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add event listener to the download button
    document.getElementById('download-btn').addEventListener('click', function() {
      element.click();
      URL.revokeObjectURL(element.href);
    });
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 5000);
    
    console.log(`✅ JSON saved for ${filename}. Download offered as fallback.`);
  }
  
  /**
   * Shows a notification to the user
   */
  _showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotification = document.getElementById('json-storage-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
  
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'json-storage-notification';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    notification.style.transition = 'opacity 0.5s';
    
    // Set color based on type
    if (type === 'success') {
      notification.style.backgroundColor = '#2E3192';
      notification.style.color = 'white';
    } else if (type === 'warning') {
      notification.style.backgroundColor = '#FFA500';
      notification.style.color = 'white';
    } else if (type === 'error') {
      notification.style.backgroundColor = '#FF0000';
      notification.style.color = 'white';
    }
    
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }
  
  /**
   * Save data to localStorage
   * @private
   */
  _saveToLocalStorage() {
    try {
      localStorage.setItem('polygonJsonData', JSON.stringify(this.jsonStorage));
    } catch (error) {
      console.error('Error saving polygon data to storage:', error);
    }
  }
}

export default new JsonStorageService();
