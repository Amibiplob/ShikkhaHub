import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">CodeCampus</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Learn to code with expert-led courses, live classes, and a thriving developer community.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Platform</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/courses" className="hover:text-foreground transition-colors">Browse Courses</Link></li>
            <li><Link to="/auth" className="hover:text-foreground transition-colors">Sign Up</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Resources</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><span className="hover:text-foreground transition-colors cursor-pointer">Documentation</span></li>
            <li><span className="hover:text-foreground transition-colors cursor-pointer">Community</span></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><span className="hover:text-foreground transition-colors cursor-pointer">About</span></li>
            <li><span className="hover:text-foreground transition-colors cursor-pointer">Contact</span></li>
          </ul>
        </div>
      </div>
      <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CodeCampus. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
