import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import CoursePrerequisites from './CoursePrerequisites';
const fake = vi.hoisted(() => ({ valid: null as string | null, revoked: undefined as unknown, remove: vi.fn() }));
vi.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'user' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  if (table === 'course_prerequisites') return {
    select: () => ({ eq: async () => ({ data: [{ id: 'prereq', prerequisite_course_id: 'completed-course', courses: { id: 'completed-course', title: 'Prerequisite course' } }] }) }),
    delete: () => ({ eq: fake.remove }),
  };
  if (table === 'courses') return { select: () => ({ eq: () => ({ neq: async () => ({ data: [] }) }) }) };
  const query = { select: () => query, eq: () => query, in: () => query, not: (name: string) => { fake.valid = name; return query; }, is: (name: string, value: unknown) => { fake.revoked = [name, value]; return Promise.resolve({ data: [] }); } };
  return query;
} } }));
beforeEach(() => { fake.valid = null; fake.revoked = undefined; fake.remove.mockResolvedValue({ error: { message: 'denied' } }); });
it('requires validated, nonrevoked completion and retains a prerequisite after deletion fails', async () => {
  render(<MemoryRouter><CoursePrerequisites courseId="course" isTeacher /></MemoryRouter>);
  await screen.findByText('Prerequisite course');
  expect(fake.valid).toBe('validated_at'); expect(fake.revoked).toEqual(['revoked_at', null]);
  fireEvent.click(screen.getByRole('button', { name: 'Remove prerequisite' }));
  await waitFor(() => expect(fake.remove).toHaveBeenCalled());
  expect(screen.getByText('Prerequisite course')).toBeInTheDocument();
});
