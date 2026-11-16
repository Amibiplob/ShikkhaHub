import { Link } from "react-router-dom";
import PageShell from "@/components/layout/PageShell";
import ProjectTeamSection from "@/features/home/components/ProjectTeamSection";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
export default function About() {
  const { lang } = useLanguage();
  const bn = lang === "bn";
  const items = bn
    ? [
        [
          "আমাদের গল্প",
          "বিচ্ছিন্ন শিক্ষাসামগ্রীকে এক জায়গায় আনার উদ্দেশ্যে সিটি ইউনিভার্সিটির কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং বিভাগের স্নাতক প্রকল্প হিসেবে শিক্ষাহাব তৈরি হয়েছে।",
        ],
        [
          "আমাদের লক্ষ্য",
          "সুসংগঠিত কোর্স, মূল্যায়ন, সরাসরি ক্লাস এবং আলোচনার মাধ্যমে শিক্ষার্থীদের ধাপে ধাপে শিখতে সাহায্য করা।",
        ],
        [
          "আমাদের স্বপ্ন",
          "নিজের গতিতে শেখা এবং শিক্ষক ও সহপাঠীদের সঙ্গে সহযোগিতার একটি সহজ শিক্ষার পরিবেশ।",
        ],
      ]
    : [
        [
          "Our story",
          "ShikkhaHub began as a Computer Science and Engineering degree project at City University, Bangladesh, bringing fragmented learning resources into one place.",
        ],
        [
          "Our mission",
          "Help learners build understanding step by step through structured courses, assessments, live classes and discussion.",
        ],
        [
          "Our vision",
          "A simple learning environment that connects independent study with support from teachers and fellow learners.",
        ],
      ];
  return (
    <PageShell
      title={bn ? "শেখার একটি সহজ পথ" : "A clearer path to learning"}
      description={
        bn
          ? "শিক্ষাহাব সম্পর্কে জানুন"
          : "About ShikkhaHub — courses, conversation and guidance in one place."
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        {items.map(([title, body]) => (
          <section key={title} className="rounded-xl border bg-card p-6">
            <h2 className="mb-3 text-xl font-semibold">{title}</h2>
            <p className="leading-relaxed text-muted-foreground">{body}</p>
          </section>
        ))}
      </div>
      <section className="my-10 max-w-3xl">
        <h2 className="mb-3 text-2xl font-semibold">
          {bn ? "বিশ্ববিদ্যালয় প্রকল্প" : "University project context"}
        </h2>
        <p className="text-muted-foreground">
          {bn
            ? "জুলাই ২০২৬-এর প্রকল্প প্রতিবেদনটি সিটি ইউনিভার্সিটির কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং বিষয়ে স্নাতক ডিগ্রির অংশ হিসেবে জমা দেওয়া হয়েছে। শিক্ষাহাবের কোর্স সমাপ্তির সনদ একটি প্ল্যাটফর্মের রেকর্ড, বিশ্ববিদ্যালয়ের ডিগ্রি নয়।"
            : "The July 2026 project report was submitted toward the B.Sc. in Computer Science and Engineering at City University. ShikkhaHub course certificates record platform course completion; they are not university degrees."}
        </p>
      </section>
      <ProjectTeamSection />
      <Button asChild>
        <Link to="/courses">{bn ? "কোর্স দেখুন" : "Explore Courses"}</Link>
      </Button>
    </PageShell>
  );
}
