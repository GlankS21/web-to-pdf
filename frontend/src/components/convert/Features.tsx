// src/components/Features.tsx
const features = [
  {
    icon: '🌐',
    title: 'URL to PDF',
    description: 'Convert any website to a high-quality PDF document with custom styling',
  },
  {
    icon: '💻',
    title: 'HTML to PDF',
    description: 'Transform your HTML content directly to beautifully formatted PDF',
  },
  {
    icon: '📸',
    title: 'Screenshot',
    description: 'Capture website screenshots in PNG or JPEG format with full page support',
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4">
          Powerful Features
        </h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Choose from multiple conversion options to fit your needs
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-8 rounded-2xl border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};