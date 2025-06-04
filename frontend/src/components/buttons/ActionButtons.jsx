import React, { useState } from 'react';

const ActionButtons = ({ joinPolygon, onExportPolygons, currentFrame, isFirstFrame }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRunModel = async () => {
    if (isFirstFrame || isProcessing || !currentFrame) return;

    try {
      setIsProcessing(true);
      
      const response = await fetch('http://localhost:3000/api/model/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frameNumber: currentFrame
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run model');
      }

      console.log('Model execution successful:', data);
      
      // You might want to trigger a refresh of the UI here
      // or notify the parent component of the success

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
        disabled={isFirstFrame || isProcessing}
        className={`rounded-full text-white px-8 py-2 transition ${
          isFirstFrame || isProcessing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-[#2E3192] hover:bg-[#1a1c4a]'
        }`}
        title={
          isFirstFrame 
            ? "First frame must be manually annotated"
            : isProcessing 
              ? "Processing..."
              : "Run model on current frame"
        }
      >
        {isProcessing ? "Processing..." : "Run Model"}
      </button>
    </div>
  );
};

export default ActionButtons;
