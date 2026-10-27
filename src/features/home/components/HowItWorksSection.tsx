import { ClipboardCheck, GraduationCap, PlayCircle, UserPlus } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const steps = [
  { icon: UserPlus, key: "s1" },
  { icon: PlayCircle, key: "s2" },
  { icon: ClipboardCheck, key: "s3" },
  { icon: GraduationCap, key: "s4" },
];

const HowItWorksSection = () => {
  const { t } = useLanguage();

  return (
    <section className="border-t border-border bg-muted/30 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <span className="mb-3 inline-block text-sm font-medium uppercase tracking-widest text-primary">
            {t("how.eyebrow")}
          </span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("how.title")}</h2>
        </div>

        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.key} className="relative rounded-lg border border-border bg-card p-7 shadow-xs">
              <span className="absolute right-5 top-5 text-4xl font-extrabold text-primary/10">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="mb-2 text-lg font-bold">{t(`how.${s.key}.title`)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(`how.${s.key}.desc`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorksSection;
