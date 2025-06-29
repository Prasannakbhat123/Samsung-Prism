import { useState } from "react";

const Faq = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "What is the Image Segmenter Tool?",
      answer:
        "The Image Segmenter Tool is an AI-powered tool that allows you to separate objects from backgrounds in an image using advanced segmentation techniques.",
    },
    {
      question: "How does the tool work?",
      answer:
        "The tool processes an image using deep learning models to identify and segment objects, highlighting or removing specific parts based on user preferences.",
    },
    {
      question: "What file formats are supported?",
      answer:
        "You can upload images in PNG, JPG, and JPEG formats for segmentation.",
    },
    {
      question: "Can I adjust the segmentation accuracy?",
      answer:
        "Yes! The tool provides options to refine the segmentation by adjusting sensitivity, mask transparency, and smoothing effects.",
    },
    {
      question: "Is this tool free to use?",
      answer:
        "Yes, the basic features are free to use. However, advanced segmentation features may require a premium plan.",
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-20">
      {/* Header Section */}
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Everything you need to know about our AI-powered image segmentation tool
        </p>
      </div>

      {/* FAQ Section */}
      <div className="mb-16">
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="backdrop-blur-sm bg-white/5 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all duration-300"
            >
              <button
                className="w-full px-8 py-6 text-left flex justify-between items-center hover:bg-white/5 transition-all duration-300 group"
                onClick={() => toggleFAQ(index)}
              >
                <span className="text-lg font-semibold text-white group-hover:text-gray-200 pr-4">
                  {faq.question}
                </span>
                <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 group-hover:bg-gray-700 transition-all duration-300 ${
                  openIndex === index ? 'rotate-45' : ''
                }`}>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="px-8 pb-6">
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-4"></div>
                  <p className="text-gray-300 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to Use Section */}
      <div className="backdrop-blur-sm bg-white/5 border border-gray-800 rounded-2xl p-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            How to Use the Tool?
          </h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[
              "Upload an image by clicking on the \"Upload\" button.",
              "The tool will process the image and highlight objects.",
              "Use the settings panel to refine the segmentation as needed."
            ].map((step, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-gray-300 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            {[
              "Preview the segmented image before downloading.",
              "Click \"Download\" to save the segmented image."
            ].map((step, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5">
                  {index + 4}
                </div>
                <p className="text-gray-300 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pro Tips */}
        <div className="mt-8 p-6 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700">
          <div className="flex items-center mb-4">
            <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            <h4 className="text-lg font-semibold text-white">Pro Tips</h4>
          </div>
          <ul className="text-gray-300 space-y-2 text-sm">
            <li>• Use high-resolution images for better segmentation results</li>
            <li>• Ensure good contrast between objects and background</li>
            <li>• Try different sensitivity settings for complex images</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Faq;
