import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuLabel,
DropdownMenuSeparator,
DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
Award,
BarChart3,
Bookmark,
BookOpen,
Braces,
Brain,
Briefcase,
ChevronDown,
Clock,
Compass,
Database,
Flame,
Globe,
GraduationCap,
LayoutDashboard,
LifeBuoy,
LogOut,
Map,
Medal,
Menu,
MessageSquare,
Palette,
Radio,
Rocket,
Server,
Shield,
Smartphone,
Sparkles,
Trophy,
User,
Video,
X,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "@/components/shared/ThemeToggle";
import NotificationBell from "@/features/notifications/NotificationBell";
import GlobalSearch from "@/components/shared/GlobalSearch";
import LanguageToggle from "@/components/shared/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";

const categories = [
  { icon: Globe, label: "Web Development", key: "cat.web" },
  { icon: Braces, label: "Programming", key: "cat.programming" },
  { icon: Smartphone, label: "Mobile", key: "cat.mobileShort" },
  { icon: Database, label: "Data Science", key: "cat.data" },
  { icon: Brain, label: "AI", key: "cat.aiShort" },
  { icon: Server, label: "DevOps", key: "cat.devopsShort" },
  { icon: Palette, label: "Design", key: "cat.designShort" },
];

const Header = () => {
  const { user, profile, signOut, hasRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (path: string) => location.pathname.startsWith(path);

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const goHomeSection = (id: string) => {
    setMobileOpen(false);
    navigate(`/#${id}`);
    if (location.pathname === "/") {
      window.requestAnimationFrame(() =>
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  };

  return (
    <header className="sticky top-0 z-50 px-3 pt-3">
      <div className="glass container mx-auto flex h-16 items-center justify-between rounded-lg border border-border px-4 shadow-md">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Shikkha<span className="text-gradient-primary">Hub</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 xl:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Compass className="mr-1.5 h-4 w-4" /> {t("nav.explore")}
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>{t("nav.learn")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate("/tutors")}>
                {t("nav.tutors")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/courses")}>
                <BookOpen className="mr-2 h-4 w-4" /> {t("nav.allCourses")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/courses?level=beginner")}
              >
                <Sparkles className="mr-2 h-4 w-4" /> {t("nav.beginner")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/courses?level=advanced")}
              >
                <Rocket className="mr-2 h-4 w-4" /> {t("nav.advanced")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/courses?sort=popular")}
              >
                <Flame className="mr-2 h-4 w-4" /> {t("nav.popular")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/courses?sort=newest")}
              >
                <Clock className="mr-2 h-4 w-4" /> {t("nav.newest")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("nav.categories")}</DropdownMenuLabel>
              {categories.map((c) => (
                <DropdownMenuItem
                  key={c.label}
                  onClick={() =>
                    navigate(`/courses?category=${encodeURIComponent(c.label)}`)
                  }
                >
                  <c.icon className="mr-2 h-4 w-4" /> {t(c.key)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            asChild
            variant={isActive("/courses") ? "secondary" : "ghost"}
            size="sm"
          >
            <Link to="/courses">
              <BookOpen className="mr-1.5 h-4 w-4" /> {t("nav.courses")}
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="hidden xl:inline-flex"
            onClick={() => goHomeSection("learning-paths")}
          >
            <Map className="mr-1.5 h-4 w-4" /> {t("nav.paths")}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="hidden xl:inline-flex"
            onClick={() => goHomeSection("live-learning")}
          >
            <Radio className="mr-1.5 h-4 w-4" /> {t("nav.live")}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={
                  isActive("/community") ||
                  isActive("/leaderboard") ||
                  isActive("/achievements")
                    ? "secondary"
                    : "ghost"
                }
                size="sm"
              >
                <MessageSquare className="mr-1.5 h-4 w-4" />{" "}
                {t("nav.community")}
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/community")}>
                <MessageSquare className="mr-2 h-4 w-4" /> {t("nav.forum")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/community?category=career")}
              >
                <Briefcase className="mr-2 h-4 w-4" /> {t("nav.career")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/community?category=programming")}
              >
                <LifeBuoy className="mr-2 h-4 w-4" /> {t("nav.help")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/leaderboard")}>
                <Medal className="mr-2 h-4 w-4" /> {t("nav.leaderboard")}
              </DropdownMenuItem>
              {user && (
                <DropdownMenuItem onClick={() => navigate("/achievements")}>
                  <Trophy className="mr-2 h-4 w-4" /> {t("nav.achievements")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isActive("/dashboard") ? "secondary" : "ghost"}
                  size="sm"
                >
                  <LayoutDashboard className="mr-1.5 h-4 w-4" />{" "}
                  {t("nav.myLearning")}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />{" "}
                  {t("nav.dashboard")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/dashboard?tab=learning")}
                >
                  <BookOpen className="mr-2 h-4 w-4" /> {t("nav.myCourses")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/dashboard?tab=bookmarks")}
                >
                  <Bookmark className="mr-2 h-4 w-4" /> {t("nav.bookmarks")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/dashboard?tab=live")}
                >
                  <Video className="mr-2 h-4 w-4" /> {t("nav.liveClasses")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/achievements")}>
                  <Award className="mr-2 h-4 w-4" /> {t("nav.certificates")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user && (hasRole("teacher") || hasRole("admin")) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={
                    isActive("/analytics") || isActive("/admin")
                      ? "secondary"
                      : "ghost"
                  }
                  size="sm"
                >
                  <GraduationCap className="mr-1.5 h-4 w-4" /> {t("nav.teach")}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <BookOpen className="mr-2 h-4 w-4" /> {t("nav.myCourses")}
                </DropdownMenuItem>
                {hasRole("teacher") && (
                  <DropdownMenuItem onClick={() => navigate("/analytics")}>
                    <BarChart3 className="mr-2 h-4 w-4" /> {t("nav.analytics")}
                  </DropdownMenuItem>
                )}
                {hasRole("admin") && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4" /> {t("nav.admin")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!(user && (hasRole("teacher") || hasRole("admin"))) && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth?tab=signup&role=teacher">
                <GraduationCap className="mr-1.5 h-4 w-4" /> {t("nav.teach")}
              </Link>
            </Button>
          )}
        </nav>

        <div className="hidden items-center gap-1 xl:flex">
          <div className="hidden 2xl:block">
            <GlobalSearch key={user?.id || "guest"} />
          </div>
          <LanguageToggle />
          <NotificationBell key={user?.id || "guest"} />
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Account menu"
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">
                    {profile?.full_name || t("nav.user")}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />{" "}
                  {t("nav.dashboard")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" /> {t("nav.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/achievements")}>
                  <Trophy className="mr-2 h-4 w-4" /> {t("nav.achievements")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">{t("nav.signIn")}</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                <Link to="/auth?tab=signup">{t("nav.getStarted")}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="xl:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="container mx-auto mt-1 rounded-lg border border-border bg-background p-4 shadow-lg xl:hidden">
          <nav className="flex flex-col gap-2">
            <GlobalSearch key={user?.id || "guest"} />
            <div className="flex items-center gap-2 py-2">
              <LanguageToggle />
              <ThemeToggle />
              <NotificationBell key={user?.id || "guest"} />
            </div>
            <p className="px-3 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("nav.explore")}
            </p>
            <Link to="/courses" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <BookOpen className="mr-2 h-4 w-4" /> {t("nav.courses")}
              </Button>
            </Link>
            <Link
              to="/courses?level=beginner"
              onClick={() => setMobileOpen(false)}
            >
              <Button variant="ghost" className="w-full justify-start">
                <Sparkles className="mr-2 h-4 w-4" /> {t("nav.beginner")}
              </Button>
            </Link>
            <Link
              to="/courses?level=advanced"
              onClick={() => setMobileOpen(false)}
            >
              <Button variant="ghost" className="w-full justify-start">
                <Rocket className="mr-2 h-4 w-4" /> {t("nav.advanced")}
              </Button>
            </Link>
            <Link
              to="/courses?sort=popular"
              onClick={() => setMobileOpen(false)}
            >
              <Button variant="ghost" className="w-full justify-start">
                <Flame className="mr-2 h-4 w-4" /> {t("nav.popular")}
              </Button>
            </Link>
            <div className="flex flex-wrap gap-2 px-3 py-1">
              {categories.map((c) => (
                <Link
                  key={c.label}
                  to={`/courses?category=${encodeURIComponent(c.label)}`}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                >
                  {t(c.key)}
                </Link>
              ))}
            </div>
            <Link to="/community" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" /> {t("nav.community")}
              </Button>
            </Link>
            <Link to="/leaderboard" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <Medal className="mr-2 h-4 w-4" /> {t("nav.leaderboard")}
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => goHomeSection("learning-paths")}
            >
              <Map className="mr-2 h-4 w-4" /> {t("nav.paths")}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => goHomeSection("live-learning")}
            >
              <Radio className="mr-2 h-4 w-4" /> {t("nav.live")}
            </Button>
            {user && (
              <Link to="/certificates" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <Trophy className="mr-2 h-4 w-4" /> {t("nav.achievements")}
                </Button>
              </Link>
            )}
            {!(user && (hasRole("teacher") || hasRole("admin"))) && (
              <Link to="/auth?tab=signup" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <GraduationCap className="mr-2 h-4 w-4" /> {t("nav.teachOn")}
                </Button>
              </Link>
            )}

            {user ? (
              <>
                <Link to="/tutors" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    {t("nav.tutors")}
                  </Button>
                </Link>
                <p className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("nav.myLearning")}
                </p>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <LayoutDashboard className="mr-2 h-4 w-4" />{" "}
                    {t("nav.dashboard")}
                  </Button>
                </Link>
                <Link
                  to="/dashboard?tab=bookmarks"
                  onClick={() => setMobileOpen(false)}
                >
                  <Button variant="ghost" className="w-full justify-start">
                    <Bookmark className="mr-2 h-4 w-4" /> {t("nav.bookmarks")}
                  </Button>
                </Link>
                <Link
                  to="/dashboard?tab=live"
                  onClick={() => setMobileOpen(false)}
                >
                  <Button variant="ghost" className="w-full justify-start">
                    <Video className="mr-2 h-4 w-4" /> {t("nav.liveClasses")}
                  </Button>
                </Link>
                <Link to="/profile" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="mr-2 h-4 w-4" /> {t("nav.profile")}
                  </Button>
                </Link>

                {hasRole("teacher") && (
                  <Link to="/analytics" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <BarChart3 className="mr-2 h-4 w-4" />{" "}
                      {t("nav.analytics")}
                    </Button>
                  </Link>
                )}
                {hasRole("admin") && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Shield className="mr-2 h-4 w-4" /> {t("nav.adminShort")}
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={signOut}
                >
                  <LogOut className="mr-2 h-4 w-4" /> {t("nav.signOut")}
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-gradient-primary text-primary-foreground">
                  {t("nav.signIn")}
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
