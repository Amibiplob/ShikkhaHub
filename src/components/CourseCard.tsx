import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock } from "lucide-react";
import BookmarkButton from "@/components/BookmarkButton";

interface CourseCardProps {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  difficulty: string | null;
  teacher_name?: string;
  progressPercent?: number;
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-success/10 text-success border-success/20",
  intermediate: "bg-warning/10 text-warning border-warning/20",
  advanced: "bg-destructive/10 text-destructive border-destructive/20",
};

const CourseCard = ({ id, title, description, thumbnail_url, category, difficulty, teacher_name, progressPercent }: CourseCardProps) => (
  <Link to={`/courses/${id}`} className="group block">
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-glow">
      <div className="aspect-video bg-muted relative overflow-hidden">
        {thumbnail_url ? (
          <img src={thumbnail_url} alt={title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-hero">
            <BookOpen className="h-10 w-10 text-primary/40" />
          </div>
        )}
        {difficulty && (
          <Badge variant="outline" className={`absolute right-3 top-3 text-xs ${difficultyColors[difficulty] || ""}`}>
            {difficulty}
          </Badge>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {category && (
              <span className="mb-2 inline-block text-xs font-medium uppercase tracking-wider text-primary">
                {category}
              </span>
            )}
            <h3 className="mb-1.5 text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
              {title}
            </h3>
          </div>
          <BookmarkButton courseId={id} />
        </div>
        {description && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{description}</p>
        )}
        {teacher_name && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>by {teacher_name}</span>
          </div>
        )}
        {progressPercent !== undefined && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-primary">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}
      </div>
    </div>
  </Link>
);

export default CourseCard;
