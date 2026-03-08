import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, CircleDot, Loader2, Plus, Trash2, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface QuizManagerProps {
  courseId: string;
  isTeacher: boolean;
  enrolled: boolean;
}

const QuizManager = ({ courseId, isTeacher, enrolled }: QuizManagerProps) => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passPercentage, setPassPercentage] = useState("70");

  // Quiz taking state
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [attempts, setAttempts] = useState<Record<string, any>>({});

  // Question editor
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [editQuestions, setEditQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", "", "", ""]);
  const [newCorrect, setNewCorrect] = useState(0);
  const [addingQ, setAddingQ] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, [courseId]);

  const fetchQuizzes = async () => {
    const { data } = await supabase.from("quizzes").select("*").eq("course_id", courseId).order("created_at");
    setQuizzes(data || []);

    // Fetch user attempts
    if (user && data && data.length > 0) {
      const { data: attemptsData } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("user_id", user.id)
        .in("quiz_id", data.map((q) => q.id))
        .order("completed_at", { ascending: false });
      const map: Record<string, any> = {};
      attemptsData?.forEach((a) => { if (!map[a.quiz_id]) map[a.quiz_id] = a; });
      setAttempts(map);
    }
    setLoading(false);
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { data, error } = await supabase.from("quizzes").insert({
      course_id: courseId,
      title,
      description: description || null,
      pass_percentage: parseInt(passPercentage) || 70,
    }).select().single();
    if (error) toast.error(error.message);
    else {
      toast.success("Quiz created!");
      setQuizzes((prev) => [...prev, data]);
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setEditingQuizId(data.id);
    }
    setCreating(false);
  };

  const handleAddQuestion = async () => {
    if (!editingQuizId || !newQuestion.trim()) return;
    const filteredOptions = newOptions.filter((o) => o.trim());
    if (filteredOptions.length < 2) { toast.error("Need at least 2 options"); return; }
    setAddingQ(true);
    const { data, error } = await supabase.from("quiz_questions").insert({
      quiz_id: editingQuizId,
      question: newQuestion,
      options: filteredOptions as unknown as Json,
      correct_answer: newCorrect,
      sort_order: editQuestions.length,
    }).select().single();
    if (error) toast.error(error.message);
    else {
      setEditQuestions((prev) => [...prev, data]);
      setNewQuestion("");
      setNewOptions(["", "", "", ""]);
      setNewCorrect(0);
    }
    setAddingQ(false);
  };

  const handleDeleteQuestion = async (qId: string) => {
    await supabase.from("quiz_questions").delete().eq("id", qId);
    setEditQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const openQuestionEditor = async (quizId: string) => {
    setEditingQuizId(quizId);
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order");
    setEditQuestions(data || []);
  };

  const startQuiz = async (quiz: any) => {
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quiz.id).order("sort_order");
    setQuestions(data || []);
    setActiveQuiz(quiz);
    setAnswers({});
    setResult(null);
  };

  const submitQuiz = async () => {
    if (!user || !activeQuiz) return;
    setSubmitting(true);
    let score = 0;
    const totalPoints = questions.reduce((acc, q) => acc + (q.points || 1), 0);
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) score += q.points || 1;
    });
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= activeQuiz.pass_percentage;

    const { data, error } = await supabase.from("quiz_attempts").insert({
      quiz_id: activeQuiz.id,
      user_id: user.id,
      answers: answers as unknown as Json,
      score,
      total_points: totalPoints,
      passed,
    }).select().single();

    if (error) toast.error(error.message);
    else {
      setResult({ score, totalPoints, percentage, passed });
      setAttempts((prev) => ({ ...prev, [activeQuiz.id]: data }));
      if (passed) toast.success("Congratulations! You passed! 🎉");
      else toast.info(`Score: ${percentage}%. You need ${activeQuiz.pass_percentage}% to pass.`);
    }
    setSubmitting(false);
  };

  if (loading) return null;
  if (quizzes.length === 0 && !isTeacher) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <CircleDot className="h-5 w-5 text-primary" /> Quizzes ({quizzes.length})
        </h3>
        {isTeacher && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
                <Plus className="h-4 w-4" /> New Quiz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Quiz</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateQuiz} className="space-y-4">
                <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
                <div><Label>Pass Percentage (%)</Label><Input type="number" value={passPercentage} onChange={(e) => setPassPercentage(e.target.value)} min={1} max={100} /></div>
                <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Quiz
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Active quiz / taking mode */}
      {activeQuiz && !result && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{activeQuiz.title}</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveQuiz(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-6">
            {questions.map((q, idx) => {
              const options = (q.options as string[]) || [];
              return (
                <div key={q.id} className="rounded-lg border border-border p-4">
                  <p className="font-medium mb-3">{idx + 1}. {q.question}</p>
                  <RadioGroup value={answers[q.id]?.toString()} onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: parseInt(v) }))}>
                    {options.map((opt: string, i: number) => (
                      <div key={i} className="flex items-center space-x-2">
                        <RadioGroupItem value={i.toString()} id={`${q.id}-${i}`} />
                        <Label htmlFor={`${q.id}-${i}`} className="cursor-pointer">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              );
            })}
          </div>
          <Button onClick={submitQuiz} className="mt-6 w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={submitting || Object.keys(answers).length < questions.length}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Quiz
          </Button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6 text-center">
          <Trophy className={`mx-auto mb-3 h-12 w-12 ${result.passed ? "text-success" : "text-muted-foreground"}`} />
          <h3 className="text-2xl font-bold mb-2">{result.percentage}%</h3>
          <p className="text-muted-foreground mb-3">Score: {result.score}/{result.totalPoints}</p>
          <Badge className={result.passed ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
            {result.passed ? "Passed ✓" : "Not Passed"}
          </Badge>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => { setActiveQuiz(null); setResult(null); }}>Close</Button>
            {!result.passed && <Button onClick={() => setResult(null)}>Retry</Button>}
          </div>
        </div>
      )}

      {/* Question Editor */}
      {isTeacher && editingQuizId && (
        <Dialog open={!!editingQuizId} onOpenChange={() => setEditingQuizId(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Manage Questions</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {editQuestions.map((q, idx) => (
                <div key={q.id} className="rounded-lg border border-border p-3 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{idx + 1}. {q.question}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(q.options as string[])?.map((o: string, i: number) => (
                        <Badge key={i} variant={i === q.correct_answer ? "default" : "outline"} className="text-xs">
                          {o} {i === q.correct_answer && "✓"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              <div className="rounded-lg border-2 border-dashed border-border p-4 space-y-3">
                <p className="text-sm font-medium">Add New Question</p>
                <Input placeholder="Question text" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  {newOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={newCorrect === i} onChange={() => setNewCorrect(i)} className="accent-primary" />
                      <Input placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => { const n = [...newOptions]; n[i] = e.target.value; setNewOptions(n); }} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer</p>
                <Button onClick={handleAddQuestion} disabled={addingQ || !newQuestion.trim()} className="w-full">
                  {addingQ && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Question
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quiz list */}
      {!activeQuiz && !result && (
        <div className="space-y-3">
          {quizzes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <CircleDot className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No quizzes yet</p>
            </div>
          ) : (
            quizzes.map((quiz) => {
              const attempt = attempts[quiz.id];
              return (
                <div key={quiz.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <CircleDot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{quiz.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Pass: {quiz.pass_percentage}%
                        {attempt && ` • Last: ${Math.round((attempt.score / attempt.total_points) * 100)}%`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {attempt?.passed && <Badge className="bg-success/10 text-success border-success/20 text-xs">Passed</Badge>}
                    {isTeacher && (
                      <Button size="sm" variant="outline" onClick={() => openQuestionEditor(quiz.id)}>
                        Edit Questions
                      </Button>
                    )}
                    {enrolled && (
                      <Button size="sm" onClick={() => startQuiz(quiz)}>
                        {attempt ? "Retake" : "Start Quiz"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default QuizManager;
