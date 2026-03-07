import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1">
      <HeroSection />
      <FeaturesSection />

      {/* CTA Section */}
      <section className="border-t border-border bg-gradient-hero py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Ready to start your <span className="text-gradient-primary">coding journey</span>?
          </h2>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            Join thousands of developers learning new skills every day.
          </p>
          <Link to="/auth?tab=signup">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2 px-8 shadow-glow">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default Index;
