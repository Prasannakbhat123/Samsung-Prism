const HomeSection = () => {
  return (
    <section id="home" className="min-h-screen flex pt-32 items-center justify-center px-6 lg:px-8">
      <div className="text-center max-w-4xl mx-auto">
        {/* Main Heading */}
        <div className="mb-8">
          <h1 className="text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Auto Image Segmentation Tool
            </span>
            <br />
            <br />
          </h1>
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
