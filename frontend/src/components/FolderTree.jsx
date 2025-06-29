import React, { useState, useEffect } from "react";
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, ArrowLeft, ArrowRight } from "lucide-react";

const FolderTree = ({ files, onFileSelect }) => {
  const [openFolders, setOpenFolders] = useState({});
  const [allFiles, setAllFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);

  // Extract all files into a flat array for navigation
  useEffect(() => {
    const extractFiles = (items, path = []) => {
      let extractedFiles = [];
      
      Object.keys(items).forEach((key) => {
        const item = items[key];
        const currentPath = [...path, key];
        
        if (item.type === "file") {
          extractedFiles.push({
            name: item.name,
            url: item.url,
            path: currentPath.join('/') // Join the path array into a string
          });
        } else if (item.type === "folder" && item.contents) {
          extractedFiles = [...extractedFiles, ...extractFiles(item.contents, currentPath)];
        }
      });
      
      return extractedFiles;
    };
    
    const filesList = extractFiles(files);
    setAllFiles(filesList);
  }, [files]);

  const toggleFolder = (folderName) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const handleFileSelect = (url, path) => {
    const index = allFiles.findIndex(file => file.url === url);
    setCurrentFileIndex(index);
    onFileSelect(url, path);
  };

  const handlePrevClick = () => {
    if (currentFileIndex > 0) {
      const prevIndex = currentFileIndex - 1;
      setCurrentFileIndex(prevIndex);
      onFileSelect(allFiles[prevIndex].url, allFiles[prevIndex].path);
    }
  };

  const handleNextClick = () => {
    if (currentFileIndex < allFiles.length - 1) {
      const nextIndex = currentFileIndex + 1;
      setCurrentFileIndex(nextIndex);
      onFileSelect(allFiles[nextIndex].url, allFiles[nextIndex].path);
    }
  };

  const renderTree = (items, level = 0) => {
    // Sort items by type (folders first) and then by name
    const sortedKeys = Object.keys(items).sort((a, b) => {
      const itemA = items[a];
      const itemB = items[b];
      
      // If both are the same type, sort by name
      if (itemA.type === itemB.type) {
        return a.localeCompare(b);
      }
      
      // Folders come before files
      return itemA.type === "folder" ? -1 : 1;
    });

    return sortedKeys.map((key) => {
      const item = items[key];

      return (
        <div key={key} className="">
          {item.type === "folder" ? (
            <div
              className="flex items-center space-x-2 text-gray-300 font-semibold mt-2 cursor-pointer hover:text-white transition-colors duration-200 p-2 rounded-lg hover:bg-gray-800/50"
              onClick={() => toggleFolder(item.name)}
            >
              {openFolders[item.name] ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              {openFolders[item.name] ? (
                <FolderOpen className="w-5 h-5 text-yellow-400" />
              ) : (
                <Folder className="w-5 h-5 text-gray-400" />
              )}
              <span className="truncate">{item.name}</span>
            </div>
          ) : (
            <div
              className={`flex items-center space-x-2 cursor-pointer mt-1 p-2 rounded-lg transition-all duration-200 ${
                allFiles[currentFileIndex]?.url === item.url 
                  ? "bg-gradient-to-r from-gray-700 to-gray-600 text-white shadow-lg border border-gray-500" 
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
              }`}
              onClick={() => handleFileSelect(item.url, item.path)}
              style={{ paddingLeft: `${level * 16}px` }} // Indentation for nested files
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">{item.name}</span>
            </div>
          )}
          {item.type === "folder" && openFolders[item.name] && (
            <div className="ml-4 border-l border-gray-700 pl-2">
              {renderTree(item.contents, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="w-80 bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 p-6 h-full overflow-hidden shadow-2xl flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent flex items-center justify-center">
          <Folder className="w-6 h-6 mr-2 text-gray-400" /> 
          File Explorer
        </h2>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mt-3"></div>
      </div>
      
      {/* Navigation Controls */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button 
            onClick={handlePrevClick}
            disabled={currentFileIndex <= 0}
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentFileIndex <= 0 
                ? "bg-gray-800/50 text-gray-600 cursor-not-allowed" 
                : "bg-gradient-to-r from-gray-700 to-gray-600 text-white hover:from-gray-600 hover:to-gray-500 shadow-lg hover:shadow-xl"
            }`}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> 
            <span className="hidden sm:inline">Previous</span>
          </button>
          
          <button 
            onClick={handleNextClick}
            disabled={currentFileIndex >= allFiles.length - 1}
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentFileIndex >= allFiles.length - 1 || currentFileIndex === -1
                ? "bg-gray-800/50 text-gray-600 cursor-not-allowed" 
                : "bg-gradient-to-r from-gray-700 to-gray-600 text-white hover:from-gray-600 hover:to-gray-500 shadow-lg hover:shadow-xl"
            }`}
          >
            <span className="hidden sm:inline">Next</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        
        {/* File Counter */}
        {allFiles.length > 0 && (
          <div className="mt-3 text-center">
            <span className="text-xs text-gray-500">
              {currentFileIndex + 1} of {allFiles.length} files
            </span>
            <div className="w-full bg-gray-800 rounded-full h-1 mt-1">
              <div 
                className="bg-gradient-to-r from-gray-600 to-gray-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${((currentFileIndex + 1) / allFiles.length) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {/* File Tree */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {Object.entries(files).length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600 mb-4">
              <Folder className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-500">No files uploaded yet</p>
            <p className="text-gray-600 text-sm mt-1">Upload some images to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {renderTree(files)}
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderTree;