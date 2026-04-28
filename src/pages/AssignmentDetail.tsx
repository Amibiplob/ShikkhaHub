import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, CheckCircle2, Clock, Download, ExternalLink, FileText, Github, Globe,
  Loader2, MessageSquare, Paperclip, Send, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const AssignmentDetail = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [mySubmission, setMySubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Submit form
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subType, setSubType] = useState("github");
  const [subContent, setSubContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review form
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const isTeacher = hasRole("teacher");

  useEffect(() => {
    if (!assignmentId) return;
    const fetchData = async () => {
      const { data: asgn } = await supabase
        .from("assignments")
        .select("*, courses(title, teacher_id)")
        .eq("id", assignmentId)
        .single();
      setAssignment(asgn);

      if (asgn && user) {
        const isOwner = asgn.courses?.teacher_id === user.id;
        if (isOwner) {
          // Teacher: fetch all submissions with student profiles
          const { data: subs } = await supabase
            .from("submissions")
            .select("*, profiles!submissions_student_id_fkey(full_name)")
            .eq("assignment_id", assignmentId)
            .order("submitted_at", { ascending: false });
          setSubmissions(subs || []);
        } else {
          // Student: fetch own submission
          const { data: sub } = await supabase
            .from("submissions")
            .select("*")
            .eq("assignment_id", assignmentId)
            .eq("student_id", user.id)
            .maybeSingle();
          setMySubmission(sub);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [assignmentId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !assignmentId) return;
    setSubmitting(true);

    let fileUrl: string | null = null;
    let content = subContent;

    if (subType === "file") {
      if (!selectedFile) {
        toast.error("Please select a file to upload");
        setSubmitting(false);
        return;
      }
      setUploading(true);
      const ext = selectedFile.name.split(".").pop();
      const filePath = `${user.id}/${assignmentId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, selectedFile);
      if (uploadError) {
        toast.error("File upload failed: " + uploadError.message);
        setSubmitting(false);
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("submissions")
        .getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
      content = selectedFile.name;
      setUploading(false);
    }

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        submission_type: subType,
        content,
        file_url: fileUrl,
      })
      .select()
      .single();
    if (error) toast.error(error.message);
    else {
      toast.success("Submitted!");
      setMySubmission(data);
      setSubmitOpen(false);
      setSubContent("");
      setSelectedFile(null);
    }
    setSubmitting(false);
  };

  const handleReview = async (submissionId: string) => {
    setReviewing(true);
    const { error } = await supabase
      .from("submissions")
      .update({
        marks: marks ? parseInt(marks) : null,
        feedback: feedback || null,
        status: "reviewed",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    if (error) toast.error(error.message);
    else {
      toast.success("Review saved!");
      // Send notification to student
      const sub = submissions.find((s) => s.id === submissionId);
      if (sub) {
        await supabase.from("notifications").insert({
          user_id: sub.student_id,
          title: "Assignment Graded",
          message: `Your submission for "${assignment.title}" has been reviewed. ${marks ? `Score: ${marks}/${assignment.max_marks}` : ""}`,
          type: "grade",
          link: `/assignments/${assignmentId}`,
        });
      }
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? { ...s, marks: marks ? parseInt(marks) : null, feedback, status: "reviewed", reviewed_at: new Date().toISOString() }
            : s
        )
      );
      setReviewingId(null);
      setMarks("");
      setFeedback("");
    }
    setReviewing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center flex-col gap-4">
          <p className="text-muted-foreground">Assignment not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = assignment.courses?.teacher_id === user?.id;
  const isPastDue = assignment.due_date && new Date(assignment.due_date) < new Date();
  const typeIcon = (t: string) => {
    switch (t) {
      case "github": return <Github className="h-4 w-4" />;
      case "url": return <Globe className="h-4 w-4" />;
      case "file": return <Paperclip className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "submitted": return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case "reviewed": return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="mr-1 h-3 w-3" />Reviewed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {/* Assignment header */}
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{assignment.courses?.title}</p>
              <h1 className="text-2xl font-bold">{assignment.title}</h1>
              {assignment.description && (
                <p className="mt-2 text-muted-foreground">{assignment.description}</p>
              )}
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm font-medium">Max: {assignment.max_marks} marks</p>
              {assignment.due_date && (
                <p className={`text-sm ${isPastDue ? "text-destructive" : "text-muted-foreground"}`}>
                  Due: {format(new Date(assignment.due_date), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {(assignment.submission_types as string[])?.map((t) => (
              <Badge key={t} variant="outline" className="gap-1 text-xs">
                {typeIcon(t)} {t}
              </Badge>
            ))}
          </div>
        </div>

        {/* Student view */}
        {!isOwner && (
          <div className="rounded-xl border border-border bg-card p-6">
            {mySubmission ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Your Submission</h2>
                  {statusBadge(mySubmission.status)}
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {typeIcon(mySubmission.submission_type)}
                    <span className="text-sm font-medium capitalize">{mySubmission.submission_type}</span>
                  </div>
                  {mySubmission.submission_type === "github" || mySubmission.submission_type === "url" ? (
                    <a href={mySubmission.content} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      {mySubmission.content} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : mySubmission.submission_type === "file" && mySubmission.file_url ? (
                    <a href={mySubmission.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" /> {mySubmission.content}
                    </a>
                  ) : (
                    <p className="text-sm">{mySubmission.content}</p>
                  )}
                </div>
                {mySubmission.status === "reviewed" && (
                  <div className="rounded-lg border border-success/20 bg-success/5 p-4 space-y-2">
                    <p className="font-semibold text-success">
                      Marks: {mySubmission.marks !== null ? `${mySubmission.marks}/${assignment.max_marks}` : "—"}
                    </p>
                    {mySubmission.feedback && (
                      <div>
                        <p className="text-sm font-medium mb-1">Feedback:</p>
                        <p className="text-sm text-muted-foreground">{mySubmission.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Send className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {isPastDue ? "This assignment is past due" : "You haven't submitted yet"}
                </p>
                {!isPastDue && (
                  <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
                        <Send className="h-4 w-4" /> Submit Assignment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Submit Assignment</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label>Submission Type</Label>
                          <Select value={subType} onValueChange={setSubType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(assignment.submission_types as string[])?.map((t) => (
                                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {subType === "file" ? (
                          <div>
                            <Label>Upload File (PDF, images, documents — max 10MB)</Label>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.zip"
                              className="hidden"
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className="mt-1 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-6 transition-colors hover:border-primary/50 hover:bg-muted"
                            >
                              {selectedFile ? (
                                <div className="flex items-center gap-2">
                                  <Paperclip className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">{selectedFile.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <Upload className="mx-auto mb-1 h-6 w-6 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">Click to select a file</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Label>{subType === "github" ? "GitHub Repository URL" : subType === "url" ? "Website URL" : "Description / Notes"}</Label>
                            <Input
                              value={subContent}
                              onChange={(e) => setSubContent(e.target.value)}
                              placeholder={subType === "github" ? "https://github.com/user/repo" : subType === "url" ? "https://..." : "Describe your work..."}
                              required
                            />
                          </div>
                        )}
                        <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={submitting || uploading}>
                          {(submitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {uploading ? "Uploading..." : "Submit"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </div>
        )}

        {/* Teacher view - submissions list */}
        {isOwner && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Submissions ({submissions.length})
            </h2>
            {submissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">No submissions yet</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.profiles?.full_name || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 capitalize">{typeIcon(sub.submission_type)} {sub.submission_type}</div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {sub.submission_type === "github" || sub.submission_type === "url" ? (
                            <a href={sub.content} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1 truncate">
                              {sub.content} <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : sub.submission_type === "file" && sub.file_url ? (
                            <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1 truncate">
                              <Download className="h-3 w-3 shrink-0" /> {sub.content}
                            </a>
                          ) : (
                            <span className="text-sm truncate block">{sub.content}</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(sub.status)}</TableCell>
                        <TableCell>
                          {sub.marks !== null ? `${sub.marks}/${assignment.max_marks}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(sub.submitted_at), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell>
                          <Dialog open={reviewingId === sub.id} onOpenChange={(open) => {
                            if (open) {
                              setReviewingId(sub.id);
                              setMarks(sub.marks?.toString() || "");
                              setFeedback(sub.feedback || "");
                            } else {
                              setReviewingId(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1">
                                <MessageSquare className="h-3.5 w-3.5" /> Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Review Submission</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="rounded-lg bg-muted p-3">
                                  <p className="text-sm font-medium mb-1">{sub.profiles?.full_name}</p>
                                  <div className="flex items-center gap-1 text-sm">
                                    {typeIcon(sub.submission_type)}
                                    {sub.submission_type === "github" || sub.submission_type === "url" ? (
                                      <a href={sub.content} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                        {sub.content}
                                      </a>
                                    ) : sub.submission_type === "file" && sub.file_url ? (
                                      <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                        <Download className="h-3 w-3" /> {sub.content}
                                      </a>
                                    ) : (
                                      <span>{sub.content}</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Label>Marks (out of {assignment.max_marks})</Label>
                                  <Input type="number" min={0} max={assignment.max_marks} value={marks} onChange={(e) => setMarks(e.target.value)} />
                                </div>
                                <div>
                                  <Label>Feedback</Label>
                                  <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} placeholder="Write your feedback..." />
                                </div>
                                <Button
                                  onClick={() => handleReview(sub.id)}
                                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
                                  disabled={reviewing}
                                >
                                  {reviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Review
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AssignmentDetail;
