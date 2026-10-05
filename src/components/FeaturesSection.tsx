import { Award, BookOpen, Code2, MonitorPlay, Trophy, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const features = [
  { icon: BookOpen, key: "f1", color: "text-primary", bg: "bg-primary/10" },
  { icon: MonitorPlay, key: "f2", color: "text-info", bg: "bg-info/10" },
  { icon: Code2, key: "f3", color: "text-accent", bg: "bg-accent/10" },
  { icon: Trophy, key: "f4", color: "text-warning", bg: "bg-warning/10" },
  { icon: Award, key: "f5", color: "text-success", bg: "bg-success/10" },
  { icon: Users, key: "f6", color: "text-destructive", bg: "bg-destructive/10" },
];

const FeaturesSection = () => {
  const { t } = useLanguage();

  return (
    <section className="border-b border-border py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <span className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-primary">
            {t("features.eyebrow")}
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
            {t("features.title1")}{" "}
            <span className="text-gradient-primary">{t("features.title2")}</span>
          </h2>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">{t("features.subtitle")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.key}
              className="group relative rounded-lg border border-border bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg ${f.bg} ${f.color} transition-all duration-300 group-hover:scale-105`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold">{t(`features.${f.key}.title`)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(`features.${f.key}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
