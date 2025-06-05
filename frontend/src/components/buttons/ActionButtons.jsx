import React, { useState } from 'react';
import JsonStorageService from '../../services/JsonStorageService';
import ModelService from '../../services/ModelService';
import blobMapper from '../../utils/BlobMapper';

const ActionButtons = ({ 
  joinPolygon, 
  onExportPolygons, 
  currentFrame, 
  isFirstFrame, 
  selectedFile, 
  onUpdatePolygons, 
  onForceSave,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Get the actual filename and frame number using our BlobMapper
  const getActualFileName = (blobUrl) => {
    if (!blobUrl) return null;
    
    // First try BlobMapper
    const mappedFilename = blobMapper.getFilename(blobUrl);
    
    // If found, return it
    if (mappedFilename) {
      return mappedFilename;
    }
    
    // Try to find it in window.fileNames (from ViewPage)
    if (window.fileNames && window.fileNames[blobUrl]) {
      return window.fileNames[blobUrl];
    }
    
    // Fallback to just the default value
    return null;
  };

  // Get frame number from the actual filename
  const getFrameNumber = (blobUrl) => {
    const actualFileName = getActualFileName(blobUrl);
    
    // If we have a filename, extract the frame number from it
    if (actualFileName) {
      const frameMatch = actualFileName.match(/frame_0*(\d+)/);
      const frameNumber = frameMatch ? parseInt(frameMatch[1], 10) : 0;
      console.log(`ActionButtons: Frame number ${frameNumber} from ${actualFileName}`);
      return frameNumber;
    }
    
    // If we don't have a filename, use the currentFrame prop as fallback
    console.log(`ActionButtons: Using provided currentFrame: ${currentFrame}`);
    return currentFrame;
  };

  // Function to handle JSON export
  const handleExportJson = async () => {
    if (!selectedFile) return;
    
    const frameNumber = getFrameNumber(selectedFile);
    console.log(`Exporting JSON for frame: ${frameNumber}`);
    
    try {
      // First save current polygons to ensure they're up to date
      if (onForceSave) {
        await onForceSave();
      }
      
      // Execute the export function
      await onExportPolygons(frameNumber);
    } catch (error) {
      console.error('Error exporting JSON:', error);
    }
  };

  // Add function to handle model execution and reload JSON data afterwards
  const handleRunModel = async () => {
    if (!selectedFile) return;
    
    // Clear any previous error messages
    setErrorMessage(null);
    
    // Get the correct frame number from the actual filename
    const frameNumber = getFrameNumber(selectedFile);
    const actualFileName = getActualFileName(selectedFile);
    
    console.log(`Running model for frame: ${frameNumber}`, { 
      selectedFile, 
      actualFileName,
      extractedNumber: frameNumber 
    });
    
    try {
      setIsProcessing(true);
      
      // First save current polygons to ensure they're up to date
      if (onForceSave) {
        await onForceSave();
      }
      
      // Check server connection first
      const isConnected = await ModelService.testConnection();
      if (!isConnected) {
        throw new Error("Cannot connect to the backend server. Please make sure it's running.");
      }
      
      // Call the model API instead of just exporting JSON
      await ModelService.runSingleFrame(frameNumber);
      
      // After model execution, reload the polygon data from JSON
      console.log(`Model execution completed, reloading polygon data for frame: ${frameNumber}`);
      
      // Allow time for the backend to update the JSON file
      setTimeout(async () => {
        try {
          // Fetch updated JSON data using the actual filename
          const updatedData = await JsonStorageService.fetchPolygonData(actualFileName);
          
          if (updatedData) {
            console.log(`Successfully loaded updated polygon data for ${actualFileName}`);
            const loadedPolygons = JsonStorageService.convertJsonToPolygons(updatedData, selectedFile);
            
            // Update the polygons in the parent component
            if (loadedPolygons && loadedPolygons.length > 0) {
              onUpdatePolygons({
                [selectedFile]: loadedPolygons
              });
              console.log(`Redrawn canvas with ${loadedPolygons.length} updated polygons`);
            }
          }
        } catch (error) {
          console.error('Error reloading polygon data:', error);
        }
      }, 1500); // Wait 1.5 seconds for the backend to process
    } catch (error) {
      console.error('Error running model:', error);
      setErrorMessage(error.message || "Failed to run model. Please check the console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center space-x-4 mt-4 mb-2">
        <button
          onClick={joinPolygon}
          className="bg-[#2E3192] hover:bg-[#1a1c5b] text-white font-semibold py-2 px-4 rounded"
        >
          Complete Polygon
        </button>
        
        {/* Run Model button */}
        <button
          onClick={handleRunModel}
          disabled={isFirstFrame || isProcessing}
          className={`${
            isFirstFrame || isProcessing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#2E3192] hover:bg-[#1a1c5b]"
          } text-white font-semibold py-2 px-4 rounded`}
          title={isFirstFrame ? "Cannot run model on the first frame" : "Run model on this frame"}
        >
          {isProcessing ? "Processing..." : "Run Model"}
        </button>
        
        {/* Export JSON button */}
        <button
          onClick={handleExportJson}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
          title="Export current frame polygons to JSON"
        >
          Export JSON
        </button>
      </div>
      
      {/* Error message display */}
      {errorMessage && (
        <div className="text-red-600 bg-red-100 border border-red-400 rounded-md px-4 py-2 mt-2 max-w-md text-center">
          <p>{errorMessage}</p>
          <p className="text-xs mt-1">Make sure the backend server is running at the correct address.</p>
        </div>
      )}
    </div>
  );
};

export default ActionButtons;
