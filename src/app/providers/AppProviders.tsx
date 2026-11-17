import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "./ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/features/auth/AuthContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <Toaster />
            {children}
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
