import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, ChevronDown, Send } from 'lucide-react';
import { supabase } from '../services/vapiAI';

const GOLD = '#D6B25E';
const GOLD_L = '#F0D27C';
const GOLD_D = '#8F6B1E';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  escalated?: boolean;
}

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;
  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? '';
}

export function SupportChat({ userId, isActive }: { userId: string | null; isActive: boolean }) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);
  const textareaRef           = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hi! I'm your Infinite Media support agent. I have full access to your account — posts, usage, connected platforms, and billing. What can I help you with?",
      }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isActive || !userId) return null;

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const updated: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: updated.map(m => ({ role: m.role, content: m.content })),
          }),
        }
      );
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, escalated: data.escalated }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again in a moment.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your internet and try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Support"
          style={{
            position: 'fixed', bottom: 24, right: 24,
            width: 52, height: 52, borderRadius: '50%',
            background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 20px ${GOLD}55`,
            zIndex: 9990,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.07)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          <MessageCircle size={22} color="#000" />
        </button>
      )}

      {open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 360, height: 520,
          background: 'rgba(12,10,7,0.98)',
          border: `1px solid ${GOLD}35`,
          borderRadius: 18,
          display: 'flex', flexDirection: 'column',
          zIndex: 9990,
          boxShadow: `0 12px 60px rgba(0,0,0,0.7), 0 0 0 1px ${GOLD}15`,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '13px 16px',
            borderBottom: `1px solid ${GOLD}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `linear-gradient(135deg, ${GOLD}12, transparent)`,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MessageCircle size={16} color="#000" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Support</div>
                <div style={{ fontSize: 11, color: GOLD_L, lineHeight: 1.2 }}>AI-powered · Always available</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.35)', display: 'flex' }}
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '84%',
                  padding: '9px 13px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user'
                    ? `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`
                    : 'rgba(255,255,255,0.07)',
                  border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  fontSize: 13, lineHeight: 1.55,
                  color: msg.role === 'user' ? '#000' : 'rgba(255,255,255,0.87)',
                  fontWeight: msg.role === 'user' ? 600 : 400,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.content}
                  {msg.escalated && (
                    <div style={{
                      marginTop: 8, paddingTop: 8,
                      borderTop: `1px solid ${GOLD}30`,
                      fontSize: 11, color: GOLD_L,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <span>✓</span> Support team notified via Telegram
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '14px 14px 14px 4px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%', background: GOLD,
                        animation: `sc-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: `1px solid ${GOLD}18`,
            display: 'flex', gap: 8, alignItems: 'flex-end',
            flexShrink: 0,
            background: 'rgba(255,255,255,0.02)',
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Describe your issue…"
              rows={1}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '8px 12px',
                color: 'rgba(255,255,255,0.88)',
                fontSize: 13, lineHeight: 1.5,
                resize: 'none', outline: 'none',
                fontFamily: 'inherit',
                overflowY: 'auto',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: input.trim() && !loading
                  ? `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`
                  : 'rgba(255,255,255,0.07)',
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              <Send size={15} color={input.trim() && !loading ? '#000' : 'rgba(255,255,255,0.25)'} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes sc-pulse {
          0%, 100% { opacity: 0.25; transform: scale(0.75); }
          50%       { opacity: 1;    transform: scale(1);    }
        }
      `}</style>
    </>
  );
}
