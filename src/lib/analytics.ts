/**
 * Google Analytics (gtag.js) loader and event helpers.
 * Measurement ID comes from the linked Google Analytics connector.
 */
declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

const measurementId = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as
  | string
  | undefined;

let initialized = false;

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  if (!measurementId) {
    console.warn("Google Analytics measurement ID is not configured — events will not be sent.");
    return;
  }
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  gtag("config", measurementId);
}

export function trackPageView(path: string) {
  gtag("event", "page_view", { page_path: path });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  gtag("event", name, params);
}
