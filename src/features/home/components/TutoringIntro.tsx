import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
export default function TutoringIntro() {
  const { lang } = useLanguage();
  const bn = lang === "bn";
  return (
    <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-secondary p-6 md:p-8">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold">
          {bn ? "একটু সাহায্য দরকার?" : "Need a little guidance?"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {bn
            ? "শিক্ষকের প্রোফাইল ও সময় দেখুন, তারপর ব্যক্তিগত সেশনের অনুরোধ পাঠান। শিক্ষক নিশ্চিত করলে তা আপনার ড্যাশবোর্ডে দেখা যাবে।"
            : "Find a teacher, check their availability and request a tutoring session. Track your request and confirmation from your dashboard."}
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/tutors">{bn ? "শিক্ষক খুঁজুন" : "Find a Tutor"}</Link>
      </Button>
    </div>
  );
}
