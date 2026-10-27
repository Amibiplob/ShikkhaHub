import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "./LanguageContext";
import { useLanguage } from "@/hooks/useLanguage";
import { en, bn } from "@/lib/translations";

const Probe = () => {
  const { lang, t, toggleLang } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="text">{t("nav.courses")}</span>
      <span data-testid="missing">{t("does.not.exist")}</span>
      <button onClick={toggleLang}>toggle</button>
    </div>
  );
};

describe("LanguageContext", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to English and toggles to Bangla", () => {
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("text")).toHaveTextContent(en["nav.courses"]);
    fireEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("lang")).toHaveTextContent("bn");
    expect(screen.getByTestId("text")).toHaveTextContent(bn["nav.courses"]);
    expect(localStorage.getItem("shikkhahub-lang")).toBe("bn");
    expect(document.documentElement.lang).toBe("bn");
  });

  it("restores saved language and falls back to the key", () => {
    localStorage.setItem("shikkhahub-lang", "bn");
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang")).toHaveTextContent("bn");
    expect(screen.getByTestId("missing")).toHaveTextContent("does.not.exist");
  });

  it("throws outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow();
    spy.mockRestore();
  });
});
