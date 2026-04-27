import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { BookOpen, FileText, MessageSquare, Search, X } from "lucide-react";

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ courses: any[]; posts: any[]; assignments: any[] }>({ courses: [], posts: [], assignments: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults({ courses: [], posts: [], assignments: [] }); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const [coursesRes, postsRes, assignRes] = await Promise.all([
        supabase.from("courses").select("id, title, category").eq("is_published", true).ilike("title", `%${query}%`).limit(5),
        supabase.from("community_posts").select("id, title, category").ilike("title", `%${query}%`).limit(5),
        supabase.from("assignments").select("id, title, course_id").ilike("title", `%${query}%`).limit(5),
      ]);
      setResults({
        courses: coursesRes.data || [],
        posts: postsRes.data || [],
        assignments: assignRes.data || [],
      });
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNav = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  };

  const totalResults = results.courses.length + results.posts.length + results.assignments.length;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="h-8 w-48 pl-8 text-sm"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-xl border border-border bg-popover p-2 shadow-lg">
          {loading ? (
            <p className="p-3 text-sm text-muted-foreground text-center">Searching...</p>
          ) : totalResults === 0 ? (
            <p className="p-3 text-sm text-muted-foreground text-center">No results found</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-1">
              {results.courses.length > 0 && (
                <>
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Courses</p>
                  {results.courses.map((c) => (
                    <button key={c.id} onClick={() => handleNav(`/courses/${c.id}`)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors">
                      <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{c.title}</span>
                    </button>
                  ))}
                </>
              )}
              {results.posts.length > 0 && (
                <>
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Community</p>
                  {results.posts.map((p) => (
                    <button key={p.id} onClick={() => handleNav(`/community/${p.id}`)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors">
                      <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{p.title}</span>
                    </button>
                  ))}
                </>
              )}
              {results.assignments.length > 0 && (
                <>
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Assignments</p>
                  {results.assignments.map((a) => (
                    <button key={a.id} onClick={() => handleNav(`/assignments/${a.id}`)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors">
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{a.title}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
