import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToHash = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const id = decodeURIComponent(location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  return null;
};

export default ScrollToHash;