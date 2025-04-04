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
    <div className="w-screen mx-auto p-6 pt-10 mt-40 rounded-lg  relative overflow-hidden flex flex-col justify-center">
      <h2 className="text-2xl font-bold text-center mb-6 text-blue-900">
        Frequently Asked Questions
      </h2>

      {/* FAQ List */}
      <div className="flex justify-center">
        <div className="space-y-4 w-[80vw]">
          {faqs.map((faq, index) => (
            <div key={index} className="border rounded-lg p-4">
              <button
                className="w-full text-center text-blue-950 font-semibold flex justify-between bg-transparent items-center"
                onClick={() => toggleFAQ(index)}
              >
                {faq.question}
                <span className="text-xl">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>
              {openIndex === index && (
                <p className="mt-2 text-gray-700">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* How to Use Section */}
      <div className="mt-8 mb-10 w-[80vw] p-4 rounded-lg ">
        <h3 className="text-2xl text-blue-950 font-bold mb-3">
          How to Use the Tool?
        </h3>
        <ol className="list-decimal pl-5 space-y-2 text-gray-700">
          <li>Upload an image by clicking on the &quot;Upload&quot; button.</li>
          <li>The tool will process the image and highlight objects.</li>
          <li>Use the settings panel to refine the segmentation as needed.</li>
          <li>Preview the segmented image before downloading.</li>
          <li>Click &quot;Download&quot; to save the segmented image.</li>
        </ol>
      </div>
    </div>
  );
};

export default Faq;
