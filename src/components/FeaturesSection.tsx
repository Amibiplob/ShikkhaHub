import { BookOpen, Code2, MessageSquare, MonitorPlay, Trophy, Users } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Structured Courses",
    description: "Learn with organized modules and lessons — videos, articles, and downloadable resources.",
  },
  {
    icon: MonitorPlay,
    title: "Live Classes",
    description: "Join real-time video sessions with screen sharing, whiteboard, and interactive Q&A.",
  },
  {
    icon: Code2,
    title: "W3Schools-Style Docs",
    description: "Read beautifully formatted articles with code blocks, syntax highlighting, and examples.",
  },
  {
    icon: Trophy,
    title: "Assignments & Feedback",
    description: "Submit projects, get teacher reviews with detailed feedback and marks.",
  },
  {
    icon: MessageSquare,
    title: "Lesson Discussions",
    description: "Ask questions under each lesson. Teachers pin important answers for everyone.",
  },
  {
    icon: Users,
    title: "Community Forum",
    description: "Share knowledge, get career advice, and discuss the latest tech with fellow developers.",
  },
];

const FeaturesSection = () => (
  <section className="py-20 md:py-28">
    <div className="container mx-auto px-4">
      <div className="mb-14 text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
          Everything you need to <span className="text-gradient-primary">level up</span>
        </h2>
        <p className="mx-auto max-w-lg text-muted-foreground">
          A complete platform for learning, teaching, and building together.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-glow"
          >
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
