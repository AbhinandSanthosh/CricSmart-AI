"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "How to face inswing?",
  "Bowling yorker tips",
  "Improve my focus at the crease",
  "How to deal with a loss",
  "Best fielding drills",
  "Building confidence under pressure",
];

export default function MentorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm your CricEye AI Coach. Ask me anything about batting, bowling, fielding, fitness, or the mental game. I'm here to help you improve!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages.slice(-10) }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        setSource(data.source || "");
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Try again!" }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
      {/* Hero */}
      <div style={{ gridColumn: 'span 12', padding: '20px 0' }}>
        <div className="label-bracket" style={{ marginBottom: 12 }}>
          ai_mentor_v2
          {source && (
            <span style={{ marginLeft: 12, opacity: 0.6 }}>
              {source === "ollama" ? "• ollama_ai" : "• smart_fallback"}
            </span>
          )}
        </div>
        <h1 className="hero-title" style={{ fontSize: 48 }}>
          COACH CHAT
        </h1>
      </div>

      {/* Chat Panel */}
      <div className="panel" style={{ gridColumn: 'span 12', height: 'calc(100vh - 280px)', minHeight: 400, display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header">
          <span className="label-bracket">conversation</span>
          <h2 className="panel-title">AI COACH</h2>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 12, marginBottom: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === "assistant" && (
                <div style={{ width: 32, height: 32, borderRadius: 12, background: 'rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot style={{ width: 16, height: 16, color: 'var(--cs-accent)' }} />
                </div>
              )}
              <div className={msg.role === "user" ? "msg msg-user" : "msg msg-ai"} style={{ whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>
                  <User style={{ width: 14, height: 14, color: '#000' }} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 12, background: 'rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot style={{ width: 16, height: 16, color: 'var(--cs-accent)' }} />
              </div>
              <div className="msg msg-ai" style={{ display: 'flex', gap: 4, padding: '12px 16px' }}>
                <span style={{ width: 6, height: 6, background: 'var(--cs-accent)', borderRadius: '50%', opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
                <span style={{ width: 6, height: 6, background: 'var(--cs-accent)', borderRadius: '50%', opacity: 0.4, animation: 'pulse 1.5s infinite 0.15s' }} />
                <span style={{ width: 6, height: 6, background: 'var(--cs-accent)', borderRadius: '50%', opacity: 0.4, animation: 'pulse 1.5s infinite 0.3s' }} />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div style={{ marginBottom: 16 }}>
            <div className="label-bracket" style={{ marginBottom: 8 }}>quick_questions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{ fontSize: 12, padding: '8px 16px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--cs-border-strong)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-ui)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cs-accent)'; e.currentTarget.style.color = 'var(--cs-accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--cs-border-strong)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask coach..."
            className="chat-input-field"
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="btn-send" style={{ opacity: (!input.trim() || loading) ? 0.3 : 1 }}>
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}
