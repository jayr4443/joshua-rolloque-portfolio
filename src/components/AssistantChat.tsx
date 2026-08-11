import { FormEvent, useRef, useState, useEffect } from 'react';
import { Bot, Send, Sparkles, User } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';

const SUGGESTIONS = [
  'What can Joshua build?',
  'Tell me about the POS system',
  'How do payments work?',
  'What is his tech stack?',
];

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Joshua's AI assistant, running on a Groq/OpenAI-powered edge function. Ask me about his work in commerce, warehouse, POS, APIs, or AI integrations.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(event?: FormEvent, text?: string) {
    event?.preventDefault();
    const message = (text ?? input).trim();
    if (!message || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: message };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          message,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = await response.json();
      const reply = data.reply || data.error || 'Sorry, I could not process that.';
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'I had trouble connecting. Please try again, or use the contact form below to reach Joshua directly.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="assistant-demo">
      <div className="assistant-header">
        <span className="assistant-badge"><Bot size={14} /> LIVE AI ASSISTANT</span>
        <span className="assistant-model">Groq · OpenAI edge function</span>
      </div>
      <div className="assistant-messages" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.role}`}>
            <div className="msg-avatar">
              {msg.role === 'assistant' ? <Bot size={15} /> : <User size={15} />}
            </div>
            <div className="msg-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="msg assistant">
            <div className="msg-avatar"><Bot size={15} /></div>
            <div className="msg-typing"><span /><span /><span /></div>
          </div>
        )}
      </div>
      <div className="assistant-suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(undefined, s)} disabled={loading}>{s}</button>
        ))}
      </div>
      <form className="assistant-input" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Joshua's work..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
      <div className="assistant-footnote">
        <Sparkles size={12} /> Grounded in Joshua's actual experience — system-only context, no hallucinated claims.
      </div>
    </div>
  );
}
