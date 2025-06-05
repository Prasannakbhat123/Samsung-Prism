import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import HomeSection from "./components/HomeSection";
import PictureUploader from "./components/PictureUploader";
import Footer from "./components/Footer";
import Faq from "./components/Faq";
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
    <div
      className="w-screen min-h-screen bg-fixed bg-cover bg-center"
      style={{ backgroundImage: `url(${homebg})` }}
    >
      <div className="w-screen min-h-screen overflow-auto">
        {!viewMode ? (
          <>
            <Navbar />
            <HomeSection />
            <section
              id="try"
              className="w-screen h-[65vh] flex items-center flex-col space-y-8 overflow-auto"
            >
              <PictureUploader
                setUploadedFiles={handleSetUploadedFiles}
                setViewMode={handleSetViewMode}
              />
            </section>

            <section
              id="faq"
              className="w-screen h-screen flex items-center justify-center "
            >
              <div className="w-full max-w-5xl h-full flex items-center justify-center">
                <Faq />
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
