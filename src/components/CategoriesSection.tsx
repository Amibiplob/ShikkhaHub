import { Link } from "react-router-dom";
import { Braces, Brain, Database, Globe, Palette, Server, Smartphone, TerminalSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
    <section className="border-t border-border py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block text-sm font-medium uppercase tracking-widest text-primary">
            {t("categories.eyebrow")}
          </span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("categories.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">{t("categories.subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.key}
              to={`/courses?category=${encodeURIComponent(c.slug)}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
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
