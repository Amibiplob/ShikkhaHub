import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, MonitorPlay, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const perks = [
  { icon: Upload, title: "Build your course", text: "Create modules, lessons, quizzes and upload resources with a simple editor." },
  { icon: MonitorPlay, title: "Teach live", text: "Run built-in live classes with camera, screen share, chat and recordings." },
  { icon: BarChart3, title: "Track results", text: "See enrollments, progress and student performance in your analytics dashboard." },
];

const TeachSection = () => (
  <section className="border-t border-border bg-muted/30 py-20 md:py-24">
    <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-2">
      <div>
        <span className="mb-3 inline-block text-sm font-medium uppercase tracking-widest text-primary">For teachers</span>
        <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
          Share what you know on <span className="text-gradient-primary">ShikkhaHub</span>
        </h2>
        <p className="mb-8 max-w-md text-muted-foreground">
          Publish courses, host live sessions, grade assignments and grow your own learning community — all from one dashboard.
        </p>
        <Link to="/auth?tab=signup">
          <Button size="lg" className="gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90">
            Start teaching <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {perks.map((p) => (
          <div key={p.title} className="flex gap-4 rounded-2xl border border-border bg-card p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <p.icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="mb-1 font-bold">{p.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TeachSection;
