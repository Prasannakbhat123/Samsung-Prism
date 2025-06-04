class FileService {
  static async saveFilesToTemp(files, rootFolderName) {
    // Create FormData to send files
    const formData = new FormData();
    
    // Sort files by name before adding to FormData
    const sortedFiles = Array.from(files).sort((a, b) => 
      a.webkitRelativePath.localeCompare(b.webkitRelativePath)
    );
    
    sortedFiles.forEach(file => {
      formData.append('files', file, file.webkitRelativePath);
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