import React, { useState, useEffect } from 'react';
import JsonStorageService from '../../services/JsonStorageService';

const ActionButtons = ({ joinPolygon, onExportPolygons, currentFrame, isFirstFrame, selectedFile, onUpdatePolygons }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  
  // Add effect to debug why button might be disabled
  useEffect(() => {
    const disabled = isFirstFrame || isProcessing || !currentFrame;
    console.log("Run Model button state:", {
      isFirstFrame,
      isProcessing,
      currentFrame,
      disabled
    });
    setButtonDisabled(disabled);
  }, [isFirstFrame, isProcessing, currentFrame]);

  const handleRunModel = async () => {
    if (buttonDisabled) {
      console.log("Button is disabled, cannot run model");
      return;
    }

    try {
      // Log the frame we're actually processing
      console.log(`Running model for frame number: ${currentFrame} (File: ${selectedFile?.split('/').pop() || 'unknown'})`);
      setIsProcessing(true);
      
      // Call backend to run model for current frame
      const response = await fetch('http://localhost:3000/api/model/run-single-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameNumber: parseInt(currentFrame, 10) })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Model response:', data);
      
      if (!data.success) {
        throw new Error(data.error || data.message || 'Model processing failed');
      }
      
      // Refetch the JSON for the current image
      const fileName = selectedFile ? selectedFile.split('/').pop() : null;
      if (fileName) {
        console.log(`Fetching updated polygon data for file: ${fileName}`);
        const jsonData = await JsonStorageService.fetchPolygonData(fileName);
        if (jsonData) {
          const newPolygons = JsonStorageService.convertJsonToPolygons(jsonData, selectedFile);
          if (typeof onUpdatePolygons === 'function') {
            onUpdatePolygons({ [selectedFile]: newPolygons });
          }
        }
      }
      alert('Model run successful and polygons updated!');
    } catch (error) {
      console.error('Error running model:', error);
      alert(`Failed to run model: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mt-4 flex space-x-4">
      <button
        onClick={joinPolygon}
        className="bg-[#2E3192] rounded-full text-white px-8 py-2 hover:bg-[#1a1c4a] transition"
      >
        Join
      </button>
      <button
        // Explicitly use showUI=true when clicking the View JSON button
        onClick={() => onExportPolygons(true)}
        className="bg-[#2E3192] rounded-full text-white px-8 py-2 hover:bg-[#1a1c4a] transition"
      >
        View JSON
      </button>
      <button
        onClick={handleRunModel}
        disabled={buttonDisabled}
        className={`rounded-full text-white px-8 py-2 transition ${
          buttonDisabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-[#2E3192] hover:bg-[#1a1c4a]'
        }`}
        title={
          isFirstFrame 
            ? "First frame must be manually annotated"
            : isProcessing 
              ? "Processing..."
              : !currentFrame
                ? "No frame selected"
                : "Run model on current frame"
        }
      >
        {isProcessing ? "Processing..." : "Run Model"}
      </button>
      <div className="text-xs text-gray-600 mt-2">
        {currentFrame !== null && `Current frame: ${currentFrame}`}
      </div>
    </div>
  );
};

export default ActionButtons;