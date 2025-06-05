/**
 * Utility for mapping blob URLs to their original filenames
 */
class BlobMapper {
  constructor() {
    this.mapping = {};
    this.loadFromStorage();
  }

  /**
   * Map a blob URL to its original filename
   * @param {string} blobUrl - The blob URL created by URL.createObjectURL
   * @param {string} filename - The original filename
   */
  mapFile(blobUrl, filename) {
    this.mapping[blobUrl] = filename;
    this.saveToStorage();
    console.log(`Mapped blob URL ${blobUrl} to filename ${filename}`);
  }

  /**
   * Map multiple files at once
   * @param {Object} mappings - Object with blob URLs as keys and filenames as values
   */
  mapFiles(mappings) {
    this.mapping = { ...this.mapping, ...mappings };
    this.saveToStorage();
    console.log(`Added ${Object.keys(mappings).length} blob mappings`);
  }

  /**
   * Get the original filename for a blob URL
   * @param {string} blobUrl - The blob URL
   * @returns {string|null} - The original filename or null if not found
   */
  getFilename(blobUrl) {
    const filename = this.mapping[blobUrl];
    if (!filename) {
      console.warn(`No filename mapping found for blob URL: ${blobUrl}`);
      
      // Try to extract filename from any window.uploadedFiles global if available
      if (window.uploadedFiles && Array.isArray(window.uploadedFiles)) {
        const matchedFile = window.uploadedFiles.find(f => f.url === blobUrl);
        if (matchedFile && matchedFile.name) {
          // Add this mapping for future use
          this.mapFile(blobUrl, matchedFile.name);
          return matchedFile.name;
        }
      }
      
      // Try to find the mapping in window.fileNames if available (from ViewPage)
      if (window.fileNames && typeof window.fileNames === 'object') {
        const foundName = window.fileNames[blobUrl];
        if (foundName) {
          this.mapFile(blobUrl, foundName);
          console.log(`Found filename ${foundName} in window.fileNames`);
          return foundName;
        }
      }
      
      return null;
    }
    return filename;
  }

  /**
   * Extract frame number from filename
   * @param {string} blobUrl - The blob URL or filename
   * @returns {number} - The extracted frame number or 0
   */
  getFrameNumber(blobUrl) {
    // First try to get the mapped filename
    let filename = this.getFilename(blobUrl);
    
    // If no mapping exists, DON'T try to extract from the blob URL itself
    if (!filename) {
      console.warn(`No mapping found for URL: ${blobUrl}, using default frame 0`);
      
      // Try to get from window.currentFilenames if available
      if (window.fileNames && blobUrl in window.fileNames) {
        filename = window.fileNames[blobUrl];
        console.log(`Using filename from window.fileNames: ${filename}`);
      } else {
        // Just return 0 if we can't find a proper mapping
        return 0;
      }
    }
    
    // Extract the frame number using regex
    const frameMatch = filename.match(/frame_0*(\d+)/);
    const frameNumber = frameMatch ? parseInt(frameMatch[1], 10) : 0;
    
    console.log(`Frame number ${frameNumber} extracted from ${filename}`);
    return frameNumber;
  }

  /**
   * Save the mapping to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('blobToFileMapping', JSON.stringify(this.mapping));
    } catch (error) {
      console.error('Error saving blob mapping to localStorage:', error);
    }
  }

  /**
   * Load the mapping from localStorage
   */
  loadFromStorage() {
    try {
      const savedMapping = localStorage.getItem('blobToFileMapping');
      if (savedMapping) {
        this.mapping = JSON.parse(savedMapping);
        console.log(`Loaded ${Object.keys(this.mapping).length} blob mappings from storage`);
      }
    } catch (error) {
      console.error('Error loading blob mapping from localStorage:', error);
    }
  }

  /**
   * Clear all mappings
   */
  clearMappings() {
    this.mapping = {};
    localStorage.removeItem('blobToFileMapping');
    console.log('Cleared all blob mappings');
  }
}

// Create a singleton instance
const blobMapper = new BlobMapper();

// Add to window object for easy access from any component
window.blobMapper = blobMapper;
window.blobToFileMapping = blobMapper.mapping;

export default blobMapper;
