import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToHash = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    let id: string;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    // Route chunks and user-scoped data may arrive after the first frame.
    const scroll = () => {
      const target = document.getElementById(id);
      if (!target) return false;
      target.scrollIntoView({ behavior: "auto", block: "start" });
      if (target.hasAttribute("tabindex")) target.focus({ preventScroll: true });
      return true;
    };
    if (scroll()) return;
    const observer = new MutationObserver(() => { if (scroll()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 10_000);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [location.pathname, location.hash]);

  return null;
};

export default ScrollToHash;
