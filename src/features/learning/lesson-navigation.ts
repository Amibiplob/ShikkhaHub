/** Respect a shared lesson URL, otherwise resume the first unfinished lesson. */
export function nextLearningLesson<T extends { id: string }>(lessons: readonly T[], progress: Readonly<Record<string, boolean>>, requested?: string | null): T | null {
  return lessons.find(l => l.id === requested) || lessons.find(l => !progress[l.id]) || lessons[lessons.length - 1] || null;
}
