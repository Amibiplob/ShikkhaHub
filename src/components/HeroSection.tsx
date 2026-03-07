import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code2, Play, Users } from "lucide-react";

const HeroSection = () => (
  <section className="relative overflow-hidden bg-gradient-hero py-24 md:py-32">
    {/* Animated grid background */}
    <div className="absolute inset-0 opacity-[0.03]" style={{
      backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
                         linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
      backgroundSize: "60px 60px",
    }} />

    <div className="container relative mx-auto px-4">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/30 bg-card/10 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
          <Code2 className="h-4 w-4 text-primary" />
          Developer-focused learning platform
        </div>

        <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Learn to code with{" "}
          <span className="text-gradient-primary">expert teachers</span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground md:text-xl">
          Interactive courses, live classes, hands-on projects, and a vibrant community — everything you need to become a better developer.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link to="/auth?tab=signup">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2 px-8">
              Start Learning Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/courses">
            <Button size="lg" variant="outline" className="gap-2 border-border/50 bg-card/5 backdrop-blur-sm">
              <Play className="h-4 w-4" /> Browse Courses
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8">
          {[
            { icon: Code2, label: "Courses", value: "50+" },
            { icon: Users, label: "Students", value: "2,000+" },
            { icon: Play, label: "Video Lessons", value: "500+" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-foreground md:text-3xl">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
