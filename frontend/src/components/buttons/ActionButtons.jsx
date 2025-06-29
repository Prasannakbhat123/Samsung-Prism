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

  // Add polling utility for JSON changes
  const POLL_INTERVAL = 2000; // 2 seconds
  const POLL_TIMEOUT = 30000; // 30 seconds

  async function pollForJsonChanges(onNewOrChangedJson, initialFiles) {
    let previousFiles = initialFiles || [];
    let startTime = Date.now();
    let polling = true;

    const poll = async () => {
      if (!polling) return;
      try {
        const response = await fetch('http://localhost:3000/api/files');
        const files = await response.json();
        // Compare with previous list
        const newOrChanged = files.filter(f => !previousFiles.includes(f));
        if (newOrChanged.length > 0) {
          for (const file of newOrChanged) {
            const jsonData = await JsonStorageService.fetchPolygonData(file + '.jpg'); // or .png if needed
            onNewOrChangedJson(file, jsonData);
          }
          polling = false; // Stop polling after detecting changes
          return;
        }
        previousFiles = files;
      } catch (err) {
        console.error('Polling error:', err);
      }
      if (Date.now() - startTime < POLL_TIMEOUT) {
        setTimeout(poll, POLL_INTERVAL);
      }
    };
    poll();
  }

  // Add function to handle model execution and reload JSON data afterwards
  const handleRunModel = async () => {
    if (!selectedFile) return;
    setErrorMessage(null);
    const frameNumber = getFrameNumber(selectedFile);
    const actualFileName = getActualFileName(selectedFile);
    console.log(`Running model for frame: ${frameNumber}`, { selectedFile, actualFileName, extractedNumber: frameNumber });
    try {
      setIsProcessing(true);
      if (onForceSave) {
        await onForceSave();
      }
      const isConnected = await ModelService.testConnection();
      if (!isConnected) {
        throw new Error("Cannot connect to the backend server. Please make sure it's running.");
      }
      // Get initial list of JSON files before running the model
      let initialFiles = [];
      try {
        const resp = await fetch('http://localhost:3000/api/files');
        initialFiles = await resp.json();
      } catch (e) {
        console.warn('Could not fetch initial JSON file list:', e);
      }
      await ModelService.runSingleFrame(frameNumber);
      // Start polling for new/changed JSON files
      pollForJsonChanges(async (file, jsonData) => {
        if (jsonData) {
          console.log('New or changed JSON:', file, jsonData);
          const loadedPolygons = JsonStorageService.convertJsonToPolygons(jsonData, file + '.jpg');
          if (loadedPolygons && loadedPolygons.length > 0) {
            onUpdatePolygons({ [file + '.jpg']: loadedPolygons });
            console.log(`Updated polygons for ${file}.jpg`);
          }
        }
      }, initialFiles);
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
