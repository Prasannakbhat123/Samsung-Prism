import axios from 'axios';

// Fix the API URL reference to use port 3000 instead of 5000
const API_URL = (window.API_URL || 'http://localhost:3000/api');

class ModelService {
  /**
   * Runs the model on a single frame
   * @param {number} frameNumber - The frame number to process
   * @returns {Promise} - API response
   */
  async runSingleFrame(frameNumber) {
    try {
      console.log(`Calling API to run model on frame ${frameNumber} at http://localhost:5000/xmem_single_frame`);
      
      // Add timeout to prevent long hanging requests
      const response = await axios.post('http://localhost:5000/xmem_single_frame', {
        frameNumber
      }, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      // More detailed error handling
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        console.error(`Backend server connection failed at http://localhost:5000. Is the server running?`);
        // throw new Error(`Cannot connect to the backend server at ${API_URL}. Please make sure the server is running.`);
      }
      
      console.error('Error running model on single frame:', error);
      throw error;
    }
  }
  
  /**
   * Test the connection to the backend server
   * @returns {Promise<boolean>} - True if connection successful
   */
  async testConnection() {
    try {
      // Try to connect to the root endpoint instead of /health
      await axios.get(`${API_URL.replace(/\/api$/, '')}`, { timeout: 5000 });
      return true;
    } catch (error) {
      console.error('Backend server connection test failed:', error);
      return false;
    }
  }
}

export default new ModelService();
