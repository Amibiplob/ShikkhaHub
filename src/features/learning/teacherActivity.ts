/** Course filtering must scope every metric, including assessments linked indirectly. */
export function scopeTeacherActivity<
 E extends {course_id:string}, S extends {assignment_id:string}, R extends {course_id:string},
 P extends {lesson_id:string}, M extends {course_id:string;lessons?:{id:string}[]}, Q extends {quiz_id:string}
>(course:string,data:{enrollments:E[];submissions:S[];reviews:R[];lessonProgress:P[];modules:M[];quizAttempts:Q[]},assignmentCourses:Record<string,string>,quizCourses:Record<string,string>) {
 if(course==='all')return data;
 const modules=data.modules.filter(m=>m.course_id===course);
 const lessons=new Set(modules.flatMap(m=>m.lessons?.map(l=>l.id)||[]));
 return {enrollments:data.enrollments.filter(e=>e.course_id===course),submissions:data.submissions.filter(s=>assignmentCourses[s.assignment_id]===course),reviews:data.reviews.filter(r=>r.course_id===course),lessonProgress:data.lessonProgress.filter(p=>lessons.has(p.lesson_id)),modules,quizAttempts:data.quizAttempts.filter(q=>quizCourses[q.quiz_id]===course)};
}

/** Attribute each attempt to its actual course; unrelated quizzes never affect a bar. */
export function courseQuizPassRates(
  courses: { id: string; title: string }[],
  attempts: { quiz_id: string; passed: boolean }[],
  quizCourses: Record<string, string>,
) {
  const counts = new Map<string, { total: number; passed: number }>();
  for (const attempt of attempts) {
    const course = quizCourses[attempt.quiz_id];
    if (!course) continue;
    const value = counts.get(course) || { total: 0, passed: 0 };
    value.total++;
    if (attempt.passed) value.passed++;
    counts.set(course, value);
  }
  return courses.map(course => {
    const value = counts.get(course.id);
    return {
      name: course.title.length > 18 ? course.title.slice(0, 18) + "…" : course.title,
      rate: value ? Math.round(value.passed / value.total * 100) : 0,
    };
  });
}
