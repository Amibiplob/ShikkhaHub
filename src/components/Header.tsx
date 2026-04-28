import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarChart3, BookOpen, GraduationCap, LayoutDashboard, LogOut, Medal, Menu, MessageSquare, Shield, Trophy, User, X } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";

const Header = () => {
  const { user, profile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">
          Shikkha<span className="text-gradient-primary">Hub</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/courses">
            <Button variant="ghost" size="sm">
              <BookOpen className="mr-1.5 h-4 w-4" /> Courses
            </Button>
          </Link>
          <Link to="/community">
            <Button variant="ghost" size="sm">
              <MessageSquare className="mr-1.5 h-4 w-4" /> Community
            </Button>
          </Link>
          {user && (
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
              </Button>
            </Link>
          )}
          {user && hasRole("teacher") && (
            <Link to="/analytics">
              <Button variant="ghost" size="sm">
                <BarChart3 className="mr-1.5 h-4 w-4" /> Analytics
              </Button>
            </Link>
          )}
          {user && hasRole("admin") && (
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <Shield className="mr-1.5 h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <GlobalSearch />
          <Link to="/leaderboard">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Medal className="h-4 w-4" />
            </Button>
          </Link>
          <NotificationBell />
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
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
                  <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/achievements")}>
                  <Trophy className="mr-2 h-4 w-4" /> Achievements
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-2">
            <Link to="/courses" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <BookOpen className="mr-2 h-4 w-4" /> Courses
              </Button>
            </Link>
            <Link to="/community" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" /> Community
              </Button>
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </Button>
                </Link>
                {hasRole("teacher") && (
                  <Link to="/analytics" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                    </Button>
                  </Link>
                )}
                {hasRole("admin") && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Shield className="mr-2 h-4 w-4" /> Admin
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-gradient-primary text-primary-foreground">Sign in</Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
