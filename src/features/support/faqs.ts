export const faqs = [
  [
    "account",
    "How do I create an account?",
    "Choose Get Started and register with your name, email and password. Confirm your email when your Supabase environment requires confirmation.",
  ],
  [
    "account",
    "What is the difference between student and teacher accounts?",
    "All registrations start as students. Request teacher access at signup; an administrator reviews the request before teacher tools become available.",
  ],
  [
    "courses",
    "How do I enroll in a course?",
    "Sign in, open a published free course and choose Enroll Now. Enrolled courses appear in your dashboard.",
  ],
  [
    "courses",
    "Are paid courses and refunds supported?",
    "Prices may be displayed in BDT, but payments and paid enrollment are not available. This platform does not collect course or tutoring payments and cannot process refunds.",
  ],
  [
    "courses",
    "What does course completion mean?",
    "Mark every lesson complete, pass all course quizzes and obtain a teacher-recorded grade for every assignment. Lesson completion is self-reported learning progress.",
  ],
  [
    "certificates",
    "How do I get a certificate?",
    "Eligible completion creates a certificate record automatically. Open My Certificates to download the PDF, or retry Check eligibility. The server checks your learning records; changing a browser percentage cannot grant a certificate.",
  ],
  [
    "certificates",
    "Can someone verify my certificate?",
    "Share the verification URL printed on the PDF. The public page shows the course, issue date and current status, without your name or email. These are platform completion certificates, not university-accredited awards.",
  ],
  [
    "tutoring",
    "How do I hire a private tutor?",
    "Browse Private Tutoring, search or filter expertise, open a profile and request a future available slot. A platform-approved teacher must accept it before it is confirmed. Qualifications are self-reported.",
  ],
  [
    "tutoring",
    "Which timezone is used for tutoring?",
    "Discovery and bookings display times in your browser timezone. Teachers choose an IANA timezone when offering individual or weekly recurring slots. Confirm the displayed timezone before booking.",
  ],
  [
    "tutoring",
    "Can I cancel or reschedule a tutoring session?",
    "Either participant can cancel a pending or confirmed session before it starts. To reschedule, cancel and request another slot. Teachers can edit only future slots without request history. No cancellation fee is collected.",
  ],
  [
    "technical",
    "How do I join a live class or tutoring meeting?",
    "Course live classes are available to authorized course participants. Confirmed tutoring sessions show a private teacher-provided HTTPS meeting link. Camera/microphone permissions and network connectivity are required; external meeting providers control admission.",
  ],
  [
    "courses",
    "How are quizzes and assignments assessed?",
    "Quiz scores are calculated by PostgreSQL from your answers. Course teachers grade assignments and provide feedback. Completed certificates require quiz passes and recorded assignment grades; AI grading is not provided.",
  ],
  [
    "account",
    "How do I recover my password?",
    "Choose Forgot password on the sign-in page and follow the recovery email. Delivery and redirects depend on your configured Supabase Auth environment. Never share passwords or recovery links with support.",
  ],
  [
    "other",
    "How can I contact support?",
    "Use Contact Support to save a private request. Signed-in users can see their own ticket statuses there. Guest submissions receive a reference number. A saved ticket does not mean an email response was sent.",
  ],
] as const;
export function filterFaqs(search: string, category = "") {
  const query = search.trim().toLowerCase();
  return faqs.filter(
    ([group, q, a]) =>
      (!category || group === category) &&
      `${q} ${a}`.toLowerCase().includes(query),
  );
}
