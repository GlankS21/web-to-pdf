import { Navbar } from '@/components/convert/Navbar';
import { Hero } from '@/components/convert/Hero';
import { Features } from '@/components/convert/Features';
import { Converter } from '@/components/convert/Converter';
import { Notification } from '@/components/convert/Notification';
import { PreviewModal } from '@/components/convert/PreviewModal';

export const ConvertPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Notification />
      <PreviewModal />
      <Hero />
      <Features />
      <Converter />
    </div>
  );
};
export default ConvertPage;