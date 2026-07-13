import Navbar from './Navbar';
import HeroSection from './HeroSection';
import EventsShowcase from './EventsShowcase';
import FeaturesSection from './FeaturesSection';
import StatsSection from './StatsSection';
import PricingSection from './PricingSection';
import Footer from './Footer';

export default function LandingPage() {
    return (
        <div style={{ minHeight: '100vh', background: '#0d0b1e' }}>
            <Navbar />
            <HeroSection />
            <EventsShowcase />
            <FeaturesSection />
            <StatsSection />
            <PricingSection />
            <Footer />
        </div>
    );
}
