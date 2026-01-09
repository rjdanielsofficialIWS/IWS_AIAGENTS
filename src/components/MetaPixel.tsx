import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export function MetaPixel() {
  useEffect(() => {
    if (window.fbq) return;

    !(function (f: any, b, e, v, n?, t?, s?) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n!.callMethod
          ? n!.callMethod.apply(n, arguments)
          : n!.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n!.push = n!;
      n!.loaded = true;
      n!.version = "2.0";
      n!.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode!.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq!("init", "1954584425463444");
    window.fbq!("track", "PageView");
  }, []);

  return null;
}