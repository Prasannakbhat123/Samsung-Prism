import React, { useState } from "react";
import FileService from "../services/FileService";

const PictureUploader = ({ setUploadedFiles, setViewMode }) => {
  const [files, setFiles] = useState({});
  const [currentFolder, setCurrentFolder] = useState(files);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Add drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      // Create a mock event object for handleFileUpload
      const mockEvent = { target: { files: droppedFiles } };
      handleFileUpload(mockEvent);
    }
  };

  // All your existing functions remain the same...
  const handleFileUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files);
    const newFiles = uploadedFiles
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((file) => ({
        name: file.name,
        type: "file",
        file,
        url: URL.createObjectURL(file),
      }));

    if (breadcrumbs.length === 0) {
      setFiles((prev) => {
        const updatedFiles = {
          ...prev,
          ...Object.fromEntries(newFiles.map((f) => [f.name, f])),
        };
        setCurrentFolder(updatedFiles);
        return updatedFiles;
      });
    } else {
      setFiles((prev) => {
        const updatedFiles = { ...prev };
        let target = updatedFiles;
        
        for (const folder of breadcrumbs) {
          target = target[folder].contents;
        }
        
        newFiles.forEach((f) => {
          target[f.name] = f;
        });
        
        setCurrentFolder(target);
        
        return updatedFiles;
      });
    }
  };

  const handleFolderUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files)
      .sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));
    
    const rootFolderName = uploadedFiles[0]?.webkitRelativePath.split('/')[0];
    
    let folderStructure = { ...files };
    
    if (breadcrumbs.length > 0) {
      let target = folderStructure;
      
      for (const folder of breadcrumbs) {
        target = target[folder].contents;
      }
      
      uploadedFiles.forEach((file) => {
        const path = file.webkitRelativePath.split("/");
        let current = target;
        
        for (let i = 0; i < path.length; i++) {
          if (i === path.length - 1) {
            current[path[i]] = {
              name: path[i],
              type: "file",
              file,
              url: URL.createObjectURL(file),
            };
          } else {
            if (!current[path[i]]) {
              current[path[i]] = { name: path[i], type: "folder", contents: {} };
            }
            current = current[path[i]].contents;
          }
        }
      });
    } else {
      uploadedFiles.forEach((file) => {
        const path = file.webkitRelativePath.split("/");
        let current = folderStructure;

        for (let i = 0; i < path.length; i++) {
          if (i === path.length - 1) {
            current[path[i]] = {
              name: path[i],
              type: "file",
              file,
              url: URL.createObjectURL(file),
            };
          } else {
            if (!current[path[i]]) {
              current[path[i]] = { name: path[i], type: "folder", contents: {} };
            }
            current = current[path[i]].contents;
          }
        }
      });
    }

    setFiles(folderStructure);
    
    let updatedCurrentFolder = folderStructure;
    for (const folder of breadcrumbs) {
      updatedCurrentFolder = updatedCurrentFolder[folder].contents;
    }
    
    setCurrentFolder(updatedCurrentFolder);

    try {
      const tempFolderPath = await FileService.saveFilesToTemp(uploadedFiles, rootFolderName);
      await FileService.createJPEGImagesFolder(tempFolderPath);
      console.log('✅ Created JPEGImages folder successfully');
    } catch (error) {
      console.error('❌ Error creating JPEGImages folder:', error);
    }
  };

  const removeItem = (itemName, isFolder) => {
    if (breadcrumbs.length === 0) {
      const updatedFiles = { ...files };
      
      if (files[itemName] && files[itemName].type === 'file' && files[itemName].url) {
        URL.revokeObjectURL(files[itemName].url);
      }
      
      if (files[itemName] && files[itemName].type === 'folder') {
        const revokeUrls = (obj) => {
          Object.values(obj).forEach(item => {
            if (item.type === 'file' && item.url) {
              URL.revokeObjectURL(item.url);
            }
            if (item.type === 'folder' && item.contents) {
              revokeUrls(item.contents);
            }
          });
        };
        
        revokeUrls(files[itemName].contents);
      }
      
      delete updatedFiles[itemName];
      setFiles(updatedFiles);
      setCurrentFolder(updatedFiles);
    } else {
      const updatedFiles = { ...files };
      let current = updatedFiles;
      
      for (let i = 0; i < breadcrumbs.length - 1; i++) {
        current = current[breadcrumbs[i]].contents;
      }
      
      const parentFolder = current;
      current = current[breadcrumbs[breadcrumbs.length - 1]].contents;
      
      if (current[itemName] && current[itemName].type === 'file' && current[itemName].url) {
        URL.revokeObjectURL(current[itemName].url);
      }
      
      if (current[itemName] && current[itemName].type === 'folder') {
        const revokeUrls = (obj) => {
          Object.values(obj).forEach(item => {
            if (item.type === 'file' && item.url) {
              URL.revokeObjectURL(item.url);
            }
            if (item.type === 'folder' && item.contents) {
              revokeUrls(item.contents);
            }
          });
        };
        
        revokeUrls(current[itemName].contents);
      }
      
      delete current[itemName];
      setFiles(updatedFiles);
      setCurrentFolder(current);
    }
  };

  const navigateToParentFolder = () => {
    if (breadcrumbs.length > 0) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      
      let parentFolder = files;
      for (const folder of newBreadcrumbs) {
        parentFolder = parentFolder[folder].contents;
      }
      
      setCurrentFolder(parentFolder);
      setBreadcrumbs(newBreadcrumbs);
    }
  };

  const navigateToRoot = () => {
    setCurrentFolder(files);
    setBreadcrumbs([]);
  };

  const handleDoneUploading = () => {
    if (breadcrumbs.length > 0) {
      navigateToRoot();
    }
    
    console.log("Done uploading with files:", files);
    setUploadedFiles(files);
    setViewMode(true);
  };

  const renderThumbnails = (items) => {
    return Object.values(items).map((item, index) => (
      <div
        key={index}
        className="group relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-4 hover:border-gray-600 hover:shadow-xl transition-all duration-300 cursor-pointer"
        onClick={() => {
          if (item.type === "folder") {
            setCurrentFolder(item.contents);
            setBreadcrumbs((prev) => [...prev, item.name]);
          }
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeItem(item.name, item.type === "folder");
          }}
          className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors duration-200"
        >
          ×
        </button>
        
        <div className="flex flex-col items-center space-y-3">
          {item.type === "file" ? (
            <div className="relative overflow-hidden rounded-lg">
              <img 
                src={item.url} 
                alt={item.name} 
                className="w-24 h-24 object-cover group-hover:scale-105 transition-transform duration-300" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          ) : (
            <div className="w-24 h-24 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg group-hover:from-gray-600 group-hover:to-gray-700 transition-all duration-300">
              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
              </svg>
            </div>
          )}
          <p className="text-sm font-medium text-gray-300 truncate w-full text-center max-w-[120px]">
            {item.name}
          </p>
        </div>
      </div>
    ));
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-4">
          Upload Your Images
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Drag and drop your files or folders, or click to browse and upload
        </p>
      </div>

      {/* Upload Area */}
      <div 
        className={`relative mb-8 border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ${
          isDragOver 
            ? 'border-gray-400 bg-gray-800/50' 
            : 'border-gray-600 bg-gray-900/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <label className="group relative px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl cursor-pointer hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl">
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Upload Images</span>
              </span>
              <input 
                type="file" 
                multiple 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*"
              />
            </label>

            <label className="group relative px-8 py-4 border-2 border-gray-600 text-gray-300 rounded-xl cursor-pointer hover:border-gray-500 hover:bg-gray-800/50 transition-all duration-300 font-semibold">
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2m-6 4h4" />
                </svg>
                <span>Upload Folders</span>
              </span>
              <input 
                type="file" 
                directory="true"
                webkitdirectory="true"
                multiple 
                onChange={handleFolderUpload} 
                className="hidden" 
              />
            </label>
          </div>
          
          <p className="text-gray-500 text-sm">
            Supports JPG, PNG, GIF and other image formats
          </p>
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="mb-6 flex items-center space-x-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
          <button
            className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200"
            onClick={navigateToParentFolder}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
          
          <button
            className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200"
            onClick={navigateToRoot}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            <span>Root</span>
          </button>
          
          <div className="flex items-center text-gray-400">
            <span className="text-sm">Path: /</span>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="text-sm">
                <span className="mx-1">/</span>
                {crumb}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* File Grid */}
      {Object.keys(currentFolder).length > 0 && (
        <div className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {renderThumbnails(currentFolder)}
          </div>
        </div>
      )}

      {/* Done Button */}
      {Object.keys(files).length > 0 && (
        <div className="flex justify-center">
          <button 
            onClick={handleDoneUploading}
            className="group relative px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
          >
            <span className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>
                {breadcrumbs.length > 0 ? "Done (Return to Root & Submit)" : "Process Images"}
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {Object.keys(currentFolder).length === 0 && Object.keys(files).length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No files uploaded yet</h3>
          <p className="text-gray-500">Start by uploading some images or folders above</p>
        </div>
      )}
    </div>
  );
};

export default PictureUploader;
