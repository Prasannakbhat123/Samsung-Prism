const HomeSection = () => {
  return (
    <section id="home" className="min-h-screen flex pt-32 items-center justify-center px-6 lg:px-8">
      <div className="text-center max-w-4xl mx-auto">
        {/* Main Heading */}
        <div className="mb-8">
          <h1 className="text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Welcome to the
            </span>
            <br />
            <span className="bg-gradient-to-r from-gray-100 to-white bg-clip-text text-transparent">
              Image Segmenter
            </span>
            <br />
            <span className="bg-gradient-to-r from-gray-300 via-gray-100 to-white bg-clip-text text-transparent">
              Tool!
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <div className="mb-12">
          <p className="text-xl lg:text-2xl text-gray-400 font-light leading-relaxed max-w-2xl mx-auto">
            Easily upload and manage your images with our advanced AI-powered segmentation technology
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="backdrop-blur-sm bg-white/5 border border-gray-800 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Easy Upload</h3>
            <p className="text-gray-400 text-sm">Drag and drop your images for instant processing</p>
          </div>

          <div className="backdrop-blur-sm bg-white/5 border border-gray-800 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Powered</h3>
            <p className="text-gray-400 text-sm">Advanced algorithms for precise segmentation</p>
          </div>

          <div className="backdrop-blur-sm bg-white/5 border border-gray-800 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Quick Results</h3>
            <p className="text-gray-400 text-sm">Get your segmented images in seconds</p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center">
          <button 
            onClick={() => {
              const section = document.getElementById('try');
              if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="group relative px-8 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white font-semibold rounded-2xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-2xl hover:shadow-gray-900/50 hover:scale-105"
          >
            <span className="relative z-10">Get Started Now</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HomeSection;
