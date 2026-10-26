import { expect,it } from 'vitest';
import { scopeTeacherActivity } from './teacherActivity';
it('scopes assessment and progress metrics to the selected course',()=>{
 const data={enrollments:[{course_id:'a'},{course_id:'b'}],submissions:[{assignment_id:'aa'},{assignment_id:'bb'}],reviews:[{course_id:'a'},{course_id:'b'}],lessonProgress:[{lesson_id:'la'},{lesson_id:'lb'}],modules:[{course_id:'a',lessons:[{id:'la'}]},{course_id:'b',lessons:[{id:'lb'}]}],quizAttempts:[{quiz_id:'qa'},{quiz_id:'qb'}]};
 const result=scopeTeacherActivity('a',data,{aa:'a',bb:'b'},{qa:'a',qb:'b'});expect(result.submissions).toEqual([{assignment_id:'aa'}]);expect(result.quizAttempts).toEqual([{quiz_id:'qa'}]);expect(result.lessonProgress).toEqual([{lesson_id:'la'}]);expect(result.enrollments).toHaveLength(1);expect(scopeTeacherActivity('all',data,{},{})).toBe(data);
});
