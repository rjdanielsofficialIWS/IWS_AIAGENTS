// Lightweight analytics helpers for GA4 + Meta Pixel.
// Goal: track high-intent actions (calls, demo clicks, form submits, bookings) with minimal code.

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

export const GA4_MEASUREMENT_ID = "G-7924SG627M";

export type AnalyticsParams = Record<string, any>;

export function trackGA(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

export function trackMeta(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window.fbq !== "function") return;
  window.fbq("track", eventName, params);
}

export function trackMetaCustom(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window.fbq !== "function") return;
  window.fbq("trackCustom", eventName, params);
}

export function trackPageView(path: string) {
  // GA4 SPA pageviews
  if (typeof window.gtag === "function") {
    window.gtag("config", GA4_MEASUREMENT_ID, {
      page_path: path,
    });
  }
}

export function trackHighIntent(action: {
  name:
    | "cta_click"
    | "demo_click"
    | "book_click"
    | "phone_click"
    | "form_submit"
    | "form_success"
    | "scroll_75"
    | "engaged_45s";
  label?: string;
  value?: number;
  path?: string;
}) {
  const base = {
    event_category: "engagement",
    event_label: action.label,
    value: action.value,
    page_path: action.path,
  };

  switch (action.name) {
    case "phone_click":
      trackGA("contact", { ...base, method: "phone" });
      trackMeta("Contact", { content_name: action.label });
      break;

    case "book_click":
      trackGA("begin_checkout", { ...base, method: "booking" });
      trackMeta("Schedule", { content_name: action.label });
      break;

    case "demo_click":
      trackGA("view_item", { ...base, item_name: action.label || "demo" });
      trackMeta("ViewContent", { content_name: action.label || "demo" });
      break;

    case "form_submit":
      trackGA("generate_lead", { ...base, status: "submitted" });
      // NOTE: We do NOT fire Meta Lead here (only on success).
      break;

    case "form_success":
      trackGA("generate_lead", { ...base, status: "success" });
      trackMeta("Lead", { content_name: action.label || "lead_form" });
      break;

    case "scroll_75":
      trackGA("scroll", { ...base, percent_scrolled: 75 });
      trackMetaCustom("Scroll75", { content_name: action.label, page_path: action.path });
      break;

    case "engaged_45s":
      trackGA("user_engagement", { ...base, engagement_time_msec: 45000 });
      trackMetaCustom("Engaged45s", { content_name: action.label, page_path: action.path });
      break;

    case "cta_click":
    default:
      trackGA("select_content", { ...base, content_type: "cta" });
      trackMetaCustom("CTAClick", { content_name: action.label, page_path: action.path });
      break;
  }
}