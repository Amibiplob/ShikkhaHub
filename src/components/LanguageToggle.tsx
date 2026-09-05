import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const LanguageToggle = ({ className }: { className?: string }) => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className={className}
      aria-label={language === "en" ? "Switch to Bangla" : "ইংরেজিতে পরিবর্তন করুন"}
      title={language === "en" ? "Switch to Bangla" : "Switch to English"}
    >
      <Languages className="mr-1.5 h-4 w-4" />
      <span className="text-xs font-semibold">{language === "en" ? "বাংলা" : "EN"}</span>
    </Button>
  );
};

export default LanguageToggle;
