import { useState } from 'react';
import IGlogo from '../assets/IGlogo.png';
import homebg from "../assets/homebg.jpg";

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
    <nav className="fixed top-0 left-0 w-full h-16 z-50 flex items-center justify-between p-4 text-black shadow-md"
         style={{ backgroundImage: `url(${homebg})` }}>
      <div className="flex items-center">
        <img src={IGlogo} alt="Logo" className="w-10 h-10 mr-2" />
        <span className="text-xl font-bold">ImageSegmentor</span>
      </div>
      
      {/* Desktop Navigation */}
      <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 space-x-4">
        <button onClick={() => scrollToSection('home')} className="hover:underline bg-transparent focus:outline-none border-none">
          Home
        </button>
        <button onClick={() => scrollToSection('try')} className="hover:underline bg-transparent focus:outline-none border-none">
          Try
        </button>
        <button onClick={() => scrollToSection('faq')} className="hover:underline bg-transparent focus:outline-none border-none">
          FAQ
        </button>
      </div>
      
      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <button 
          onClick={toggleMenu}
          className="p-2 bg-transparent focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-transparent shadow-md py-2 px-4">
          <div className="flex flex-col space-y-3">
            <button onClick={() => scrollToSection('home')} className="text-left py-2 bg-transparent hover:bg-gray-100 focus:outline-none">
              Home
            </button>
            <button onClick={() => scrollToSection('try')} className="text-left py-2 bg-transparent hover:bg-gray-100 focus:outline-none">
              Try
            </button>
            <button onClick={() => scrollToSection('faq')} className="text-left py-2 bg-transparent hover:bg-gray-100 focus:outline-none">
              FAQ
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
