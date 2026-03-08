import { Award, BookOpen, Code2, MessageSquare, MonitorPlay, Trophy, Users, Zap } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Structured Courses",
    description: "Learn with organized modules and lessons — videos, articles, and downloadable resources.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: MonitorPlay,
    title: "Live Classes",
    description: "Join real-time video sessions with screen sharing, whiteboard, and interactive Q&A.",
    color: "text-info",
    bg: "bg-info/10",
  },
  {
    icon: Code2,
    title: "Interactive Content",
    description: "Read beautifully formatted articles with code blocks, syntax highlighting, and examples.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: Trophy,
    title: "Assignments & Quizzes",
    description: "Submit projects, take quizzes, get teacher reviews with detailed feedback and marks.",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    icon: Award,
    title: "Badges & Certificates",
    description: "Earn achievement badges and downloadable certificates as you complete courses.",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    icon: Users,
    title: "Community Forum",
    description: "Share knowledge, get career advice, and discuss tech with fellow developers.",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
];

const FeaturesSection = () => (
  <section className="py-24 md:py-32">
    <div className="container mx-auto px-4">
      <div className="mb-16 text-center">
        <span className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-primary">Features</span>
        <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
          Everything you need to{" "}
          <span className="text-gradient-primary">level up</span>
        </h2>
        <p className="mx-auto max-w-lg text-lg text-muted-foreground">
          A complete platform for learning, teaching, and building together.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="group relative rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-glow hover:-translate-y-1"
          >
            <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.bg} ${f.color} transition-all duration-300 group-hover:scale-110`}>
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
