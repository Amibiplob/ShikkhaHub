import { Link } from "react-router-dom";
import { Braces, Brain, Database, Globe, Palette, Server, Smartphone, TerminalSquare } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const categories = [
  { icon: Globe, key: "cat.web", slug: "Web Development" },
  { icon: Braces, key: "cat.programming", slug: "Programming" },
  { icon: Smartphone, key: "cat.mobile", slug: "Mobile" },
  { icon: Database, key: "cat.data", slug: "Data Science" },
  { icon: Brain, key: "cat.ai", slug: "AI" },
  { icon: Server, key: "cat.devops", slug: "DevOps" },
  { icon: Palette, key: "cat.design", slug: "Design" },
  { icon: TerminalSquare, key: "cat.cs", slug: "Computer Science" },
];

const CategoriesSection = () => {
  const { t } = useLanguage();

  return (
    <section className="border-t border-border py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 max-w-2xl">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            {t("categories.eyebrow")}
          </span>
          <h2 className="font-heading text-3xl font-bold md:text-4xl">{t("categories.title")}</h2>
          <p className="mt-3 max-w-lg text-muted-foreground">{t("categories.subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.key}
              to={`/courses?category=${encodeURIComponent(c.slug)}`}
              className="group flex min-h-36 flex-col items-start justify-between gap-4 rounded-lg border border-border bg-card p-6 text-left shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-secondary/50 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <c.icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold">{t(c.key)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
