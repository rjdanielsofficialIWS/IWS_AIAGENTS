import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader,
  AlertCircle,
  X,
  Phone,
  PhoneOff,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import { supabase } from '../services/vapiAI';
import Vapi from '@vapi-ai/web';

interface DemoPage {
  slug: string;
  assistant_id: string;
  system_prompt: string;
  first_message: string;
  is_active: boolean;
}

type ChatMsg = { role: 'assistant' | 'user'; content: string };
type ModalMode = 'voice' | 'chat' | null;

const VAPI_PUBLIC_KEY = 'ebb2120b-ac56-4ce9-b1d5-17966931c665';
const CALENDLY_URL = 'https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding';

// Rich luxury gold
const GOLD_PRIMARY = '#D6B25E';
const GOLD_HOVER = '#F0D27C';

const FINE_PRINT =
  'You can connect your own business phone number and update it across your website and profiles at any time.';

export function DynamicDemoPage() {
  const { slug } = useParams<{ slug: string }>();
  const targetSlug = useMemo(() => (slug || 'demo').trim(), [slug]);

  const [demoPage, setDemoPage] = useState<DemoPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalMode>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'live' | 'ended' | 'error'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const displayName = useMemo(
    () =>
      targetSlug
        .split('-')
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' '),
    [targetSlug]
  );

  useEffect(() => {
    const removeVapiWidgets = () => {
      document.querySelectorAll('vapi-widget').forEach((el) => el.remove());
    };
    removeVapiWidgets();
    const obs = new MutationObserver(removeVapiWidgets);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    const fetchPage = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('demo_pages')
          .select('*')
          .eq('slug', targetSlug)
          .eq('is_active', true)
          .maybeSingle();

        if (!alive) return;

        if (!data || error) {
          setError('Demo page not found');
          setDemoPage(null);
          return;
        }

        setDemoPage(data);
        setChatMsgs([{ role: 'assistant', content: data.first_message }]);
      } catch {
        if (alive) setError('Failed to load demo page');
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchPage();
    return () => {
      alive = false;
    };
  }, [targetSlug]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMsgs, chatLoading]);

  useEffect(() => {
    if (modal !== 'voice' || !demoPage?.assistant_id) return;

    const startCall = async () => {
      try {
        setVoiceStatus('connecting');
        vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);
        await vapiRef.current.start(demoPage.assistant_id);
        setVoiceStatus('live');
      } catch {
        setVoiceStatus('error');
      }
    };

    startCall();
    return () => {
      vapiRef.current?.stop();
      vapiRef.current = null;
      setVoiceStatus('idle');
    };
  }, [modal, demoPage]);

  const closeModal = () => {
    vapiRef.current?.stop();
    setModal(null);
    setVoiceStatus('idle');
    setVoiceError(null);
    setChatError(null);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    setChatMsgs((p) => [...p, { role: 'user', content: chatInput }]);
    setChatInput('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader className="h-10 w-10 animate-spin" style={{ color: GOLD_PRIMARY }} />
      </div>
    );
  }

  if (!demoPage || error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <AlertCircle className="h-12 w-12 text-red-400" />
      </div>
    );
  }

  return (
    <div
  className="min-h-screen text-white"
  style={{
    backgroundImage: `
      radial-gradient(
        1200px 600px at 50% -200px,
        rgba(214, 178, 94, 0.22),
        transparent 60%
      ),
      linear-gradient(
        to bottom,
        #2a2a2a,
        #0b0b0b,
        #000000
      )
    `,
  }}
>
      <style>
        {`
          .gold-shine {
            background-image: linear-gradient(
              110deg,
              #b9892b 0%,
              #f7dc8a 20%,
              #ffffff 30%,
              #f1d27b 40%,
              #b9892b 60%,
              #f7dc8a 80%,
              #ffffff 90%,
              #b9892b 100%
            );
            background-size: 240% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: goldShine 3.6s ease-in-out infinite;
          }

          @keyframes goldShine {
            0% { background-position: 0% 50%; }
            60% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @media (prefers-reduced-motion: reduce) {
            .gold-shine { animation: none; }
          }
        `}
      </style>

      <header className="px-6 py-6">
        <Link to="/" className="text-gray-400 hover:text-white flex items-center">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Link>
      </header>

      <main className="max-w-3xl mx-auto text-center px-6 pb-20">
        <h1 className="text-5xl font-extrabold mt-10">
          Hey <span className="gold-shine">{displayName}</span>,
        </h1>

        <p className="mt-6 text-xl text-gray-200">
          I built a tool for you that{' '}
          <span className="font-bold" style={{ color: GOLD_PRIMARY }}>
            answers your customer calls
          </span>{' '}
          for you.
        </p>

        <p className="mt-10 text-lg font-semibold">Choose how you’d like to try it:</p>

        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={() => setModal('voice')}
            className="px-8 py-4 font-bold text-black rounded-2xl inline-flex items-center gap-3"
            style={{ backgroundColor: GOLD_PRIMARY }}
          >
            <Phone className="h-5 w-5" />
            Call Me
          </button>

          <button
            onClick={() => setModal('chat')}
            className="px-8 py-4 font-bold bg-white text-black rounded-2xl inline-flex items-center gap-3"
          >
            <MessageSquare className="h-5 w-5" />
            Text Me
          </button>
        </div>

        <div className="mt-6">
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-bold"
          >
            <Calendar className="h-4 w-4" />
            <span className="gold-shine">Book intro call</span>
          </a>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <button onClick={closeModal} className="absolute top-6 right-6 text-white">
            <X />
          </button>
        </div>
      )}
    </div>
  );
}