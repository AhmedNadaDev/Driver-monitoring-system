import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react'

/* ── Static initial messages ──────────────────────────────────────────── */
const INITIAL_MESSAGES = [
  {
    id: 'welcome-1',
    role: 'bot',
    text: "Hi! I'm your Driver Monitoring Assistant. Ask me anything about trips, violations, safety scores, or fleet management.",
    ts: new Date(),
  },
  {
    id: 'welcome-2',
    role: 'bot',
    text: "This chatbot will be connected to a RAG (Retrieval-Augmented Generation) engine in a future update — giving you real-time insights directly from your fleet's data.",
    ts: new Date(),
  },
]

/* ── Canned demo responses ────────────────────────────────────────────── */
const DEMO_RESPONSES = [
  "I'm currently running in demo mode. RAG backend integration is coming soon!",
  "Great question! Once connected to the backend, I'll be able to answer based on your real fleet data.",
  "That's an interesting query. The RAG engine will allow me to pull relevant data from your trips and violations database.",
  "I can see you're asking about fleet analytics. Full backend integration will unlock real-time answers.",
  "Thanks for testing the chatbot! This response is a placeholder — live data answers are on the way.",
]

let demoIdx = 0
const nextDemoResponse = () => {
  const msg = DEMO_RESPONSES[demoIdx % DEMO_RESPONSES.length]
  demoIdx++
  return msg
}

/* ── Helpers ──────────────────────────────────────────────────────────── */
const fmt = (date) =>
  date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

/* ── Message bubble ───────────────────────────────────────────────────── */
function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-primary to-blue-700'
            : 'bg-gradient-to-br from-violet-500 to-purple-700'
        }`}
      >
        {isUser
          ? <User className="h-4 w-4 text-white" />
          : <Bot  className="h-4 w-4 text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={`group max-w-[75%] sm:max-w-[60%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'rounded-br-sm bg-primary text-primary-foreground'
              : 'rounded-bl-sm bg-card border border-border/50 text-foreground'
          }`}
        >
          {msg.typing ? (
            <span className="flex items-center gap-1 py-0.5">
              <span className="h-2 w-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0ms]" />
              <span className="h-2 w-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:300ms]" />
            </span>
          ) : (
            msg.text
          )}
        </div>
        {!msg.typing && (
          <span className="text-[10px] text-muted-foreground/60 px-1">
            {fmt(msg.ts)}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Quick-prompt chips ───────────────────────────────────────────────── */
const QUICK_PROMPTS = [
  'Show top violations today',
  "What's the fleet avg score?",
  'Which driver has most trips?',
  'Explain safety scoring',
]

/* ── Page ─────────────────────────────────────────────────────────────── */
const ChatbotPage = () => {
  const [messages,  setMessages]  = useState(INITIAL_MESSAGES)
  const [input,     setInput]     = useState('')
  const [thinking,  setThinking]  = useState(false)
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const messagesRef = useRef(null)

  /* Scroll to bottom on every new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text ?? input).trim()
      if (!trimmed || thinking) return

      setInput('')
      const userMsg = { id: `u-${Date.now()}`, role: 'user', text: trimmed, ts: new Date() }
      const typingMsg = { id: 'typing', role: 'bot', typing: true, ts: new Date() }

      setMessages((prev) => [...prev, userMsg, typingMsg])
      setThinking(true)

      /* Simulate network delay for demo */
      await new Promise((r) => setTimeout(r, 900 + Math.random() * 600))

      const botMsg = {
        id:   `b-${Date.now()}`,
        role: 'bot',
        text: nextDemoResponse(),
        ts:   new Date(),
      }

      setMessages((prev) => prev.filter((m) => m.id !== 'typing').concat(botMsg))
      setThinking(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    },
    [input, thinking]
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage()
  }

  const handleReset = () => {
    setMessages(INITIAL_MESSAGES)
    setInput('')
    demoIdx = 0
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden animate-fade-up">
      {/* ── Header bar ───────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl bg-card border border-border/40 px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">Fleet AI Assistant</p>
            <p className="text-[11px] text-muted-foreground">
              RAG-powered · <span className="text-amber-500 font-medium">Demo mode</span>
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          title="Reset conversation"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Messages area ────────────────────────────────────────────── */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto space-y-4 px-1 py-4 min-h-0"
      >
        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick prompts ─────────────────────────────────────────────── */}
      {messages.length <= 3 && (
        <div className="shrink-0 mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Quick prompts
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                disabled={thinking}
                className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 px-4 py-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              /* Auto-resize */
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask anything about your fleet… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={thinking}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed py-1 max-h-[120px] overflow-y-auto disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            {thinking
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </form>
        <p className="px-4 pb-2.5 text-[10px] text-muted-foreground/50 leading-tight">
          Demo mode — RAG backend integration coming soon. Responses are placeholder only.
        </p>
      </div>
    </div>
  )
}

export default ChatbotPage
