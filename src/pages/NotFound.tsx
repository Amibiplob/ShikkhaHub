import { Link } from "react-router-dom";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return <PageShell title="404" description="We couldn't find this page. The link may have changed."><div className="flex flex-wrap gap-3"><Button asChild><Link to="/courses">Explore Courses</Link></Button><Button asChild variant="outline"><Link to="/">Return to Home</Link></Button><Button asChild variant="ghost"><Link to="/contact">Get help</Link></Button></div></PageShell>;
}
