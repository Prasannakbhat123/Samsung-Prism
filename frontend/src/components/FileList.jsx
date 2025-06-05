import React, { useEffect } from 'react';
import blobMapper from '../utils/BlobMapper';

const FileList = ({ files, selectedFile, onFileSelect }) => {
  // Add effect to populate blob mapping when files are loaded
  useEffect(() => {
    if (files && files.length > 0) {
      // Create mapping between blob URLs and original filenames
      const mapping = {};
      
      files.forEach(file => {
        if (file.url && file.name) {
          mapping[file.url] = file.name;
          console.log(`Mapped blob URL ${file.url} to filename ${file.name}`);
        }
      });
      
      // Update the blobMapper with all mappings at once
      if (Object.keys(mapping).length > 0) {
        blobMapper.mapFiles(mapping);
        console.log('Updated blob mapper with', Object.keys(mapping).length, 'files');
      }
    }
  }, [files]);

  return (
    <div>
      <h2>File List</h2>
      <ul>
        {files.map(file => (
          <li 
            key={file.name} 
            onClick={() => onFileSelect(file.url)}
            style={{ 
              cursor: 'pointer', 
              fontWeight: selectedFile === file.url ? 'bold' : 'normal' 
            }}
          >
            {file.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileList;