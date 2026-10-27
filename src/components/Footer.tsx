import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Shikkha<span className="text-gradient-primary">Hub</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t("footer.tagline")}
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              {t("footer.platform")}
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link
                  to="/courses"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.browse")}
                </Link>
              </li>
              <li>
                <Link
                  to="/tutors"
                  className="hover:text-primary transition-colors"
                >
                  {t("nav.tutors")}
                </Link>
              </li>
              <li>
                <Link
                  to="/#project-team"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.about")}
                </Link>
              </li>
              <li>
                <Link
                  to="/community"
                  className="hover:text-primary transition-colors"
                >
                  {t("nav.community")}
                </Link>
              </li>
              <li>
                <Link
                  to="/leaderboard"
                  className="hover:text-primary transition-colors"
                >
                  {t("nav.leaderboard")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              {t("footer.account")}
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link
                  to="/auth?tab=signup"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.signUp")}
                </Link>
              </li>
              <li>
                <Link
                  to="/auth"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.logIn")}
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="hover:text-primary transition-colors"
                >
                  {t("nav.dashboard")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              Support & learning
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link
                  to="/#learning-paths"
                  className="hover:text-primary transition-colors"
                >
                  {t("nav.paths")}
                </Link>
              </li>
              <li>
                <Link
                  to="/#live-learning"
                  className="hover:text-primary transition-colors"
                >
                  {t("nav.liveClasses")}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-primary">
                  FAQs
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-primary">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link to="/certificates" className="hover:text-primary">
                  My Certificates
                </Link>
              </li>
              <li>
                <Link
                  to="/achievements"
                  className="hover:text-primary transition-colors"
                >
                  {t("nav.certificates")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} ShikkhaHub. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
