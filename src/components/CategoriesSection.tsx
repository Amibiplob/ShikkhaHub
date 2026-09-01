import { Link } from "react-router-dom";
import { Braces, Brain, Database, Globe, Palette, Server, Smartphone, TerminalSquare } from "lucide-react";

const categories = [
  { icon: Globe, label: "Web Development", slug: "Web Development" },
  { icon: Braces, label: "Programming", slug: "Programming" },
  { icon: Smartphone, label: "Mobile Apps", slug: "Mobile" },
  { icon: Database, label: "Data Science", slug: "Data Science" },
  { icon: Brain, label: "AI & Machine Learning", slug: "AI" },
  { icon: Server, label: "DevOps & Cloud", slug: "DevOps" },
  { icon: Palette, label: "UI/UX Design", slug: "Design" },
  { icon: TerminalSquare, label: "Computer Science", slug: "Computer Science" },
];

const CategoriesSection = () => (
  <section className="border-t border-border py-20 md:py-24">
    <div className="container mx-auto px-4">
      <div className="mb-12 text-center">
        <span className="mb-3 inline-block text-sm font-medium uppercase tracking-widest text-primary">Browse</span>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Explore by category</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Pick a track and start with the fundamentals or jump straight to advanced topics.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {categories.map((c) => (
          <Link
            key={c.label}
            to={`/courses?category=${encodeURIComponent(c.slug)}`}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <c.icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">{c.label}</span>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default CategoriesSection;
