import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Copy, Check, MessageSquare, Send, Play, RefreshCw, AlertCircle } from "lucide-react";

interface PromptViewerProps {
  systemPrompt: string;
  businessName: string;
}

export default function PromptViewer({ systemPrompt, businessName }: PromptViewerProps) {
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      sender: "bot",
      text: `¡Hola! Soy tu asistente virtual de ${businessName}. ¿En qué puedo ayudarte hoy dende Vigo?`,
      timestamp: new Date(),
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCopy = () => {
    navigator.clipboard.writeText(systemPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    setChatError("");
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsSending(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          message: textToSend,
          history: messages.slice(-10), // Send last 10 messages for conversational memory
        }),
      });

      let data: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const errorText = await response.text();
        throw new Error(`Respuesta no válida del servidor (${response.status}): ${errorText.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || "Fallo al contactar con la IA simuladora.");
      }

      const botMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: "bot",
        text: data.reply || "Disculpa, no he podido procesar tu solicitud.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "Error al simular respuesta del bot.");
    } finally {
      setIsSending(false);
    }
  };

  const handlePresetQuestion = (q: string) => {
    handleSendMessage(q);
  };

  const resetChat = () => {
    setMessages([
      {
        id: "initial",
        sender: "bot",
        text: `¡Hola de nuevo! He reiniciado la simulación con tu nuevo de prompt de ${businessName}. Hazme cualquier pregunta comercial.`,
        timestamp: new Date(),
      },
    ]);
    setChatError("");
  };

  return (
    <div id="prompt-viewer-playground" className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-200">
      
      {/* Prompt Code Viewer Column (Left) */}
      <div className="lg:col-span-7 bg-[#12151B] border border-slate-800/60 rounded-2xl p-6 shadow-xl flex flex-col h-[700px]">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4">
          <div>
            <h3 className="text-lg font-sans font-semibold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-indigo-400 rotate-90" />
              Prompt del Sistema Generado
            </h3>
            <p className="text-xs text-slate-400">
              Copia este prompt exacto y desplégalo en tu pasarela de WhatsApp o Chat Web.
            </p>
          </div>
          <button
            type="button"
            id="btn-copy-prompt"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
              copied
                ? "bg-emerald-950 border-emerald-500/60 text-emerald-400"
                : "bg-[#1A1F26] border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-indigo-500 hover:text-white"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar Prompt
              </>
            )}
          </button>
        </div>

        {/* Scrollable Code block */}
        <div className="flex-1 bg-[#0F1115] rounded-xl border border-slate-800/50 p-4 overflow-y-auto font-mono text-xs leading-relaxed select-all">
          <pre className="whitespace-pre-wrap text-emerald-400 font-mono tracking-tight">{systemPrompt}</pre>
        </div>
      </div>

      {/* Interactive Chat Playground Column (Right) */}
      <div className="lg:col-span-5 bg-[#12151B] border border-slate-800/60 rounded-2xl p-6 shadow-xl flex flex-col h-[700px]">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-505 rounded-full animate-pulse"></div>
            <div>
              <h3 className="text-sm font-sans font-semibold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Simulador del Asistente
              </h3>
              <p className="text-[11px] text-slate-400">Prueba el comportamiento en tiempo real</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-restart-chat"
            onClick={resetChat}
            className="p-1 px-2.5 bg-[#1A1F26] hover:bg-slate-800 text-slate-300 border border-slate-705/80 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
            title="Reiniciar chat"
          >
            <RefreshCw className="w-3 h-3" />
            Reiniciar
          </button>
        </div>

        {/* Dynamic Warning Alert on Escalation */}
        <div className="bg-[#0F1115]/80 border border-indigo-900/30 p-3 rounded-xl mb-3 flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-slate-300 font-sans">
            <strong className="text-white">Garantía Anti-Alucinación:</strong> Pregunta alguna consulta de servicio que no exista en tu prompt (ej. <em>"¿tenéis masajes con barro?"</em>) para verificar cómo deriva amablemente al humano sin inventarse nada.
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto bg-[#0F1115] rounded-xl border border-slate-800/60 p-4 space-y-4 mb-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col max-w-[85%] ${
                m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <div
                className={`p-3 rounded-2xl text-xs font-sans tracking-wide leading-relaxed shadow-md ${
                  m.sender === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                    : "bg-[#1A1F26] text-slate-200 rounded-tl-none border border-slate-800/50"
                }`}
              >
                {m.text}
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">
                {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
          {isSending && (
            <div className="flex items-center gap-1.5 bg-[#1A1F26] border border-slate-800/50 p-3 rounded-2xl rounded-tl-none max-w-[85%] text-xs text-slate-400">
              <span className="flex gap-1 animate-pulse-subtle">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
              </span>
              <span>Asistente escribiendo dende Vigo...</span>
            </div>
          )}
          {chatError && (
            <div className="text-xs bg-red-950/60 text-red-400 border border-red-900/40 p-2 rounded-xl text-center">
              {chatError}
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Suggestion Quick Chips */}
        <div id="playground-quick-chips" className="flex flex-wrap gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => handlePresetQuestion("¿Cuáles son vuestros horarios de apertura?")}
            className="text-[10px] bg-[#1A1F26] hover:bg-slate-800 text-slate-300 border border-slate-700/40 rounded-full px-2.5 py-1 text-left transition-all"
          >
            📅 Horarios
          </button>
          <button
            type="button"
            onClick={() => handlePresetQuestion("¿Qué platos o servicios ofrecéis y qué precios tienen?")}
            className="text-[10px] bg-[#1A1F26] hover:bg-slate-800 text-slate-300 border border-slate-700/40 rounded-full px-2.5 py-1 text-left transition-all"
          >
            💰 Servicios / Precios
          </button>
          <button
            type="button"
            onClick={() => handlePresetQuestion("¿Tenéis algún servicio no mencionado como peinar con hilos de oro?")}
            className="text-[10px] bg-[#1A1F26] hover:bg-indigo-950/20 hover:text-indigo-450 border border-slate-700/45 rounded-full px-2.5 py-1 text-left transition-all"
            title="Prueba de anti-hallucinación"
          >
            ⚠️ Probar Alucinación
          </button>
        </div>

        {/* Chat input form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            id="chat-user-input"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isSending}
            required
            placeholder="Introduce tu pregunta como cliente..."
            className="flex-1 bg-[#0F1115] border border-slate-800/85 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none placeholder-slate-600 transition-all font-sans"
          />
          <button
            type="submit"
            id="chat-send-submit"
            disabled={isSending || !inputVal.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#1A1F26] disabled:text-slate-600 text-white p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md hover:shadow-indigo-550/10"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
