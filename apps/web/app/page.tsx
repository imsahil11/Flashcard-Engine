import { GeminiNavbar } from '../components/landing/GeminiNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { FeatureBentoGrid } from '../components/landing/FeatureBentoGrid';
import { FAQSection } from '../components/landing/FAQSection';
import { Footer } from '../components/landing/Footer';

export default function HomePage() {
  return (
    <div className="gemini-wrapper">
      <GeminiNavbar />
      <main className="flex-1">
        <HeroSection />
        <FeatureBentoGrid />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}
