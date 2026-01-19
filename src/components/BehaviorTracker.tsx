import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackHighIntent } from "../lib/analytics";

// Tracks:
// - 45s engaged time
// - 75% scroll depth
// - Click-to-call (tel:)
// - Booking clicks (Calendly)
// - Generic CTA clicks via data-track / data-track-label attributes
export function BehaviorTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname + location.search;

    // -------- Engaged time --------
    const engagedTimer = window.setTimeout(() => {
      trackHighIntent({ name: "engaged_45s", label: "engaged_45s", path });
    }, 45_000);

    // -------- Scroll depth --------
    let firedScroll75 = false;
    const onScroll = () => {
      if (firedScroll75) return;
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      if (height <= 0) return;
      const pct = (scrollTop / height) * 100;
      if (pct >= 75) {
        firedScroll75 = true;
        trackHighIntent({ name: "scroll_75", label: "scroll_75", path });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // -------- Click tracking --------
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const el = target.closest<HTMLElement>("a,button,[data-track]");
      if (!el) return;

      const label = el.getAttribute("data-track-label") || el.textContent?.trim() || "";
      const trackType = el.getAttribute("data-track") || "";

      // tel: links
      if (el.tagName.toLowerCase() === "a") {
        const href = (el as HTMLAnchorElement).getAttribute("href") || "";
        if (href.startsWith("tel:")) {
          trackHighIntent({ name: "phone_click", label: href.replace("tel:", ""), path });
          return;
        }
        // Calendly / booking links
        if (href.includes("calendly.com")) {
          trackHighIntent({ name: "book_click", label: "calendly", path });
          return;
        }
      }

      // Explicit tracking types via data-track
      if (trackType === "demo") {
        trackHighIntent({ name: "demo_click", label: label || "demo", path });
        return;
      }
      if (trackType === "book") {
        trackHighIntent({ name: "book_click", label: label || "book", path });
        return;
      }
      if (trackType === "cta") {
        trackHighIntent({ name: "cta_click", label: label || "cta", path });
        return;
      }
    };
    document.addEventListener("click", onClick, true);

    return () => {
      window.clearTimeout(engagedTimer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
    };
  }, [location.pathname, location.search]);

  return null;
}