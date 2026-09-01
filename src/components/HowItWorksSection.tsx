import { ClipboardCheck, GraduationCap, PlayCircle, UserPlus } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create your account",
    description: "Sign up free and set up your learner profile in under a minute.",
  },
  {
    icon: PlayCircle,
    title: "Enroll & learn",
    description: "Follow structured modules with lessons, articles, and live classes.",
  },
  {
    icon: ClipboardCheck,
    title: "Practice & submit",
    description: "Complete quizzes and assignments, and get feedback from your teacher.",
  },
  {
    icon: GraduationCap,
    title: "Earn your certificate",
    description: "Finish the course to unlock badges and a downloadable certificate.",
  },
];

const HowItWorksSection = () => (
  <section className="border-t border-border bg-muted/30 py-20 md:py-24">
    <div className="container mx-auto px-4">
      <div className="mb-14 text-center">
        <span className="mb-3 inline-block text-sm font-medium uppercase tracking-widest text-primary">How it works</span>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">From zero to certified in four steps</h2>
      </div>

      <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-2xl border border-border bg-card p-7">
            <span className="absolute right-5 top-5 text-4xl font-extrabold text-primary/10">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <s.icon className="h-6 w-6" />
            </span>
            <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default HowItWorksSection;
