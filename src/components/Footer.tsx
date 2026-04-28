import { GraduationCap, Github, Twitter, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container mx-auto px-4 py-14">
      <div className="grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Code<span className="text-gradient-primary">Campus</span>
            </span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Learn to code with expert-led courses, live classes, and a thriving
            developer community.
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="#"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Youtube className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">
            Platform
          </h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>
              <Link
                to="/courses"
                className="hover:text-primary transition-colors"
              >
                Browse Courses
              </Link>
            </li>
            <li>
              <Link
                to="/community"
                className="hover:text-primary transition-colors"
              >
                Community
              </Link>
            </li>
            <li>
              <Link
                to="/leaderboard"
                className="hover:text-primary transition-colors"
              >
                Leaderboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">
            Account
          </h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>
              <Link to="/auth" className="hover:text-primary transition-colors">
                Sign Up
              </Link>
            </li>
            <li>
              <Link to="/auth" className="hover:text-primary transition-colors">
                Log In
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard"
                className="hover:text-primary transition-colors"
              >
                Dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">
            Company
          </h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>
              <span className="hover:text-primary transition-colors cursor-pointer">
                About
              </span>
            </li>
            <li>
              <span className="hover:text-primary transition-colors cursor-pointer">
                Contact
              </span>
            </li>
            <li>
              <span className="hover:text-primary transition-colors cursor-pointer">
                Privacy Policy
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} ShikkhaHub . All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
