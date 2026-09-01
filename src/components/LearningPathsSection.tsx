import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const paths = [
  {
    title: "Frontend Developer",
    level: "Beginner → Job ready",
    items: ["HTML, CSS & responsive layouts", "JavaScript fundamentals", "React & state management", "Portfolio project"],
    query: "Web Development",
  },
  {
    title: "Backend Developer",
    level: "Intermediate",
    items: ["APIs & REST design", "Databases and SQL", "Auth & security basics", "Deployment workflow"],
    query: "Backend",
  },
  {
    title: "Data & AI",
    level: "Intermediate → Advanced",
    items: ["Python for data", "Data analysis & visualization", "Machine learning basics", "Capstone project"],
    query: "Data Science",
  },
];

const LearningPathsSection = () => (
  <section className="border-t border-border py-20 md:py-24">
    <div className="container mx-auto px-4">
      <div className="mb-12 text-center">
        <span className="mb-3 inline-block text-sm font-medium uppercase tracking-widest text-primary">Learning paths</span>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Follow a guided roadmap</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Not sure where to begin? These paths sequence courses so each step builds on the last.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {paths.map((p) => (
          <div key={p.title} className="flex flex-col rounded-2xl border border-border bg-card p-7 transition-all hover:border-primary/30 hover:shadow-glow">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{p.level}</p>
            <h3 className="mb-5 mt-2 text-xl font-bold">{p.title}</h3>
            <ul className="mb-7 space-y-3">
              {p.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to={`/courses?category=${encodeURIComponent(p.query)}`} className="mt-auto">
              <Button variant="outline" className="w-full gap-2">
                Explore path <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default LearningPathsSection;
