import React from "react";
import { PenTool, Eraser, MousePointer, Move } from "lucide-react"; // Import Move icon

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
    }
  ];

  return (
    <>
    
    <div className="w-1/10 bg-white text-white p-3 py-6 h-full shadow-2xl">
      <h2 className="text-xl font-bold mb-6 text-blue-900 text-center">Tools</h2>
      <ul className="space-y-4">
        {toolsList.map((tool) => (
          <li 
            key={tool.name}
            className={`flex items-center justify-center space-x-3 p-3 rounded-lg cursor-pointer transition ${
              currentTool === tool.name 
                ? 'bg-[#2E3192] text-center align-middle' 
                : 'bg-transparent border-2 border-[#2E3192] text-[#2E3192] hover:bg-[#f0f0f0a8]'
            }`}
            onClick={() => setCurrentTool(tool.name)}
          >
            <tool.icon className="w-5 h-5" />
          </li>
        ))}
      </ul>
    </div>
    </>
    
  );
};

export default Tools;