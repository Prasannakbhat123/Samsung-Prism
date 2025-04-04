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
    return Object.keys(items).map((key) => {
      const item = items[key];

      return (
        <div key={key} className="">
          {item.type === "folder" ? (
            <div
              className="flex items-center space-x-2 text-lg text-[#2E3192] font-semibold mt-2 cursor-pointer hover:text-[#1b1c45] transition"
              onClick={() => toggleFolder(item.name)}
            >
              {openFolders[item.name] ? (
                <ChevronDown className="w-4 h-4 text-[#2E3192]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#2E3192]" />
              )}
              {openFolders[item.name] ? (
                <FolderOpen className="w-5 h-5 text-[#2E3192] font-bold" />
              ) : (
                <Folder className="w-5 h-5 text-[#2E3192] font-bold" />
              )}
              <span>{item.name}</span>
            </div>
          ) : (
            <div
              className={`flex items-center space-x-2 cursor-pointer mt-1 p-2 transition ${
                allFiles[currentFileIndex]?.url === item.url 
                  ? "bg-[#2E3192] text-white font-bold rounded-md" 
                  : "text-[#787bff] hover:bg-gray-200 hover:text-[#2E3192] rounded-md"
              }`}
              onClick={() => handleFileSelect(item.url, item.path)}
              style={{ paddingLeft: `${level * 8}px` }} // Indentation for nested files
            >
              <FileText className="w-4 h-4" />
              <span>{item.name}</span>
            </div>
          )}
          {item.type === "folder" && openFolders[item.name] && (
            <div className="ml-6">{renderTree(item.contents, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="w-1/4 bg-[#f0f0f0] text-black p-5 h-full overflow-y-auto shadow-lg border-r-2 border-[#d8d8d8]">
      <h2 className="text-2xl font-bold mb-4 text-center flex items-center justify-center">
        <Folder className="w-6 h-6 mr-2" /> Folder Tree
      </h2>
      
      {/* Navigation buttons */}
      <div className="flex justify-center space-x-4 mb-6">
        <button 
          onClick={handlePrevClick}
          disabled={currentFileIndex <= 0}
          className={`flex items-center px-3 py-1 rounded-md ${
            currentFileIndex <= 0 
              ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
              : "bg-[#2E3192] text-white hover:bg-[#1b1c45]"
          }`}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Previous
        </button>
        <button 
          onClick={handleNextClick}
          disabled={currentFileIndex >= allFiles.length - 1}
          className={`flex items-center px-3 py-1 rounded-md ${
            currentFileIndex >= allFiles.length - 1 || currentFileIndex === -1
              ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
              : "bg-[#2E3192] text-white hover:bg-[#1b1c45]"
          }`}
        >
          Next <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
      
      {renderTree(files)}
    </div>
  );
};

export default FolderTree;