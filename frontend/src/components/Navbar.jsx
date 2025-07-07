import { useState } from 'react';
import IGlogo from '../assets/IGlogo.png';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    const navbar = document.querySelector('nav');
    const navbarHeight = navbar ? navbar.offsetHeight : 0;

    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section) {
      const sectionPosition = section.offsetTop - navbarHeight;
      window.scrollTo({ top: sectionPosition, behavior: 'smooth' });
    }
    
    // Close mobile menu after clicking
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="fixed top-0 left-0 w-full h-20 z-50 backdrop-blur-md bg-black/80 border-b border-gray-800 shadow-2xl">
      <div className="flex items-center justify-between h-full px-6 lg:px-8">
        {/* Logo Section */}
        <div 
          className="flex items-center cursor-pointer group transition-all duration-300 hover:scale-105" 
          onClick={() => scrollToSection('try')}
        >
          <div className="relative">
            <img 
              src={IGlogo} 
              alt="Logo" 
              className="w-12 h-12 mr-3 rounded-lg shadow-lg group-hover:shadow-xl transition-shadow duration-300" 
            />
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            ImageSegmentor
          </span>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {['home', 'try'].map((item) => (
            <button 
              key={item}
              onClick={() => scrollToSection(item)} 
              className="relative px-4 py-2 text-gray-300 font-medium capitalize transition-all duration-300 hover:text-white group"
            >
              {item}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-white to-gray-400 transition-all duration-300 group-hover:w-full"></span>
            </button>
          ))}
        </div>
        
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button 
            onClick={toggleMenu}
            className="p-3 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className={`md:hidden absolute top-20 left-0 w-full backdrop-blur-md bg-black/90 border-b border-gray-800 shadow-2xl transition-all duration-300 ${
        isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}>
        <div className="px-6 py-4 space-y-2">
          {['home', 'try'].map((item) => (
            <button 
              key={item}
              onClick={() => scrollToSection(item)} 
              className="block w-full text-left px-4 py-3 text-gray-300 font-medium capitalize rounded-lg hover:text-white hover:bg-gray-800/50 transition-all duration-300"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
