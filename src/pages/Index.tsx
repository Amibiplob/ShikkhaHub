import TutoringIntro from "@/features/home/components/TutoringIntro";
import FeaturedCoursesSection from "@/features/home/components/FeaturedCoursesSection";
import ProjectTeamSection from "@/features/home/components/ProjectTeamSection";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/features/home/components/HeroSection";
import HowItWorksSection from "@/features/home/components/HowItWorksSection";
import LearningPathsSection from "@/features/home/components/LearningPathsSection";
import TeachSection from "@/features/home/components/TeachSection";
import FaqSection from "@/features/home/components/FaqSection";
import HomeDiscoverySections from "@/features/home/components/HomeDiscoverySections";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <HeroSection />

        <HomeDiscoverySections.ContinueLearningSection />

        <HowItWorksSection />

        <FeaturedCoursesSection />

        <LearningPathsSection />

        <HomeDiscoverySections.LiveAndCommunitySection />

        <HomeDiscoverySections.CredentialsSection />

        <section className="border-t py-10">
          <div className="container mx-auto px-4">
            <TutoringIntro />
          </div>
        </section>
        <TeachSection />

        <FaqSection />

        <ProjectTeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
