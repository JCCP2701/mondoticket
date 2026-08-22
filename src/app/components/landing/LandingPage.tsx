import './landing-theme.css';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import TrustedBy from './TrustedBy';
import EventsShowcase from './EventsShowcase';
import FeaturesSection from './FeaturesSection';
import StatsSection from './StatsSection';
import CtaBanner from './CtaBanner';
import PricingSection from './PricingSection';
import Footer from './Footer';

export default function LandingPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--mt-offwhite)' }}>
            <Navbar />
            <HeroSection />
            <TrustedBy />
            <EventsShowcase />
            <FeaturesSection />
            <StatsSection />
            <CtaBanner />
            <PricingSection />
            <Footer />
        </div>
    );
}
