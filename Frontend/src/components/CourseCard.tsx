import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, Settings, User } from "lucide-react";
import BookmarkButton from "@/components/BookmarkButton";
import { useAuth } from "@/contexts/AuthContext";

interface CourseCardProps {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  category?: string | null;
  difficulty?: string | null;
  teacher_name?: string | null;
  progressPercent?: number;
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-success/10 text-success border-success/20",
  intermediate: "bg-warning/10 text-warning border-warning/20",
  advanced: "bg-destructive/10 text-destructive border-destructive/20",
};

const CourseCard = ({ id, title, description, thumbnail_url, category, difficulty, teacher_name, progressPercent }: CourseCardProps) => {
  const { user } = useAuth();
  const isOwner = user?.id !== undefined && teacher_name !== undefined; // We'll use a simpler approach

  return (
    <div className="relative group">
      <Link to={`/courses/${id}`} className="block">
        <div className="overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-glow hover:-translate-y-1">
          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden bg-muted">
            {thumbnail_url ? (
              <img
                src={thumbnail_url}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                <BookOpen className="h-10 w-10 text-muted-foreground/50" />
              </div>
            )}
            {difficulty && (
              <Badge variant="outline" className={`absolute top-3 right-3 text-xs ${difficultyColors[difficulty] || ""}`}>
                {difficulty}
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {category && (
                  <span className="mb-1.5 inline-block text-xs font-medium uppercase tracking-wider text-primary">
                    {category}
                  </span>
                )}
                <h3 className="mb-1 text-lg font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {title}
                </h3>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                <BookmarkButton courseId={id} />
              </div>
            </div>
            {description && (
              <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{description}</p>
            )}

            {teacher_name && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <User className="h-3 w-3" />
                <span>{teacher_name}</span>
              </div>
            )}

            {/* Progress bar */}
            {progressPercent !== undefined && (
              <div className="space-y-1.5">
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

      {/* Settings button overlay */}
      <Link
        to={`/courses/${id}`}
        className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Course Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <Button size="icon" variant="secondary" className="h-8 w-8 shadow-md">
          <Settings className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
};

export default CourseCard;
