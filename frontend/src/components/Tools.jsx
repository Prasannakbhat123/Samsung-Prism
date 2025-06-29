import React from "react";
import { PenTool, Eraser, MousePointer, Move, Hand } from "lucide-react"; // Add Hand icon for pan

const Tools = ({ 
  currentTool, 
  setCurrentTool 
}) => {
  const toolsList = [
    { 
      icon: PenTool, 
      name: 'marker',
      tooltip: 'Draw Polygon'
    },
    { 
      icon: MousePointer, 
      name: 'selector',
      tooltip: 'Select and Move Points'
    },
    { 
      icon: Eraser, 
      name: 'eraser',
      tooltip: 'Delete Points'
    },
    { 
      icon: Move, 
      name: 'move',
      tooltip: 'Move Polygon'
    },
    { 
      icon: Hand, 
      name: 'pan',
      tooltip: 'Pan Image (Alt+Click)'
    }
  ];

return (
    <div className="w-20 bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 p-4 h-full shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Tools
        </h2>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mt-2"></div>
      </div>
      
      {/* Tools List */}
      <div className="space-y-4">
        {toolsList.map((tool) => (
          <div key={tool.name} className="group relative">
            <button
              className={`w-full h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                currentTool === tool.name 
                  ? 'bg-gradient-to-br from-gray-600 to-gray-700 text-white shadow-lg scale-105 border border-gray-500' 
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/70 hover:text-white hover:scale-105 border border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setCurrentTool(tool.name)}
            >
              <tool.icon className="w-5 h-5" />
            </button>
            
            {/* Tooltip */}
            <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
              <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl border border-gray-700 whitespace-nowrap">
                {tool.tooltip}
                <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Active Tool Indicator */}
      <div className="mt-8 text-center">
        <div className="w-2 h-2 bg-green-500 rounded-full mx-auto animate-pulse"></div>
        <p className="text-xs text-gray-500 mt-2 capitalize">{currentTool}</p>
      </div>
    </div>
  );
};

export default Tools;