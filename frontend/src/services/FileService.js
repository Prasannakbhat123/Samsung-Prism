class FileService {
  static async saveFilesToTemp(files, rootFolderName) {
    // Create FormData to send files
    const formData = new FormData();
    
    // Sort files by name before adding to FormData
    const sortedFiles = Array.from(files).sort((a, b) => 
      a.webkitRelativePath.localeCompare(b.webkitRelativePath)
    );
    
    // Add files to FormData with proper frame numbering
    sortedFiles.forEach((file, index) => {
      // Create frame filename with 6-digit padding
      const frameFilename = `frame_${String(index).padStart(6, '0')}.jpg`;
      formData.append('files', file, frameFilename);
    });

    try {
      const response = await fetch('http://localhost:3000/api/upload-files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const data = await response.json();
      return data.tempFolder;
    } catch (error) {
      console.error('Error saving files:', error);
      throw error;
    }
  }

  static async createJPEGImagesFolder(folderPath) {
    try {
      const response = await fetch('http://localhost:3000/api/create-annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderPath }),
      });

      if (!response.ok) {
        throw new Error('Failed to create JPEGImages folder');
      }

      const data = await response.json();
      return data.path;
    } catch (error) {
      console.error('Error creating JPEGImages folder:', error);
      throw error;
    }
  }
}

export default FileService; 