import React, { useState } from "react";

const PictureUploader = ({ setUploadedFiles, setViewMode }) => {
  const [files, setFiles] = useState({});
  const [currentFolder, setCurrentFolder] = useState(files);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);

  const handleFileUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files);
    const newFiles = uploadedFiles.map((file) => ({
      name: file.name,
      type: "file",
      file,
      url: URL.createObjectURL(file),
    }));

    if (breadcrumbs.length === 0) {
      // Adding files to root
      setFiles((prev) => {
        const updatedFiles = {
          ...prev,
          ...Object.fromEntries(newFiles.map((f) => [f.name, f])),
        };
        setCurrentFolder(updatedFiles);
        return updatedFiles;
      });
    } else {
      // Adding files to a subfolder
      setFiles((prev) => {
        const updatedFiles = { ...prev };
        let target = updatedFiles;
        
        // Navigate to the current folder in the overall structure
        for (const folder of breadcrumbs) {
          target = target[folder].contents;
        }
        
        // Add the new files to the current folder
        newFiles.forEach((f) => {
          target[f.name] = f;
        });
        
        // Update the current folder view
        setCurrentFolder(target);
        
        return updatedFiles;
      });
    }
  };

  const handleFolderUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files);
    let folderStructure = { ...files };
    
    // If we're in a subfolder, we need to add the files to that folder
    if (breadcrumbs.length > 0) {
      let target = folderStructure;
      
      // Navigate to the current folder
      for (const folder of breadcrumbs) {
        target = target[folder].contents;
      }
      
      // Process files
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
      // Adding to root (original behavior)
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
    
    // Update current folder view based on breadcrumbs
    let updatedCurrentFolder = folderStructure;
    for (const folder of breadcrumbs) {
      updatedCurrentFolder = updatedCurrentFolder[folder].contents;
    }
    
    setCurrentFolder(updatedCurrentFolder);
  };

  const removeItem = (itemName, isFolder) => {
    const removeItemRecursive = (obj) => {
      const updatedObj = { ...obj };
      
      Object.keys(updatedObj).forEach(key => {
        if (key === itemName) {
          delete updatedObj[key];
        } else if (updatedObj[key].type === 'folder') {
          updatedObj[key].contents = removeItemRecursive(updatedObj[key].contents);
        }
      });
      
      return updatedObj;
    };

    // If we're at root level
    if (breadcrumbs.length === 0) {
      const updatedFiles = { ...files };
      
      // If the item is a file, revoke its URL
      if (files[itemName] && files[itemName].type === 'file' && files[itemName].url) {
        URL.revokeObjectURL(files[itemName].url);
      }
      
      // If the item is a folder, revoke URLs of all files inside
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
      // We're in a subfolder
      const updatedFiles = { ...files };
      let current = updatedFiles;
      
      // Navigate to parent folder of the current folder
      for (let i = 0; i < breadcrumbs.length - 1; i++) {
        current = current[breadcrumbs[i]].contents;
      }
      
      // Last breadcrumb is the current folder
      const parentFolder = current;
      current = current[breadcrumbs[breadcrumbs.length - 1]].contents;
      
      // If the item is a file, revoke its URL
      if (current[itemName] && current[itemName].type === 'file' && current[itemName].url) {
        URL.revokeObjectURL(current[itemName].url);
      }
      
      // If the item is a folder, revoke URLs of all files inside
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

  // Updated to include navigation back to root before submitting
  const handleDoneUploading = () => {
    // If we're in a subfolder, first navigate back to root
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
        className="w-32 h-32 m-2 relative flex flex-col items-center border-2 border-blue-400 rounded-lg p-2 cursor-pointer"
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
          className="absolute top-1 right-1 z-10 bg-transparent border-none cursor-pointer"
        >
          ❌
        </button>

        {item.type === "file" ? (
          <img 
            src={item.url} 
            alt={item.name} 
            className="w-20 h-20 object-cover rounded-md" 
          />
        ) : (
          <div className="w-20 h-20 flex items-center justify-center bg-blue-200 rounded-md">
            📁
          </div>
        )}
        <p className="text-sm font-medium text-blue-700 truncate w-full text-center mt-1">
          {item.name}
        </p>
      </div>
    ));
  };

  return (
    <div className="p-6 rounded-lg shadow-lg w-[70vw] mx-auto overflow-auto">
      <h1 className="text-3xl font-bold text-blue-800 text-center mb-7">
        Image & Folder Uploader
      </h1>
      
      <div className="flex justify-center space-x-4 mb-6">
        <label className="bg-[#2E3192] text-white px-5 py-3 rounded-full cursor-pointer hover:bg-[#262980] transition text-md font-semibold">
          Upload Images
          <input 
            type="file" 
            multiple 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*"
          />
        </label>

        <label className="border-2 border-[#2E3192] text-[#2E3192] px-5 py-3 rounded-full cursor-pointer hover:bg-[#e6e6e6] transition text-md font-semibold">
          Upload Folders
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

      {breadcrumbs.length > 0 && (
        <div className="mb-4 flex items-center">
          <button
            className="text-blue-700 bg-transparent underline font-semibold mr-2"
            onClick={navigateToParentFolder}
          >
            ⬅ Back to Parent
          </button>
          <button
            className="text-blue-700 bg-transparent underline font-semibold"
            onClick={navigateToRoot}
          >
            🏠 Back to Root
          </button>
          <span className="ml-2 text-gray-600">
            Current path: / {breadcrumbs.join(" / ")}
          </span>
        </div>
      )}

      <div className="flex flex-wrap justify-center">
        {renderThumbnails(currentFolder)}
      </div>

      {Object.keys(files).length > 0 && (
        <div className="flex justify-center mt-4">
          <button 
            onClick={handleDoneUploading}
            className="bg-transparent border border-blue-950 text-blue-950 px-6 py-2 rounded-md hover:bg-blue-200"
          >
            {breadcrumbs.length > 0 ? "Done (Return to Root & Submit All Files)" : "Done"}
          </button>
        </div>
      )}
    </div>
  );
};

export default PictureUploader;
