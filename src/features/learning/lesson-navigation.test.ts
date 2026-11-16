import { expect, it } from 'vitest';
import { nextLearningLesson } from './lesson-navigation';
const lessons = [{id:'a'},{id:'b'},{id:'c'}];
it('resumes the first unfinished lesson from persisted progress', () => {
  expect(nextLearningLesson(lessons, {})).toEqual(lessons[0]);
  expect(nextLearningLesson(lessons, {a:true,c:true})).toEqual(lessons[1]);
});
it('respects explicit review links and ignores unknown lesson IDs', () => {
  expect(nextLearningLesson(lessons,{a:true},'a')).toEqual(lessons[0]);
  expect(nextLearningLesson(lessons,{a:true},'foreign')).toEqual(lessons[1]);
});
it('keeps the last lesson available while assessments remain and handles empty curriculum', () => {
  expect(nextLearningLesson(lessons,{a:true,b:true,c:true})).toEqual(lessons[2]);
  expect(nextLearningLesson([],{})).toBeNull();
});
