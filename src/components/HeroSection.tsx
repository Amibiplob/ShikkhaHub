import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code2, Play, Sparkles, Users, Zap } from "lucide-react";

const HeroSection = () => (
  <section className="relative overflow-hidden py-10">
    {/* Animated grid background */}
    <div className="absolute inset-0 opacity-[0.03]" style={{
      backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
                         linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
      backgroundSize: "60px 60px",
    }} />
    
    {/* Floating orbs */}
    <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
    <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />

    <div className="container relative mx-auto px-4">
      <div className="mx-auto max-w-4xl text-center">
    

        <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-7xl lg:text-8xl">
          Learn to code
          <br className="hidden sm:block" />
          with <span className="text-gradient-primary">experts</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed">
          Interactive courses, live classes, hands-on projects, and a vibrant community
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link to="/auth?tab=signup">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2 px-8 h-12 text-base">
              Start Learning Free <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/courses">
            <Button size="lg" variant="outline" className="gap-2 border-border/50 bg-card/5 backdrop-blur-sm h-12 text-base">
              <Play className="h-5 w-5" /> Browse Courses
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          {[
            { icon: Code2, label: "Courses", value: "50+" },
            { icon: Users, label: "Students", value: "2,000+" },
            { icon: Zap, label: "Live Classes", value: "100+" },
          ].map((stat) => (
            <div key={stat.label} className="relative text-center group">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-glow">
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold text-foreground md:text-4xl">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
