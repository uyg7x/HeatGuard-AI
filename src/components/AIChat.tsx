// ============================================================
// HeatGuard AI — AIChat Agent Component
// Real-time SSE streaming CoE Gateway proxy with action parsing
// ============================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, RefreshCw, Zap, Shield, Flame, FileText, Clock } from 'lucide-react';
import { ChatMessage, FortyGuardTemperatureData, AgentAction } from '../lib/types';

interface AIChatProps {
  data: FortyGuardTemperatureData | null;
  onAction: (action: AgentAction) => void;
  cityId?: string;
}

const SUGGESTIONS = [
  "What's the heat risk right now?",
  'Show me the safest route home',
  'Find nearest cooling shelter',
  'Generate an emergency report',
  'Which facilities are most at risk?',
];

const clean = (r: string) => (r && r.trim().startsWith('<!') ? '⚡ AI gateway unreachable — please try again in a minute.' : r);

const AIChat: React.FC<AIChatProps> = ({ data, onAction, cityId = 'dallas' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0 && data) {
      setMessages([{
        id: 'sys-welcome',
        role: 'assistant',
        content: `I'm the HeatGuard AI Agent. Current conditions in ${data.location || 'your area'} are ${data.temperature?.value?.toFixed(1) ?? '—'}°F (${(data.risk_level || 'unknown').toUpperCase()}). Ask me about safe routes, cooling shelters, or emergency protocols.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestampMs: Date.now(),
      }]);
    }
  }, [data, messages.length]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampMs: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);
    setLoading(true);

    const assistantMsgId = `a-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampMs: Date.now(),
      streaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const apiMessages = [
        ...messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content },
      ];

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          cityId, // ← multi-city: route handler builds a live table for all 4 cities
          model: 'qwen3.6',
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        const raw = json.content || json.reply || json.error || '';
        const { cleanContent, actions } = parseActions(raw);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: clean(cleanContent || raw), streaming: false, actions }
              : m
          )
        );
        actions.forEach((a) => onAction(a));
        return;
      }

      if (!res.ok) {
        let errJson: any;
        try {
          errJson = await res.json();
        } catch {
          errJson = { error: `Request failed with HTTP ${res.status}` };
        }
        throw new Error(errJson?.error || `Request failed (${res.status})`);
      }

      if (!res.body) {
        throw new Error('Response body is null');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawText = '';
      let accumulatedCleanText = '';
      let detectedActions: AgentAction[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const jsonStr = trimmed.slice(6);
              const parsed = JSON.parse(jsonStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content || '';
              if (deltaContent) {
                rawText += deltaContent;
                const { cleanContent, actions } = parseActions(rawText);
                accumulatedCleanText = cleanContent;
                detectedActions = actions;

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: accumulatedCleanText, actions: detectedActions }
                      : m
                  )
                );
              }
            } catch {
              // Plain string chunk handling
              rawText += line;
              const { cleanContent, actions } = parseActions(rawText);
              accumulatedCleanText = cleanContent;
              detectedActions = actions;

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: accumulatedCleanText, actions: detectedActions }
                    : m
                )
              );
            }
          } else {
            // Direct SSE text stream
            rawText += line;
            const { cleanContent, actions } = parseActions(rawText);
            accumulatedCleanText = cleanContent;
            detectedActions = actions;

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: accumulatedCleanText, actions: detectedActions }
                  : m
              )
            );
          }
        }
      }

      // Finalize message
      const { cleanContent, actions } = parseActions(rawText);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: cleanContent || rawText, streaming: false, actions }
            : m
        )
      );

      actions.forEach((a) => onAction(a));
    } catch (e: any) {
      const errText = e?.message || 'AI request failed';
      setError(errText);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `⚠️ ${errText}`, streaming: false }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-red-100 border border-orange-200">
          <Sparkles className="w-5 h-5 text-orange-600" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">HeatGuard AI Agent</h3>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Powered by Qwen3.6 · {data?.location || 'Hyperlocal'}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 live-pulse-ring" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Online
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 px-1" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-2 p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 slide-up">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700 p-1">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Prompt Suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s)}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-full bg-white hover:bg-orange-50 border border-slate-200 text-[10px] text-slate-600 hover:text-orange-600 transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        className="flex items-center gap-2 pt-2 border-t border-slate-200"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask HeatGuard AI about safe routes, cooling shelters, or risk..."
          disabled={loading}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm focus:outline-none focus:border-orange-500 disabled:opacity-50 text-slate-900 placeholder:text-slate-400"
          aria-label="Chat input"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
          aria-label="Send message"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const Icon = isUser ? User : Bot;

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border ${
        isUser ? 'bg-blue-100 border-blue-200 text-blue-600' : 'bg-gradient-to-br from-orange-100 to-red-100 border-orange-200 text-orange-600'
      }`}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${
        isUser ? 'bg-orange-500 text-white border border-orange-500' : 'bg-slate-100 text-slate-800 border border-slate-200'
      }`}>
        <div className="text-xs leading-relaxed whitespace-pre-wrap break-words">
          {clean(message.content)}
          {message.streaming && message.content === '' && (
            <span className="inline-flex gap-1 items-center ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
        
        <div className={`flex items-center justify-between mt-2 pt-1 border-t text-[9px] ${
          isUser ? 'border-white/20 text-white/80' : 'border-slate-200 text-slate-500'
        }`}>
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {message.timestamp}
          </span>
        </div>

        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.actions.map((a, i) => (
              <ActionChip key={i} action={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ActionChip: React.FC<{ action: AgentAction }> = ({ action }) => {
  const map = {
    SAFE: { icon: <Shield className="w-3 h-3" />, label: 'Safe Route Activated', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    FAST: { icon: <Zap className="w-3 h-3" />, label: 'Fast Route Activated', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    ALERT: { icon: <Flame className="w-3 h-3" />, label: 'Alert Triggered', color: 'bg-red-50 text-red-700 border-red-200' },
    EXPORT: { icon: <FileText className="w-3 h-3" />, label: 'Export Initiated', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  };
  const meta = map[action.type];
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 border ${meta.color}`}>
      {meta.icon} {meta.label}
    </span>
  );
};

function parseActions(text: string): { cleanContent: string; actions: AgentAction[] } {
  const actions: AgentAction[] = [];
  const actionRegex = /\[ACTION:(SAFE|FAST|ALERT|EXPORT)\]/g;
  let match: RegExpExecArray | null;
  while ((match = actionRegex.exec(text)) !== null) {
    actions.push({ type: match[1] as AgentAction['type'] });
  }
  const cleanContent = text.replace(actionRegex, '').trim();
  return { cleanContent, actions };
}

export default AIChat;
