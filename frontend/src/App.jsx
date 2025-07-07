import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import HomeSection from "./components/HomeSection";
import PictureUploader from "./components/PictureUploader";
import Footer from "./components/Footer";
import ViewPage from "./components/ViewPage";
import homebg from "./assets/homebg.jpg";
import blobMapper from "./utils/BlobMapper";

const App = () => {
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [viewMode, setViewMode] = useState(false);

  // Add persistence for view mode and uploaded files
  useEffect(() => {
    // Check if there are saved files in localStorage
    const savedFiles = localStorage.getItem("uploadedFiles");
    const savedViewMode = localStorage.getItem("viewMode");

    if (savedFiles) {
      try {
        const parsedFiles = JSON.parse(savedFiles);
        setUploadedFiles(parsedFiles);
        console.log("Restored uploaded files from localStorage");
      } catch (error) {
        console.error("Failed to parse saved files:", error);
      }
    }

    if (savedViewMode === "true") {
      setViewMode(true);
      console.log("Restored view mode from localStorage");
    }
  }, []);

  const handleSetViewMode = (value) => {
    // Ensure we're actually changing the view mode
    console.log("Setting view mode to:", value);
    setViewMode(value);

    // Save view mode to localStorage
    localStorage.setItem("viewMode", value.toString());
  };

  const handleSetUploadedFiles = (files) => {
    // Ensure we're actually setting the files
    console.log("Setting uploaded files:", files);
    setUploadedFiles(files);

    // Save files to localStorage
    localStorage.setItem("uploadedFiles", JSON.stringify(files));
  };

  // Add this function to App component to initialize blobMapper with file context
  const initializeBlobMapper = (files) => {
    if (!files || !Array.isArray(files) || files.length === 0) return;

    const mapping = {};
    files.forEach((file) => {
      if (file.url && file.name) {
        mapping[file.url] = file.name;
      }
    });

    blobMapper.mapFiles(mapping);
    console.log(
      "App: Initialized BlobMapper with",
      Object.keys(mapping).length,
      "files"
    );
  };

  // Call initializeBlobMapper whenever uploadedFiles change
  useEffect(() => {
    initializeBlobMapper(Object.values(uploadedFiles));
  }, [uploadedFiles]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-gray-700/20 to-gray-600/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-gradient-to-br from-gray-600/15 to-gray-500/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-gray-800/25 to-gray-700/10 rounded-full blur-xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-1/3 w-56 h-56 bg-gradient-to-br from-gray-500/10 to-gray-400/5 rounded-full blur-3xl animate-pulse delay-3000"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/5 to-black/20"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {!viewMode ? (
          <>
            <Navbar />
            <HomeSection />
            
            {/* Try Section */}
            <section
              id="try"
              className="min-h-[80vh] flex items-center justify-center py-20 px-6 lg:px-8"
            >
              <div className="w-full max-w-6xl">
                <PictureUploader
                  setUploadedFiles={handleSetUploadedFiles}
                  setViewMode={handleSetViewMode}
                />
              </div>
            </section>


            
            <Footer />
          </>
        ) : (
          <ViewPage
            uploadedFiles={uploadedFiles}
            setViewMode={handleSetViewMode}
          />
        )}
      </div>
    </div>
  );
};

export default App;
