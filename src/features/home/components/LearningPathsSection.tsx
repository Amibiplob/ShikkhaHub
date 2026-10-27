import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

const paths = [
  { key: "p1", query: "Web Development" },
  { key: "p2", query: "Backend" },
  { key: "p3", query: "Data Science" },
];

const LearningPathsSection = () => {
  const { t } = useLanguage();

  return (
    <section id="learning-paths" className="scroll-mt-24 border-t border-border py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 max-w-2xl">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            {t("paths.eyebrow")}
          </span>
          <h2 className="font-heading text-3xl font-bold md:text-4xl">{t("paths.title")}</h2>
          <p className="mt-3 max-w-lg text-muted-foreground">{t("paths.subtitle")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {paths.map((p) => (
            <div key={p.key} className="flex flex-col rounded-lg border border-border border-t-2 border-t-primary bg-card p-7 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary/50 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t(`paths.${p.key}.level`)}</p>
              <h3 className="mb-5 mt-2 text-xl font-bold">{t(`paths.${p.key}.title`)}</h3>
              <ul className="mb-7 space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <li key={n} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {t(`paths.${p.key}.i${n}`)}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full gap-2"><Link to={`/courses?category=${encodeURIComponent(p.query)}`} className="mt-auto">
                  {t("paths.explore")} <ArrowRight className="h-4 w-4" />
                </Link></Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LearningPathsSection;
