import FeaturedCoursesSection from "@/components/FeaturedCoursesSection";
import ProjectTeamSection from "@/components/ProjectTeamSection";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import CategoriesSection from "@/components/CategoriesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import LearningPathsSection from "@/components/LearningPathsSection";
import TeachSection from "@/components/TeachSection";
import FaqSection from "@/components/FaqSection";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import HomeDiscoverySections from "@/components/HomeDiscoverySections";

const Index = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />

        <HomeDiscoverySections.ContinueLearningSection />

        <FeaturedCoursesSection />

        <CategoriesSection />

        <LearningPathsSection />

        <HomeDiscoverySections.LiveAndCommunitySection />

        <FeaturesSection />

        <HomeDiscoverySections.CredentialsSection />

        <HowItWorksSection />

        <TeachSection />

        <FaqSection />



        {/* CTA Section */}
        <section className="border-t border-border bg-gradient-hero py-14 md:py-20">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
              {t("cta.title1")}{" "}
              <span className="text-gradient-primary">{t("cta.title2")}</span>?
            </h2>
            <p className="mx-auto mb-10 max-w-md text-lg text-muted-foreground">
              {t("cta.subtitle")}
            </p>
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2 px-10 h-12 text-base shadow-glow"><Link to="/auth?tab=signup">
                {t("cta.button")} <ArrowRight className="h-5 w-5" />
              </Link></Button>
          </div>
        </section>
        <ProjectTeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
