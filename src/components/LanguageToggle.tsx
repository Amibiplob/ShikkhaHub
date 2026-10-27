import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

const LanguageToggle = () => {
  const { lang, toggleLang, t } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLang}
      aria-label={t("lang.switch")}
      title={t("lang.switch")}
      className="h-9 gap-1.5 px-2 font-semibold"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs">{lang === "en" ? "বাং" : "EN"}</span>
    </Button>
  );
};

export default LanguageToggle;
