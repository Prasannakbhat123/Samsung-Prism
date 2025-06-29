const Footer = () => {
  const socialLinks = [
    {
      name: 'Facebook',
      href: 'https://facebook.com',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
      )
    },
    {
      name: 'Instagram',
      href: 'https://instagram.com',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323C5.902 8.198 7.053 7.708 8.35 7.708s2.448.49 3.323 1.297c.876.876 1.366 2.027 1.366 3.324s-.49 2.448-1.366 3.323c-.875.876-2.026 1.366-3.323 1.366zm7.718 0c-1.297 0-2.448-.49-3.323-1.297-.876-.875-1.366-2.026-1.366-3.323s.49-2.448 1.366-3.323c.875-.876 2.026-1.366 3.323-1.366s2.448.49 3.323 1.366c.876.875 1.366 2.026 1.366 3.323s-.49 2.448-1.366 3.323c-.875.876-2.026 1.366-3.323 1.366z"/>
        </svg>
      )
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )
    }
  ];

  return (
    <footer className="relative mt-20 py-16 backdrop-blur-sm bg-black/80 border-t border-gray-800">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-gray-700/10 to-gray-600/5 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br from-gray-600/10 to-gray-500/5 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Brand Section */}
          <div className="text-center md:text-left">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
              ImageSegmentation
            </h3>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
              A place to remove whatever you want from your pictures in a single click.
            </p>
            
            {/* Features List */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center md:justify-start">
              {['AI-Powered', 'Fast Processing', 'High Quality'].map((feature) => (
                <span 
                  key={feature}
                  className="px-3 py-1 text-xs font-medium bg-gray-800/50 text-gray-300 rounded-full border border-gray-700"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Social & Copyright Section */}
          <div className="text-center md:text-right">
            {/* Social Links */}
            <div className="flex justify-center md:justify-end space-x-2 mb-6">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-12 h-12 bg-gray-800/50 hover:bg-gray-700/70 border border-gray-700 hover:border-gray-600 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 hover:scale-105"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>

            {/* Copyright */}
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} ImageSegmentation. All rights reserved.
            </p>
            
            {/* Additional Links */}
            <div className="mt-4 flex justify-center md:justify-end space-x-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                Contact
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Divider */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div className="mb-4 md:mb-0">
              Made with ❤️ for better image processing
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Service Online</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
