import React, { useState, useEffect } from 'react';
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
  onRitmModeChange, // Add this new prop
  onUpdateMask, // <-- Add this prop for mask image update
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isRitmMode, setIsRitmMode] = useState(false);

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

    useEffect(() => {
    if (onRitmModeChange) {
      onRitmModeChange(isRitmMode);
    }
  }, [isRitmMode, onRitmModeChange]);

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
      // const isConnected = await ModelService.testConnection();
      // if (!isConnected) {
      //   throw new Error("Cannot connect to the backend server. Please make sure it's running.");
      // }
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

  // --- RITM Backend Integration Handlers ---
  const handleFinishObject = async () => {
    try {
      const response = await fetch('http://localhost:5000/finish_object', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        if (onUpdateMask && data.image) {
          onUpdateMask(data.image);
        }
      } else {
        setErrorMessage(data.error || 'Failed to finish object');
      }
    } catch (err) {
      setErrorMessage('Error finishing object');
    }
  };

  const handleUndoClick = async () => {
    try {
      const response = await fetch('http://localhost:5000/undo_click', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        if (onUpdateMask && data.image) {
          onUpdateMask(data.image);
        }
      } else {
        setErrorMessage(data.error || 'Failed to undo click');
      }
    } catch (err) {
      setErrorMessage('Error undoing click');
    }
  };

  const handleResetClicks = async () => {
    try {
      const response = await fetch('http://localhost:5000/reset_clicks', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        if (onUpdateMask && data.image) {
          onUpdateMask(data.image);
        }
      } else {
        setErrorMessage(data.error || 'Failed to reset clicks');
      }
    } catch (err) {
      setErrorMessage('Error resetting clicks');
    }
  };

  const handleToggleRitmMode = async () => {
    if (isRitmMode) {
      // Switching from RITM to Manual, save the RITM JSON
      try {
        await fetch('http://localhost:5000/save_ritm_json', { method: 'POST' });
      } catch (err) {
        setErrorMessage('Failed to save RITM JSON');
      }
    }
    setIsRitmMode(!isRitmMode);
  };

  return (
    <div className="w-full backdrop-blur-sm bg-black/20 border border-gray-700 rounded-2xl p-6 shadow-2xl">
      {/* RITM Mode Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent flex items-center">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Mode Selection
          </h3>
          <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium transition-colors duration-200 ${!isRitmMode ? 'text-white' : 'text-gray-500'}`}>
              Manual
            </span>
            <button
              onClick={handleToggleRitmMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                isRitmMode ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  isRitmMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors duration-200 ${isRitmMode ? 'text-white' : 'text-gray-500'}`}>
              RITM
            </span>
          </div>
        </div>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
      </div>

      {/* Conditional Content Based on Mode */}
      {isRitmMode ? (
        /* RITM Mode Controls */
        <div className="space-y-4">
          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center">
              <svg className="w-4 h-4 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              RITM Controls
            </h4>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleFinishObject}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-500 hover:to-green-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Finish Object</span>
              </button>
              
              <button
                onClick={handleUndoClick}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-xl font-medium hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span>Undo Click</span>
              </button>
              
              <button
                onClick={handleResetClicks}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:from-red-500 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset Click</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Manual Mode Controls */
        <div className="space-y-4">
          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center">
              <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              Manual Controls
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={joinPolygon}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-medium hover:from-gray-500 hover:to-gray-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Complete Polygon</span>
              </button>
              
              <button
                onClick={handleRunModel}
                disabled={isFirstFrame || isProcessing}
                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl ${
                  isFirstFrame || isProcessing
                    ? "bg-gray-800/50 text-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600"
                }`}
                title={isFirstFrame ? "Cannot run model on the first frame" : "Run model on this frame"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{isProcessing ? "Processing..." : "Run Model"}</span>
              </button>
              
              <button
                onClick={handleExportJson}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-500 hover:to-green-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                title="Export current frame polygons to JSON"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error message display */}
      {/* {errorMessage && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-xl">
          <div className="flex items-center space-x-2 text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">{errorMessage}</p>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default ActionButtons;
