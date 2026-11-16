import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { GraduationCap, Menu, ChevronDown, Search } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { primaryWorkspace } from "@/features/auth/workspaces";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/shared/ThemeToggle";
import LanguageToggle from "@/components/shared/LanguageToggle";
import GlobalSearch from "@/components/shared/GlobalSearch";
import NotificationBell from "@/features/notifications/NotificationBell";

function HeaderContent() {
  const { user, profile, roles, hasRole, signOut } = useAuth();
  const { t, lang } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 1280px)");
    const close = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);
  const bn = lang === "bn";
  const workspace = primaryWorkspace(roles);
  const workspaceName = hasRole("admin")
    ? t("nav.adminShort")
    : hasRole("teacher")
      ? bn
        ? "শিক্ষাদান"
        : "Teaching workspace"
      : t("nav.dashboard");
  const publicLinks = [
    ["/courses", t("nav.courses")],
    ["/tutors", t("nav.tutors")],
    ["/community", t("nav.community")],
    ["/about", bn ? "আমাদের সম্পর্কে" : "About us"],
  ];
  const workspaceLinks = [
    [workspace, workspaceName],
    ...(hasRole("admin") && hasRole("teacher")
      ? [["/dashboard?tab=teaching", bn ? "শিক্ষাদান" : "Teaching workspace"]]
      : []),
    [
      "/dashboard?tab=learning",
      hasRole("admin") || hasRole("teacher")
        ? bn
          ? "আমার শেখা"
          : "My learning"
        : t("nav.myCourses"),
    ],
    ["/dashboard?tab=bookmarks", t("nav.bookmarks")],
    ["/dashboard?tab=live", t("nav.liveClasses")],
    ["/certificates", t("nav.certificates")],
    ...(hasRole("teacher") ? [["/analytics", t("nav.analytics")]] : []),
  ];
  const link = ([href, label]: string[]) => (
    <Link
      key={href}
      to={href}
      onClick={() => setOpen(false)}
      aria-current={
        location.pathname + location.search === href ? "page" : undefined
      }
      className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted aria-[current=page]:bg-secondary"
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4"
      >
        {bn ? "মূল বিষয়বস্তুতে যান" : "Skip to content"}
      </a>
      <div className="container mx-auto flex h-20 items-center gap-4 px-4">
        <Link
          to="/"
          aria-label="ShikkhaHub home"
          className="mr-auto flex shrink-0 items-center gap-2 font-bold text-xl"
        >
          <GraduationCap className="h-8 w-8 text-primary" />
          ShikkhaHub
        </Link>
        <nav
          aria-label={bn ? "প্রধান নেভিগেশন" : "Main navigation"}
          className="hidden items-center gap-1 xl:flex"
        >
          {publicLinks.map(link)}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  {hasRole("admin") || hasRole("teacher")
                    ? workspaceName
                    : t("nav.myLearning")}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {workspaceLinks.map(([href, label]) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link to={href}>{label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost">
              <Link to="/auth?tab=signup&role=teacher">{t("nav.teach")}</Link>
            </Button>
          )}
        </nav>
        <div className="hidden items-center gap-1 xl:flex">
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={bn ? "সার্চ খুলুন" : "Open search"}
              >
                <Search className="h-5 w-5" />
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
              <Dialog.Content
                aria-describedby={undefined}
                className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border bg-background p-5 shadow-lg"
              >
                <Dialog.Title className="mb-4 text-lg font-semibold">
                  {bn
                    ? "কোর্স ও কমিউনিটিতে খুঁজুন"
                    : "Search courses and community"}
                </Dialog.Title>
                <GlobalSearch key={user?.id || "guest"} />
                <Dialog.Close asChild>
                  <Button variant="outline" className="mt-4">
                    {bn ? "বন্ধ করুন" : "Close search"}
                  </Button>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <LanguageToggle />
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  aria-label="Account menu"
                  className="max-w-36 truncate"
                >
                  {profile?.full_name?.split(" ")[0] || t("nav.user")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={workspace}>{workspaceName}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">{t("nav.profile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/achievements">{t("nav.achievements")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link to="/auth">{t("nav.signIn")}</Link>
            </Button>
          )}
        </div>
        <NotificationBell key={user?.id || "guest"} />
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="xl:hidden"
              aria-label={t("nav.openMenu")}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay
              data-testid="mobile-menu-overlay"
              className="fixed inset-0 z-50 bg-black/50"
            />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-x-3 top-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-lg"
            >
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title className="font-semibold">
                  {t("nav.navigation")}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <Button variant="ghost">{t("nav.closeMenu")}</Button>
                </Dialog.Close>
              </div>
              <GlobalSearch key={user?.id || "guest"} />
              <div className="flex gap-2 py-3">
                <LanguageToggle />
                <ThemeToggle />
              </div>
              <nav className="flex flex-col gap-1">
                {publicLinks.map(link)}
                {link(["/leaderboard", t("nav.leaderboard")])}
                {user ? (
                  <>
                    <p className="mt-3 border-t pt-4 text-xs uppercase text-muted-foreground">
                      {bn ? "কর্মক্ষেত্র" : "Your workspace"}
                    </p>
                    {workspaceLinks.map(link)}
                    {link(["/achievements", t("nav.achievements")])}
                    {link(["/profile", t("nav.profile")])}
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => void signOut()}
                    >
                      {t("nav.signOut")}
                    </Button>
                  </>
                ) : (
                  link(["/auth", t("nav.signIn")])
                )}
                {!hasRole("teacher") &&
                  !hasRole("admin") &&
                  link(["/auth?tab=signup&role=teacher", t("nav.teachOn")])}
                {link(["/faq", bn ? "সাহায্য" : "Help & FAQ"])}
              </nav>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}
export default function Header() {
  const location = useLocation();
  const { user, roles } = useAuth();
  return (
    <HeaderContent
      key={`${location.key}:${user?.id ?? "guest"}:${roles.join(",")}`}
    />
  );
}
