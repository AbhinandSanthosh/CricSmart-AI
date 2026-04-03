"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Sparkles } from "lucide-react";

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
        "Hey! I'm your CricSmart AI Coach. Ask me anything about batting, bowling, fielding, fitness, or the mental game. I'm here to help you improve!",
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
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-10),
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        setSource(data.source || "");
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I couldn't process that. Try again!" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          AI Mentor <Sparkles className="w-5 h-5 text-amber" />
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your personal cricket coach{" "}
          {source && (
            <Badge variant="outline" className="text-[10px] ml-1">
              {source === "ollama" ? "Ollama AI" : "Smart Fallback"}
            </Badge>
          )}
        </p>
      </div>

      {/* Chat Area */}
      <Card className="bg-card border-border flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-amber/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-amber" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-amber/20 text-foreground"
                      : "bg-secondary/50 text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-amber" />
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-amber/60 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-amber/60 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-2 h-2 bg-amber/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-amber/50 text-muted-foreground hover:text-amber transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about batting, bowling, fielding, fitness..."
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="bg-amber hover:bg-amber-dark text-black px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
