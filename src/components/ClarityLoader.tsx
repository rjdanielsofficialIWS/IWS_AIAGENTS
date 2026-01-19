import { useEffect } from "react";

declare global {
  interface Window {
    clarity?: (...args: any[]) => void;
  }
}

export function ClarityLoader() {
  useEffect(() => {
    const clarityId = import.meta.env.VITE_CLARITY_ID as string | undefined;
    if (!clarityId) return;

    // Prevent double load
    if (document.querySelector('script[data-clarity="true"]')) return;

    (function (c: any, l: Document, a: string, r: string, i: string) {
      c[a] =
        c[a] ||
        function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
      const t = l.createElement(r);
      t.setAttribute("data-clarity", "true");
      (t as HTMLScriptElement).async = true;
      (t as HTMLScriptElement).src = "https://www.clarity.ms/tag/" + i;
      const y = l.getElementsByTagName(r)[0];
      y.parentNode?.insertBefore(t, y);
    })(window, document, "clarity", "script", clarityId);
  }, []);

  return null;
}