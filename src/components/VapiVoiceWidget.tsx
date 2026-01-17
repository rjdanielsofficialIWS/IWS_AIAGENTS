import React from "react";
import { createPortal } from "react-dom";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "vapi-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "public-key"?: string;
        "assistant-id"?: string;
        mode?: string;
        theme?: string;
        size?: string;
        radius?: string;
        position?: string;
        "base-color"?: string;
        "accent-color"?: string;
        "button-base-color"?: string;
        "button-accent-color"?: string;
        "main-label"?: string;
        "start-button-text"?: string;
        "end-button-text"?: string;
        "empty-voice-message"?: string;
        "show-transcript"?: string;
        "assistant-overrides"?: string;
      };
    }
  }
}

type Props = {
  publicKey: string;
  assistantId: string;
  firstMessage: string;
};

export function VapiVoiceWidget({ publicKey, assistantId, firstMessage }: Props) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // Load widget script once
    const existing = document.querySelector(
      'script[data-vapi-embed="true"]'
    ) as HTMLScriptElement | null;

    if (!existing) {
      const script = document.createElement("script");
      script.src =
        "https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js";
      script.async = true;
      script.defer = true;
      script.setAttribute("data-vapi-embed", "true");
      document.body.appendChild(script);
    }

    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Most reliable way to set first message: assistant overrides (supported in widget embed)
  const assistantOverrides = JSON.stringify({
    firstMessage,
  });

  // IMPORTANT:
  // Portal -> renders into document.body, avoiding ALL homepage overflow/transform clipping.
  return createPortal(
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 999999,
        pointerEvents: "auto",
      }}
    >
      <vapi-widget
        public-key={publicKey}
        assistant-id={assistantId}
        mode="voice"
        theme="dark"
        size="compact"
        radius="large"
        position="bottom-right"
        base-color="#050607"
        accent-color="#FFD24A"
        button-base-color="#050607"
        button-accent-color="#49B6FF"
        main-label="Test Our Voice Agent"
        start-button-text="Start"
        end-button-text="End"
        empty-voice-message="Tap to talk to Avery"
        show-transcript="false"
        assistant-overrides={assistantOverrides}
      />
    </div>,
    document.body
  );
}