import { createContext } from "react";
import type { Lang } from "@/lib/translations";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: string) => string;
};

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
