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
    <div className="grid grid-cols-12 gap-6">
      {/* Hero */}
      <div className="col-span-12 py-5">
        <p className="label-bracket mb-3">
          AI Mentor
          {source && (
            <span className="ml-3 opacity-60">
              {source === "ollama" ? "• ollama_ai" : "• smart_fallback"}
            </span>
          )}
        </p>
        <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">
          Coach Chat
        </h1>
      </div>

      {/* Chat Panel */}
      <div className="panel col-span-12 flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
        <div className="panel-header">
          <span className="label-bracket">conversation</span>
          <h2 className="panel-title">AI Coach</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-3 mb-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-[var(--cs-accent-light)] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[var(--cs-accent)]" />
                </div>
              )}
              <div className={msg.role === "user" ? "msg msg-user" : "msg msg-ai"} style={{ whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="avatar w-8 h-8 text-xs shrink-0">
                  <User className="w-3.5 h-3.5 text-black" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--cs-accent-light)] flex items-center justify-center">
                <Bot className="w-4 h-4 text-[var(--cs-accent)]" />
              </div>
              <div className="msg msg-ai flex gap-1 px-4 py-3">
                <span className="w-1.5 h-1.5 bg-[var(--cs-accent)] rounded-full opacity-40 animate-pulse" />
                <span className="w-1.5 h-1.5 bg-[var(--cs-accent)] rounded-full opacity-40 animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-[var(--cs-accent)] rounded-full opacity-40 animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div className="mb-4">
            <div className="label-bracket mb-2">quick_questions</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-sm px-4 py-2 rounded-full border border-[var(--cs-border)] bg-transparent text-[var(--text-muted)] cursor-pointer transition-all hover:border-[var(--cs-accent)] hover:text-[var(--cs-accent)]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask coach..."
            className="chat-input-field"
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="btn-send" style={{ opacity: (!input.trim() || loading) ? 0.3 : 1 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
