// src/components/Hero.tsx
export const Hero = () => {
  return (
    <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Convert Any Website to PDF
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Fast, free, and easy-to-use web to PDF converter with redesign options. 
          Convert websites, HTML content, or take screenshots instantly.
        </p>
        <div className="flex flex-wrap justify-center gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">10K+</div>
            <div className="text-gray-600 mt-2">Conversions</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">100%</div>
            <div className="text-gray-600 mt-2">Free</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">Fast</div>
            <div className="text-gray-600 mt-2">Processing</div>
          </div>
        </div>
      </div>
    </section>
  );
};