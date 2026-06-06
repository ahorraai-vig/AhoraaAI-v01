import React, { useEffect, useState } from "react";
import { BasicMetrics, ConversationSummary } from "../types";

export default function OperationsPanel() {
  const [metrics, setMetrics] = useState<BasicMetrics | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [mRes, cRes] = await Promise.all([
        fetch("/api/metrics/basic"),
        fetch("/api/conversations"),
      ]);
      if (!mRes.ok || !cRes.ok) throw new Error("No se pudieron cargar metricas o conversaciones.");
      const m = await mRes.json();
      const c = await cRes.json();
      setMetrics(m);
      setConversations(c.conversations || []);
    } catch (e: any) {
      setError(e.message || "Error cargando panel operativo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Operaciones Conversacionales MVP</h3>
        <button onClick={load} className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-100">Actualizar</button>
      </div>

      {error && <div className="p-3 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Conversaciones</p><p className="text-2xl font-bold text-slate-900">{metrics?.totalConversations ?? 0}</p></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Leads</p><p className="text-2xl font-bold text-slate-900">{metrics?.totalLeads ?? 0}</p></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Escalados</p><p className="text-2xl font-bold text-slate-900">{metrics?.totalEscalations ?? 0}</p></div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-700">Conversaciones recientes</div>
        {loading ? <div className="p-4 text-sm text-slate-500">Cargando...</div> : (
          <div className="divide-y divide-slate-100">
            {conversations.length === 0 && <div className="p-4 text-sm text-slate-500">Sin conversaciones todavia.</div>}
            {conversations.map((c) => (
              <div key={c.id} className="p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{c.channel} | agente: {c.lastAgent} {c.escalated ? "| escalado" : ""}</span>
                  <span>{new Date(c.updatedAt).toLocaleString()}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {c.lastMessages.map((m) => (
                    <p key={m.id} className="text-sm text-slate-700"><strong>{m.sender === "user" ? "Cliente" : "Asistente"}:</strong> {m.text}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
