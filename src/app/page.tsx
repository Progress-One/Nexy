import {
  Header,
  Hero,
  HowItWorks,
  Features,
  Testimonials,
  Pricing,
  FinalCTA,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0C0A0F] text-[#F5F0F0]">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Testimonials />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
