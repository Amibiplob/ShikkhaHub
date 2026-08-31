# Code Campus

Build a modern full-stack EdTech web application similar to Programming Hero and W3Schools where teachers can publish learning content, host live classes, and students can interact through a community system.



Platform Goal:

Create an online learning platform where teachers can publish courses with videos, articles, and documents. Students can watch lessons, read documentation, join live classes, and participate in community discussions.



User Roles:

1. Teacher

2. Student

3. Admin



Authentication:

- Email and password login

- Google OAuth login

- Role-based access control (teacher / student / admin)



--------------------------------



COURSE SYSTEM



Teachers can create structured courses.



Course Structure:

Course

  → Modules

      → Lessons



Lesson Types:

- Video lesson

- Article / documentation (Markdown + code blocks like W3Schools)

- File upload (PDF / DOC)



Teacher Features:

- Create and edit courses

- Create modules and lessons

- Upload video lessons

- Write documentation articles

- Upload files

- Track student progress



Student Features:

- Enroll in courses

- Watch video lessons

- Read articles

- Download files

- Track lesson progress

- Bookmark lessons



--------------------------------



LIVE CLASS SYSTEM



Teachers can create live classes similar to Google Meet.



Features:

- Generate meeting link

- Students join meeting from course page

- Screen sharing

- Webcam video

- Microphone audio

- Chat during live class

- Whiteboard for teaching



Recording System:

- Record screen + webcam + audio

- Use browser MediaRecorder API

- Automatically upload recording to server after class

- Save recording as lesson video



Technologies suggested:

WebRTC + Socket.io for real-time communication.



--------------------------------



LESSON DISCUSSION SYSTEM



Each lesson has a discussion section.



Rules:

- Each student can comment maximum 2 times under a lesson.

- Teachers can comment unlimited times.



Features:

- Ask questions

- Report errors in lesson

- Teacher replies

- Teacher can pin important answers



--------------------------------



GLOBAL COMMUNITY SYSTEM



Create a community forum where students and teachers can post topics.



Users can:

- Create posts

- Comment on posts

- Reply to comments

- Upvote helpful answers



Example topics:

- Best programming language for the future

- Best PC for programming

- Career advice

- New technology discussions

- Programming questions



Community categories:

- Programming

- Career

- Hardware

- AI / New Technology

- General Discussion



Moderation:

- Report spam

- Admin remove posts

- Teachers pin helpful posts



--------------------------------



ASSIGNMENT SYSTEM



Teachers can create assignments for lessons.



Students can submit:

- GitHub repository link

- File upload

- Website link



Teachers can:

- Review submissions

- Give feedback

- Give marks



--------------------------------



ADMIN PANEL



Admin can manage:

- Users

- Teachers

- Courses

- Community posts

- Storage usage



--------------------------------



TECH STACK



Frontend:

Next.js

TailwindCSS

TypeScript



Backend:

Node.js with Express or NestJS



Database:

PostgreSQL



Real-time features:

WebRTC

Socket.io



Storage:

AWS S3 or Cloud storage



Authentication:

JWT + Google OAuth



--------------------------------



UI STYLE



- Clean modern UI

- Developer-friendly design

- Layout similar to W3Schools tutorials

- Responsive for mobile and desktop



--------------------------------



EXTRA FEATURES



- Dark mode

- Notification system

- Course progress tracking

- Search courses and lessons

- Bookmark lessons

- Teacher dashboard

- Student dashboard



--------------------------------



DELIVERABLES



Generate:

- Database schema

- Backend API structure

- Frontend component architecture

- Live meeting architecture

- Deployment plan

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2ca213bb-ea95-40c2-8ed5-1a55f59864ce).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
