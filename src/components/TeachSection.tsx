import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, MonitorPlay, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const perks = [
  { icon: Upload, key: "p1" },
  { icon: MonitorPlay, key: "p2" },
  { icon: BarChart3, key: "p3" },
];

const TeachSection = () => {
  const { t } = useLanguage();

  return (
    <section className="border-t border-border bg-muted/30 py-20 md:py-24">
      <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-2">
        <div>
          <span className="mb-3 inline-block text-sm font-medium uppercase tracking-widest text-primary">
            {t("teach.eyebrow")}
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            {t("teach.title")} <span className="text-gradient-primary">ShikkhaHub</span>
          </h2>
          <p className="mb-8 max-w-md text-muted-foreground">{t("teach.subtitle")}</p>
          <Link to="/auth?tab=signup">
            <Button size="lg" className="gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90">
              {t("teach.cta")} <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {perks.map((p) => (
            <div key={p.key} className="flex gap-4 rounded-2xl border border-border bg-card p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <p.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="mb-1 font-bold">{t(`teach.${p.key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(`teach.${p.key}.text`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeachSection;
