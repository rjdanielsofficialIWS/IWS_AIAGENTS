import React, { useEffect, useMemo, useRef, useState } from "react";
import { Phone, PhoneOff, X, Loader2, Mic, MicOff } from "lucide-react";
import Vapi from "@vapi-ai/web";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  publicKey?: string;
  assistantId?: string;
  title?: string;
  subtitle?: string;
};

type CallState = "idle" | "connecting" | "inCall" | "ended" | "error";

export default function VapiPhoneAgentModal({
  isOpen,
  onClose,
  publicKey,
  assistantId,
  title = "Try Our AI Phone Agent",
  subtitle = "Talk to the agent live — it can answer questions and book appointments.",
}: Props) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [error, setError] = useState<string>("");
  const [muted, setMuted] = useState(false);

  const vapiRef = useRef<any>(null);

  const cfg = useMemo(() => {
    const pk = publicKey || (import.meta as any).env?.VITE_VAPI_PUBLIC_KEY;
    const aid = assistantId || (import.meta as any).env?.VITE_VAPI_ASSISTANT_ID;
    return { pk, aid };
  }, [publicKey, assistantId]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      // ensure we stop any active call
      try {
        vapiRef.current?.stop?.();
      } catch {}
      setCallState("idle");
      setError("");
      setMuted(false);
      return;
    }
  }, [isOpen]);

  // Initialize Vapi instance once
  useEffect(() => {
    if (!vapiRef.current) {
      vapiRef.current = new (Vapi as any)(cfg.pk);
    }
  }, [cfg.pk]);

  // Subscribe to events while open
  useEffect(() => {
    if (!isOpen) return;
    const vapi = vapiRef.current;
    if (!vapi) return;

    const onCallStart = () => {
      setCallState("inCall");
      setError("");
    };

    const onCallEnd = () => {
      setCallState("ended");
    };

    const onError = (e: any) => {
      setCallState("error");
      setError(e?.message || "Something went wrong starting the call.");
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("error", onError);
    };
  }, [isOpen]);

  const startCall = async () => {
    setError("");

    if (!cfg.pk) {
      setCallState("error");
      setError("Missing Vapi public key (VITE_VAPI_PUBLIC_KEY).");
      return;
    }
    if (!cfg.aid) {
      setCallState("error");
      setError("Missing Vapi assistant id (VITE_VAPI_ASSISTANT_ID).");
      return;
    }

    try {
      setCallState("connecting");
      await vapiRef.current.start(cfg.aid);
      // call-start event flips state to inCall
    } catch (e: any) {
      setCallState("error");
      setError(e?.message || "Failed to start call.");
    }
  };

  const endCall = () => {
    try {
      vapiRef.current?.stop?.();
    } catch {}
    setCallState("ended");
  };

  const toggleMute = () => {
    try {
      // Vapi client SDK supports mute/unmute in some versions via setMuted / mute
      if (typeof vapiRef.current?.setMuted === "function") {
        vapiRef.current.setMuted(!muted);
      } else if (typeof vapiRef.current?.mute === "function" && typeof vapiRef.current?.unmute === "function") {
        !muted ? vapiRef.current.mute() : vapiRef.current.unmute();
      }
      setMuted((m) => !m);
    } catch {
      // if mute isn't supported in your SDK version, just ignore silently
      setMuted((m) => !m);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Backdrop */}
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden">
          {/* Chrome glow */}
          <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-white/10 via-white/5 to-white/10 blur-2xl opacity-80" />
          <div className="relative p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-extrabold">{title}</div>
                <div className="mt-1 text-sm text-gray-400">{subtitle}</div>
              </div>

              <button
                onClick={onClose}
                className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-gray-200" />
              </button>
            </div>

            {/* Status */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0B0D10]/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-300">
                  Status:{" "}
                  <span className="font-bold text-white">
                    {callState === "idle" && "Ready"}
                    {callState === "connecting" && "Connecting…"}
                    {callState === "inCall" && "In Call"}
                    {callState === "ended" && "Ended"}
                    {callState === "error" && "Error"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#49B6FF]/60" />
                  <div className="text-xs text-gray-400">Voice</div>
                </div>
              </div>

              {error && (
                <div className="mt-3 text-sm text-red-300">
                  {error}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {callState !== "inCall" ? (
                <button
                  onClick={startCall}
                  disabled={callState === "connecting"}
                  className="sm:col-span-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-extrabold bg-[#FFD24A] text-black hover:bg-[#ffdc6a] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {callState === "connecting" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Connecting
                    </>
                  ) : (
                    <>
                      <Phone className="h-5 w-5" />
                      Start Call
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={endCall}
                  className="sm:col-span-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-extrabold bg-white/10 border border-white/10 text-white hover:bg-white/15 transition"
                >
                  <PhoneOff className="h-5 w-5 text-[#FFD24A]" />
                  End Call
                </button>
              )}

              <button
                onClick={toggleMute}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
              >
                {muted ? (
                  <>
                    <MicOff className="h-5 w-5 text-[#49B6FF]" />
                    Muted
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5 text-[#49B6FF]" />
                    Mute
                  </>
                )}
              </button>
            </div>

            {/* Note */}
            <div className="mt-5 text-xs text-gray-500">
              Tip: If your browser asks for microphone permission, click “Allow”.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}