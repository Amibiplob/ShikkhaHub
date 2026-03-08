import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CourseReviewsProps {
  courseId: string;
  enrolled: boolean;
}

const StarRating = ({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readonly}
        onClick={() => onChange?.(star)}
        className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
      >
        <Star
          className={`h-5 w-5 ${
            star <= value
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      </button>
    ))}
  </div>
);

const CourseReviews = ({ courseId, enrolled }: CourseReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [myReview, setMyReview] = useState<any>(null);
  const [editing, setEditing] = useState(false);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("course_reviews")
      .select("*, profiles!course_reviews_user_id_fkey(full_name, avatar_url)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    setReviews(data || []);
    if (user) {
      const mine = data?.find((r: any) => r.user_id === user.id) || null;
      setMyReview(mine);
      if (mine) {
        setRating(mine.rating);
        setComment(mine.comment || "");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [courseId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    if (myReview) {
      const { error } = await supabase
        .from("course_reviews")
        .update({ rating, comment: comment || null })
        .eq("id", myReview.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Review updated!");
        setEditing(false);
        fetchReviews();
      }
    } else {
      const { error } = await supabase.from("course_reviews").insert({
        course_id: courseId,
        user_id: user.id,
        rating,
        comment: comment || null,
      });
      if (error) toast.error(error.message);
      else {
        toast.success("Review submitted!");
        fetchReviews();
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!myReview) return;
    const { error } = await supabase
      .from("course_reviews")
      .delete()
      .eq("id", myReview.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Review deleted");
      setMyReview(null);
      setRating(5);
      setComment("");
      fetchReviews();
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          Reviews ({reviews.length})
        </h3>
        {avgRating && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{avgRating}</span>
            <StarRating value={Math.round(Number(avgRating))} readonly />
          </div>
        )}
      </div>

      {/* Write / edit review */}
      {enrolled && user && (!myReview || editing) && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-5 mb-6 space-y-4"
        >
          <p className="font-medium text-sm">
            {myReview ? "Edit your review" : "Write a review"}
          </p>
          <StarRating value={rating} onChange={setRating} />
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about this course..."
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {myReview ? "Update Review" : "Submit Review"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}

      {/* My review card */}
      {myReview && !editing && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={myReview.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(myReview.profiles?.full_name || "Y")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Your Review</p>
                <StarRating value={myReview.rating} readonly />
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {myReview.comment && (
            <p className="mt-3 text-sm text-muted-foreground">{myReview.comment}</p>
          )}
        </div>
      )}

      {/* Other reviews */}
      {reviews.filter((r) => r.user_id !== user?.id).length === 0 && !myReview ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <Star className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No reviews yet</p>
          {enrolled && <p className="text-sm text-muted-foreground mt-1">Be the first to review!</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews
            .filter((r) => r.user_id !== user?.id)
            .map((review) => (
              <div key={review.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={review.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-muted">
                      {(review.profiles?.full_name || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{review.profiles?.full_name || "Anonymous"}</p>
                    <div className="flex items-center gap-2">
                      <StarRating value={review.rating} readonly />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default CourseReviews;
