import { MarketingNav } from '@/components/landing/marketing-nav';
import { MarketingFooter } from '@/components/landing/marketing-footer';
import { HeroSection } from '@/components/landing/hero-section';
import { SocialProof } from '@/components/landing/social-proof';
import { ProblemSection } from '@/components/landing/problem-section';
import { SolutionSection } from '@/components/landing/solution-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { RagEngineSection } from '@/components/landing/rag-engine-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { FaqSection } from '@/components/landing/faq-section';
import { PoweredBySection } from '@/components/landing/powered-by-section';
import { CtaSection } from '@/components/landing/cta-section';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background">
      <MarketingNav />
      <main>
        {/* Hero - Aurora Background with headline, subheadline, CTAs */}
        <HeroSection />

        {/* Social Proof - Logo slider of trusted companies */}
        <SocialProof />

        {/* Problem Statement - Lamp effect with Wobble cards */}
        <ProblemSection />

        {/* Solution Overview - Bento Grid layout */}
        <SolutionSection />

        {/* Key Features - Detailed feature cards */}
        <FeaturesSection />

        {/* RAG Engine - Technical AI feature showcase */}
        <RagEngineSection />

        {/* How It Works - Timeline/Steps */}
        <HowItWorksSection />

        {/* Testimonials - Customer quotes */}
        <TestimonialsSection />

        {/* Pricing - Three-tier pricing cards */}
        <PricingSection />

        {/* FAQ - Accordion */}
        <FaqSection />

        {/* Powered By - Tech stack logos */}
        <PoweredBySection />

        {/* Final CTA - Spotlight effect */}
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
