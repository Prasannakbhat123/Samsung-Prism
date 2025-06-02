import React, { useEffect } from 'react';

const ImageComponent = ({ 
  selectedFile,
  imageRef,
  onImageLoad, 
  onImageError, 
  setImageSize,
  setImageLoadError 
}) => {
  
  useEffect(() => {
    if (!selectedFile || !imageRef.current) return;
    
    const img = imageRef.current;
    
    const handleLoad = () => {
      setImageLoadError(false);
      setImageSize({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
      if (onImageLoad) onImageLoad();
    };
    
    const handleError = (err) => {
      console.error("Failed to load image:", selectedFile, err);
      setImageLoadError(true);
      if (onImageError) onImageError(err);
    };
    
    // Add event listeners
    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    
    // Set source to trigger loading
    img.src = selectedFile;
    
    // Clean up event listeners
    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [selectedFile, imageRef, onImageLoad, onImageError, setImageSize, setImageLoadError]);

  return (
    <img
      ref={imageRef}
      src={selectedFile || ''}
      alt="Preview"
      className="hidden"
    />
  );
};

export default ImageComponent;
