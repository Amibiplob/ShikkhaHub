export type Language = "en" | "bn";

const en = {
  // Nav
  "nav.explore": "Explore",
  "nav.learn": "Learn",
  "nav.allCourses": "All Courses",
  "nav.beginner": "Beginner Friendly",
  "nav.advanced": "Advanced Tracks",
  "nav.popular": "Most Popular",
  "nav.newest": "Newly Added",
  "nav.categories": "Categories",
  "nav.courses": "Courses",
  "nav.community": "Community",
  "nav.forum": "Discussion Forum",
  "nav.career": "Career Advice",
  "nav.help": "Ask for Help",
  "nav.leaderboard": "Leaderboard",
  "nav.achievements": "Achievements",
  "nav.myLearning": "My Learning",
  "nav.dashboard": "Dashboard",
  "nav.myCourses": "My Courses",
  "nav.bookmarks": "Bookmarks",
  "nav.liveClasses": "Live Classes",
  "nav.certificates": "Certificates & Badges",
  "nav.teach": "Teach",
  "nav.teachOn": "Teach on ShikkhaHub",
  "nav.analytics": "Analytics",
  "nav.admin": "Admin Panel",
  "nav.profile": "Profile",
  "nav.signIn": "Sign in",
  "nav.signOut": "Sign out",
  "nav.getStarted": "Get Started",

  // Categories
  "cat.web": "Web Development",
  "cat.programming": "Programming",
  "cat.mobile": "Mobile Apps",
  "cat.data": "Data Science",
  "cat.ai": "AI & Machine Learning",
  "cat.devops": "DevOps & Cloud",
  "cat.design": "UI/UX Design",
  "cat.cs": "Computer Science",

  // Hero
  "hero.badge": "Developer-focused learning platform",
  "hero.title1": "Learn to code",
  "hero.title2": "with",
  "hero.titleHighlight": "experts",
  "hero.subtitle":
    "Interactive courses, live classes, hands-on projects, and a vibrant community — everything you need to become a better developer.",
  "hero.cta1": "Start Learning Free",
  "hero.cta2": "Browse Courses",
  "hero.statCourses": "Courses",
  "hero.statStudents": "Students",
  "hero.statLive": "Live Classes",

  // Featured
  "featured.eyebrow": "Popular",
  "featured.title": "Featured Courses",
  "featured.viewAll": "View All",
  "featured.viewAllCourses": "View All Courses",

  // Categories section
  "categories.eyebrow": "Browse",
  "categories.title": "Explore by category",
  "categories.subtitle": "Pick a track and start with the fundamentals or jump straight to advanced topics.",

  // Features
  "features.eyebrow": "Features",
  "features.title1": "Everything you need to",
  "features.titleHighlight": "level up",
  "features.subtitle": "A complete platform for learning, teaching, and building together.",
  "features.courses.title": "Structured Courses",
  "features.courses.desc": "Learn with organized modules and lessons — videos, articles, and downloadable resources.",
  "features.live.title": "Live Classes",
  "features.live.desc": "Join real-time video sessions with screen sharing, whiteboard, and interactive Q&A.",
  "features.interactive.title": "Interactive Content",
  "features.interactive.desc": "Read beautifully formatted articles with code blocks, syntax highlighting, and examples.",
  "features.quiz.title": "Assignments & Quizzes",
  "features.quiz.desc": "Submit projects, take quizzes, get teacher reviews with detailed feedback and marks.",
  "features.badges.title": "Badges & Certificates",
  "features.badges.desc": "Earn achievement badges and downloadable certificates as you complete courses.",
  "features.forum.title": "Community Forum",
  "features.forum.desc": "Share knowledge, get career advice, and discuss tech with fellow developers.",

  // How it works
  "how.eyebrow": "How it works",
  "how.title": "From zero to certified in four steps",
  "how.step1.title": "Create your account",
  "how.step1.desc": "Sign up free and set up your learner profile in under a minute.",
  "how.step2.title": "Enroll & learn",
  "how.step2.desc": "Follow structured modules with lessons, articles, and live classes.",
  "how.step3.title": "Practice & submit",
  "how.step3.desc": "Complete quizzes and assignments, and get feedback from your teacher.",
  "how.step4.title": "Earn your certificate",
  "how.step4.desc": "Finish the course to unlock badges and a downloadable certificate.",

  // Learning paths
  "paths.eyebrow": "Learning paths",
  "paths.title": "Follow a guided roadmap",
  "paths.subtitle": "Not sure where to begin? These paths sequence courses so each step builds on the last.",
  "paths.explore": "Explore path",
  "paths.frontend.title": "Frontend Developer",
  "paths.frontend.level": "Beginner → Job ready",
  "paths.frontend.i1": "HTML, CSS & responsive layouts",
  "paths.frontend.i2": "JavaScript fundamentals",
  "paths.frontend.i3": "React & state management",
  "paths.frontend.i4": "Portfolio project",
  "paths.backend.title": "Backend Developer",
  "paths.backend.level": "Intermediate",
  "paths.backend.i1": "APIs & REST design",
  "paths.backend.i2": "Databases and SQL",
  "paths.backend.i3": "Auth & security basics",
  "paths.backend.i4": "Deployment workflow",
  "paths.data.title": "Data & AI",
  "paths.data.level": "Intermediate → Advanced",
  "paths.data.i1": "Python for data",
  "paths.data.i2": "Data analysis & visualization",
  "paths.data.i3": "Machine learning basics",
  "paths.data.i4": "Capstone project",

  // Teach
  "teach.eyebrow": "For teachers",
  "teach.title1": "Share what you know on",
  "teach.subtitle":
    "Publish courses, host live sessions, grade assignments and grow your own learning community — all from one dashboard.",
  "teach.cta": "Start teaching",
  "teach.build.title": "Build your course",
  "teach.build.desc": "Create modules, lessons, quizzes and upload resources with a simple editor.",
  "teach.live.title": "Teach live",
  "teach.live.desc": "Run built-in live classes with camera, screen share, chat and recordings.",
  "teach.track.title": "Track results",
  "teach.track.desc": "See enrollments, progress and student performance in your analytics dashboard.",

  // FAQ
  "faq.eyebrow": "FAQ",
  "faq.title": "Frequently asked questions",
  "faq.q1": "Is ShikkhaHub free to use?",
  "faq.a1":
    "You can create an account and browse published courses for free. Individual teachers decide what content they publish on the platform.",
  "faq.q2": "Do I get a certificate?",
  "faq.a2":
    "Yes. When you complete all lessons in a course, a downloadable certificate is generated in your Achievements page along with any badges you earned.",
  "faq.q3": "How do live classes work?",
  "faq.a3":
    "Teachers schedule a live class from the course page. When it starts, you join directly in the browser — no extra app or external meeting link needed. Recordings are available afterwards.",
  "faq.q4": "Can I ask questions while learning?",
  "faq.a4":
    "Every course has discussions, and the community forum is open for career advice and technical help. Enrolled students can also use the AI course assistant.",
  "faq.q5": "Can I teach on ShikkhaHub?",
  "faq.a5":
    "Yes. Sign up and request a teacher account to build courses, host live classes, and grade assignments from the teacher dashboard.",

  // CTA
  "cta.title1": "Ready to start your",
  "cta.titleHighlight": "coding journey",
  "cta.subtitle": "Join thousands of developers learning new skills every day.",
  "cta.button": "Get Started Free",

  // Footer
  "footer.tagline": "Learn to code with expert-led courses, live classes, and a thriving developer community.",
  "footer.platform": "Platform",
  "footer.browseCourses": "Browse Courses",
  "footer.account": "Account",
  "footer.signUp": "Sign Up",
  "footer.logIn": "Log In",
  "footer.company": "Company",
  "footer.about": "About",
  "footer.contact": "Contact",
  "footer.privacy": "Privacy Policy",
  "footer.rights": "All rights reserved.",
  "footer.built": "Built with ❤️ for developers",
};

const bn: Record<keyof typeof en, string> = {
  // Nav
  "nav.explore": "অন্বেষণ",
  "nav.learn": "শেখা",
  "nav.allCourses": "সব কোর্স",
  "nav.beginner": "নতুনদের জন্য",
  "nav.advanced": "অ্যাডভান্সড ট্র্যাক",
  "nav.popular": "সর্বাধিক জনপ্রিয়",
  "nav.newest": "নতুন যোগ হয়েছে",
  "nav.categories": "বিভাগসমূহ",
  "nav.courses": "কোর্স",
  "nav.community": "কমিউনিটি",
  "nav.forum": "আলোচনা ফোরাম",
  "nav.career": "ক্যারিয়ার পরামর্শ",
  "nav.help": "সহায়তা চাই",
  "nav.leaderboard": "লিডারবোর্ড",
  "nav.achievements": "অর্জন",
  "nav.myLearning": "আমার শেখা",
  "nav.dashboard": "ড্যাশবোর্ড",
  "nav.myCourses": "আমার কোর্স",
  "nav.bookmarks": "বুকমার্ক",
  "nav.liveClasses": "লাইভ ক্লাস",
  "nav.certificates": "সার্টিফিকেট ও ব্যাজ",
  "nav.teach": "শিক্ষকতা",
  "nav.teachOn": "শিক্ষাহাবে পড়ান",
  "nav.analytics": "বিশ্লেষণ",
  "nav.admin": "অ্যাডমিন প্যানেল",
  "nav.profile": "প্রোফাইল",
  "nav.signIn": "সাইন ইন",
  "nav.signOut": "সাইন আউট",
  "nav.getStarted": "শুরু করুন",

  // Categories
  "cat.web": "ওয়েব ডেভেলপমেন্ট",
  "cat.programming": "প্রোগ্রামিং",
  "cat.mobile": "মোবাইল অ্যাপ",
  "cat.data": "ডেটা সায়েন্স",
  "cat.ai": "এআই ও মেশিন লার্নিং",
  "cat.devops": "ডেভঅপস ও ক্লাউড",
  "cat.design": "ইউআই/ইউএক্স ডিজাইন",
  "cat.cs": "কম্পিউটার সায়েন্স",

  // Hero
  "hero.badge": "ডেভেলপারদের জন্য শেখার প্ল্যাটফর্ম",
  "hero.title1": "কোডিং শিখুন",
  "hero.title2": "সাথে",
  "hero.titleHighlight": "বিশেষজ্ঞদের",
  "hero.subtitle":
    "ইন্টারঅ্যাক্টিভ কোর্স, লাইভ ক্লাস, হাতে-কলমে প্রজেক্ট এবং একটি সক্রিয় কমিউনিটি — একজন দক্ষ ডেভেলপার হতে যা যা দরকার সব এক জায়গায়।",
  "hero.cta1": "ফ্রি শেখা শুরু করুন",
  "hero.cta2": "কোর্স দেখুন",
  "hero.statCourses": "কোর্স",
  "hero.statStudents": "শিক্ষার্থী",
  "hero.statLive": "লাইভ ক্লাস",

  // Featured
  "featured.eyebrow": "জনপ্রিয়",
  "featured.title": "নির্বাচিত কোর্স",
  "featured.viewAll": "সব দেখুন",
  "featured.viewAllCourses": "সব কোর্স দেখুন",

  // Categories section
  "categories.eyebrow": "ব্রাউজ",
  "categories.title": "বিভাগ অনুযায়ী দেখুন",
  "categories.subtitle": "একটি ট্র্যাক বেছে নিয়ে একেবারে শুরু থেকে শিখুন, অথবা সরাসরি অ্যাডভান্সড বিষয়ে যান।",

  // Features
  "features.eyebrow": "সুবিধাসমূহ",
  "features.title1": "দক্ষতা বাড়াতে যা যা",
  "features.titleHighlight": "প্রয়োজন",
  "features.subtitle": "শেখা, শেখানো এবং একসাথে তৈরি করার সম্পূর্ণ প্ল্যাটফর্ম।",
  "features.courses.title": "সুবিন্যস্ত কোর্স",
  "features.courses.desc": "গোছানো মডিউল ও লেসনে শিখুন — ভিডিও, আর্টিকেল এবং ডাউনলোডযোগ্য রিসোর্স।",
  "features.live.title": "লাইভ ক্লাস",
  "features.live.desc": "স্ক্রিন শেয়ার, হোয়াইটবোর্ড ও প্রশ্নোত্তরসহ রিয়েল-টাইম ভিডিও ক্লাসে যোগ দিন।",
  "features.interactive.title": "ইন্টারঅ্যাক্টিভ কনটেন্ট",
  "features.interactive.desc": "কোড ব্লক, সিনট্যাক্স হাইলাইট ও উদাহরণসহ সুন্দরভাবে সাজানো আর্টিকেল পড়ুন।",
  "features.quiz.title": "অ্যাসাইনমেন্ট ও কুইজ",
  "features.quiz.desc": "প্রজেক্ট জমা দিন, কুইজ দিন এবং শিক্ষকের বিস্তারিত মন্তব্য ও নম্বর পান।",
  "features.badges.title": "ব্যাজ ও সার্টিফিকেট",
  "features.badges.desc": "কোর্স শেষ করে অর্জনের ব্যাজ ও ডাউনলোডযোগ্য সার্টিফিকেট পান।",
  "features.forum.title": "কমিউনিটি ফোরাম",
  "features.forum.desc": "জ্ঞান শেয়ার করুন, ক্যারিয়ার পরামর্শ নিন এবং অন্য ডেভেলপারদের সাথে আলোচনা করুন।",

  // How it works
  "how.eyebrow": "কীভাবে কাজ করে",
  "how.title": "চার ধাপে শুরু থেকে সার্টিফিকেট",
  "how.step1.title": "অ্যাকাউন্ট খুলুন",
  "how.step1.desc": "ফ্রিতে সাইন আপ করে এক মিনিটেই আপনার প্রোফাইল তৈরি করুন।",
  "how.step2.title": "ভর্তি হয়ে শিখুন",
  "how.step2.desc": "লেসন, আর্টিকেল ও লাইভ ক্লাসসহ গোছানো মডিউল অনুসরণ করুন।",
  "how.step3.title": "অভ্যাস ও জমা দিন",
  "how.step3.desc": "কুইজ ও অ্যাসাইনমেন্ট শেষ করুন এবং শিক্ষকের মতামত নিন।",
  "how.step4.title": "সার্টিফিকেট নিন",
  "how.step4.desc": "কোর্স শেষ করলেই ব্যাজ ও ডাউনলোডযোগ্য সার্টিফিকেট আনলক হবে।",

  // Learning paths
  "paths.eyebrow": "লার্নিং পাথ",
  "paths.title": "গাইডেড রোডম্যাপ অনুসরণ করুন",
  "paths.subtitle": "কোথা থেকে শুরু করবেন বুঝতে পারছেন না? এই পাথগুলোতে প্রতিটি ধাপ আগের ধাপের উপর গড়ে ওঠে।",
  "paths.explore": "পাথ দেখুন",
  "paths.frontend.title": "ফ্রন্টএন্ড ডেভেলপার",
  "paths.frontend.level": "নতুন → চাকরির উপযোগী",
  "paths.frontend.i1": "এইচটিএমএল, সিএসএস ও রেসপন্সিভ লেআউট",
  "paths.frontend.i2": "জাভাস্ক্রিপ্টের মৌলিক বিষয়",
  "paths.frontend.i3": "রিঅ্যাক্ট ও স্টেট ম্যানেজমেন্ট",
  "paths.frontend.i4": "পোর্টফোলিও প্রজেক্ট",
  "paths.backend.title": "ব্যাকএন্ড ডেভেলপার",
  "paths.backend.level": "মধ্যম স্তর",
  "paths.backend.i1": "এপিআই ও REST ডিজাইন",
  "paths.backend.i2": "ডেটাবেজ ও এসকিউএল",
  "paths.backend.i3": "অথেন্টিকেশন ও নিরাপত্তার মূল বিষয়",
  "paths.backend.i4": "ডিপ্লয়মেন্ট প্রক্রিয়া",
  "paths.data.title": "ডেটা ও এআই",
  "paths.data.level": "মধ্যম → অ্যাডভান্সড",
  "paths.data.i1": "ডেটার জন্য পাইথন",
  "paths.data.i2": "ডেটা বিশ্লেষণ ও ভিজ্যুয়ালাইজেশন",
  "paths.data.i3": "মেশিন লার্নিংয়ের মূল বিষয়",
  "paths.data.i4": "ক্যাপস্টোন প্রজেক্ট",

  // Teach
  "teach.eyebrow": "শিক্ষকদের জন্য",
  "teach.title1": "আপনার জ্ঞান শেয়ার করুন",
  "teach.subtitle":
    "কোর্স প্রকাশ করুন, লাইভ ক্লাস নিন, অ্যাসাইনমেন্ট মূল্যায়ন করুন এবং নিজের শেখার কমিউনিটি গড়ে তুলুন — সবই এক ড্যাশবোর্ড থেকে।",
  "teach.cta": "শেখানো শুরু করুন",
  "teach.build.title": "কোর্স তৈরি করুন",
  "teach.build.desc": "সহজ এডিটরে মডিউল, লেসন, কুইজ তৈরি করুন ও রিসোর্স আপলোড করুন।",
  "teach.live.title": "লাইভ পড়ান",
  "teach.live.desc": "ক্যামেরা, স্ক্রিন শেয়ার, চ্যাট ও রেকর্ডিংসহ বিল্ট-ইন লাইভ ক্লাস নিন।",
  "teach.track.title": "ফলাফল দেখুন",
  "teach.track.desc": "বিশ্লেষণ ড্যাশবোর্ডে ভর্তি, অগ্রগতি ও শিক্ষার্থীর ফলাফল দেখুন।",

  // FAQ
  "faq.eyebrow": "সাধারণ প্রশ্ন",
  "faq.title": "প্রায়শই জিজ্ঞাসিত প্রশ্ন",
  "faq.q1": "শিক্ষাহাব ব্যবহার করা কি ফ্রি?",
  "faq.a1":
    "আপনি ফ্রিতে অ্যাকাউন্ট খুলে প্রকাশিত কোর্সগুলো দেখতে পারবেন। কোন কনটেন্ট প্রকাশ করা হবে তা প্রতিটি শিক্ষক নিজে ঠিক করেন।",
  "faq.q2": "আমি কি সার্টিফিকেট পাব?",
  "faq.a2":
    "হ্যাঁ। কোর্সের সব লেসন শেষ করলে আপনার অর্জন পেজে ডাউনলোডযোগ্য সার্টিফিকেট এবং অর্জিত ব্যাজগুলো তৈরি হয়ে যাবে।",
  "faq.q3": "লাইভ ক্লাস কীভাবে হয়?",
  "faq.a3":
    "শিক্ষক কোর্স পেজ থেকে লাইভ ক্লাসের সময় ঠিক করেন। ক্লাস শুরু হলে আপনি সরাসরি ব্রাউজারেই যোগ দিতে পারবেন — বাড়তি কোনো অ্যাপ বা বাইরের লিংক লাগবে না। পরে রেকর্ডিংও পাওয়া যায়।",
  "faq.q4": "শেখার সময় প্রশ্ন করা যাবে?",
  "faq.a4":
    "প্রতিটি কোর্সে আলোচনার সুযোগ আছে, আর কমিউনিটি ফোরামে ক্যারিয়ার ও কৌশলগত সহায়তা পাওয়া যায়। ভর্তি হওয়া শিক্ষার্থীরা এআই সহকারীও ব্যবহার করতে পারেন।",
  "faq.q5": "আমি কি শিক্ষাহাবে পড়াতে পারি?",
  "faq.a5":
    "হ্যাঁ। সাইন আপ করে শিক্ষক অ্যাকাউন্টের অনুরোধ করুন, এরপর শিক্ষক ড্যাশবোর্ড থেকে কোর্স তৈরি, লাইভ ক্লাস ও মূল্যায়ন করতে পারবেন।",

  // CTA
  "cta.title1": "শুরু করতে প্রস্তুত আপনার",
  "cta.titleHighlight": "কোডিং যাত্রা",
  "cta.subtitle": "প্রতিদিন নতুন দক্ষতা শেখা হাজারো ডেভেলপারের সাথে যোগ দিন।",
  "cta.button": "ফ্রিতে শুরু করুন",

  // Footer
  "footer.tagline": "বিশেষজ্ঞ শিক্ষকের কোর্স, লাইভ ক্লাস ও সক্রিয় ডেভেলপার কমিউনিটির সাথে কোডিং শিখুন।",
  "footer.platform": "প্ল্যাটফর্ম",
  "footer.browseCourses": "কোর্স দেখুন",
  "footer.account": "অ্যাকাউন্ট",
  "footer.signUp": "সাইন আপ",
  "footer.logIn": "লগ ইন",
  "footer.company": "প্রতিষ্ঠান",
  "footer.about": "আমাদের সম্পর্কে",
  "footer.contact": "যোগাযোগ",
  "footer.privacy": "গোপনীয়তা নীতি",
  "footer.rights": "সর্বস্বত্ব সংরক্ষিত।",
  "footer.built": "ডেভেলপারদের জন্য ❤️ দিয়ে তৈরি",
};

export type TranslationKey = keyof typeof en;

export const translations: Record<Language, Record<TranslationKey, string>> = { en, bn };
