import React, { useState, useEffect } from "react";
import { BrainConfig } from "../types";
import { DEFAULT_BRAIN_CONFIG } from "../lib/aiProvider";
import { Cpu, Server, Globe, CheckCircle2, AlertTriangle, RefreshCw, Zap } from "lucide-react";

interface BrainConfigSelectorProps {
  onConfigChange: (config: BrainConfig) => void;
}

export default function BrainConfigSelector({ onConfigChange }: BrainConfigSelectorProps) {
  const [config, setConfig] = useState<BrainConfig>(() => {
    const saved = localStorage.getItem("ahorraai_brain_config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_BRAIN_CONFIG;
      }
    }
    return DEFAULT_BRAIN_CONFIG;
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; models?: string[] } | null>(null);

  useEffect(() => {
    localStorage.setItem("ahorraai_brain_config", JSON.stringify(config));
    onConfigChange(config);
  }, [config, onConfigChange]);

  const handleChange = (field: keyof BrainConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [value === "" ? "" : field]: value }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // If we are connecting via browser direct
      if (config.ollamaConnectionMode === "browser") {
        const res = await fetch(`${config.ollamaUrl}/api/tags`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        const models = data.models ? data.models.map((m: any) => m.name) : [];
        setTestResult({
          success: true,
          message: "¡Conectado con éxito directamente desde el navegador!",
          models: models,
        });
      } else {
        // Via server proxy, we make a status check through server
        const res = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemPrompt: "status_check",
            message: "ping",
            history: [],
            brainConfig: config,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Error desconocido" }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        setTestResult({
          success: true,
          message: "¡El servidor proxy de AhorraAI se conectó con éxito a tu Ollama!",
        });
      }
    } catch (err: any) {
      console.warn("[Ollama test error]", err);
      let errorMsg = err.message || "";
      
      const isMixedContent = window.location.protocol === "https:" && config.ollamaUrl.startsWith("http://");
      const isAppUrlEntered = config.ollamaUrl && (
        config.ollamaUrl.includes("run.app") || 
        config.ollamaUrl.includes("aistudio") || 
        config.ollamaUrl.includes(window.location.hostname)
      );

      if (isAppUrlEntered || errorMsg.includes("Unexpected token '<'") || errorMsg.includes("is not valid JSON") || errorMsg.includes("expected-comma") || errorMsg.includes("token < in JSON")) {
        if (isAppUrlEntered) {
          errorMsg = `Has introducido la dirección URL de esta misma aplicación web (${config.ollamaUrl}) en vez de la URL del programa local Ollama.\n\n¡Ollama es un software de Inteligencia Artificial que se ejecuta en tu propio ordenador! No debes pegar la URL de la web aquí. Si ejecutas Ollama en tu ordenador, el valor estándar de la URL de Ollama es 'http://localhost:11434'.`;
        } else {
          errorMsg = `El servidor en '${config.ollamaUrl}' retornó una página web (HTML o doctype '<') en lugar de una respuesta JSON de Ollama. Esto ocurre porque estás apuntando a una página web o puerto incorrecto. Asegúrate de apuntar al puerto correcto (el de Ollama por defecto es 11434, ej: 'http://localhost:11434').`;
        }
      } else if (errorMsg.includes("Failed to fetch") || errorMsg.includes("failed to fetch") || err.name === "TypeError") {
        if (isMixedContent) {
          errorMsg = `Bloqueo de Contenido Mixto (Mixed Content HTTPS ➔ HTTP): El navegador de tu equipo bloquea las llamadas directas HTTP a '${config.ollamaUrl}' porque este entorno de desarrollo de AI Studio se ejecuta en una web segura (HTTPS).\n\n💡 SOLUCIONES FÁCILES PARA ACTIVAR TU OLLAMA LOCAL:\n\n1. USAR UN TÚNEL HTTPS (Recomendado): Ejecuta en tu terminal el comando 'ngrok http 11434' (o similar con localtunnel). Copia la dirección remota segura HTTPS generada (ej: 'https://xxxx-xx.ngrok-free.app') y pégala en el campo URL de Ollama arriba. ¡Funcionará de inmediato!\n\n2. DESCARGAR Y EJECUTAR EN LOCAL: Exporta el código de la app desde el menú superior, instálalo e inícialo con 'npm run dev'. Como se ejecutará bajo 'http://localhost:3050' (HTTP), el navegador permitirá la conexión directa a tu Ollama local sin bloqueos de seguridad.`;
        } else {
          errorMsg = `No se pudo conectar a '${config.ollamaUrl}'. Asegúrate de que Ollama está activo en tu máquina. NOTA: Si utilizas el 'Proxy de Nube (Servidor)', este servidor en la nube de Google Cloud NO puede acceder a 'localhost' de tu ordenador directamente. Para usar el Proxy necesitas usar una IP pública o un túnel seguro (Ngrok).`;
        }
      }

      setTestResult({
        success: false,
        message: errorMsg || `Error al conectar con '${config.ollamaUrl}'. Asegúrate de que Ollama esté ejecutándose y que el puerto esté configurado sin bloqueos de CORS.`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-600" />
            Configuración del Cerebro de IA (Motor)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Elige si prefieres utilizar la API oficial de Google Gemini en la nube o un servidor Ollama local con Qwen.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            type="button"
            onClick={() => handleChange("brainType", "gemini")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              config.brainType === "gemini"
                ? "bg-teal-600 text-white font-bold shadow-md shadow-teal-600/10"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Google Gemini
          </button>
          <button
            type="button"
            onClick={() => handleChange("brainType", "ollama")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              config.brainType === "ollama"
                ? "bg-teal-600 text-white font-bold shadow-md shadow-teal-600/10"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Ollama + Qwen
          </button>
        </div>
      </div>

      {config.brainType === "gemini" ? (
        <div className="text-xs text-slate-600 leading-relaxed bg-teal-50/50 border border-teal-100/80 rounded-xl p-4 flex gap-3">
          <div className="w-5 h-5 rounded bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
            i
          </div>
          <div>
            <p className="font-semibold text-teal-900">Modo de Alta Velocidad (Gemini 2.0 Flash)</p>
            <p className="mt-1">
              Este modo utiliza los servidores de Google con velocidades ultrarrápidas y máxima calidad lingüística. 
              Requiere que configures tu <strong className="text-teal-950">GEMINI_API_KEY</strong> en la sección de Secretos de la consola de AI Studio.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ollama Host URL */}
            <div>
              <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-1.5">
                URL del Servidor Ollama
              </label>
              <input
                type="text"
                value={config.ollamaUrl}
                onChange={(e) => handleChange("ollamaUrl", e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-all font-mono"
              />
            </div>

            {/* Ollama Model name */}
            <div>
              <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-1.5">
                Modelo Qwen en Ollama
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={config.ollamaModel}
                  onChange={(e) => handleChange("ollamaModel", e.target.value)}
                  placeholder="qwen2.5:latest"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-all font-mono"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">
                  e.g., qwen2.5:latest
                </span>
              </div>
            </div>

            {/* Connection Mode Selector */}
            <div>
              <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-1.5">
                Canal de Conexión
              </label>
              <select
                value={config.ollamaConnectionMode}
                onChange={(e) => handleChange("ollamaConnectionMode", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-4 py-3 text-xs text-slate-800 outline-none transition-all cursor-pointer"
              >
                <option value="browser">Navegador Directo (Recomendado para localhost)</option>
                <option value="server">Proxy de Nube (Servidor AhorraAI)</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
            <div className="text-xs text-slate-500 space-y-3">
              <div>
                <span className="font-semibold text-slate-800 text-sm block mb-1">💡 Guía para Ejecutar Ollama con CORS habilitado</span>
                <p className="leading-relaxed">
                  El canal de <strong>Navegador Directo</strong> hace llamadas directas desde tu ordenador a Ollama. 
                  Para permitir la conexión desde este entorno remoto seguro, debes iniciar Ollama habilitando orígenes cruzados (CORS) con las variables de entorno correctas para tu sistema operativo:
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="bg-white border border-slate-150 p-3 rounded-lg space-y-1.5 shadow-xs">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wide border-b border-slate-100 pb-1 text-teal-750">🪟 Windows (Símbolo de Sistema / CMD)</span>
                  <p className="text-[10px] text-slate-500">Ejecuta estas dos líneas (sin mezclar todo en una):</p>
                  <pre className="bg-slate-900 text-emerald-400 p-2 rounded text-[10px] font-mono leading-normal select-all">
{`set OLLAMA_ORIGINS=*
ollama serve`}
                  </pre>
                </div>

                <div className="bg-white border border-slate-150 p-3 rounded-lg space-y-1.5 shadow-xs">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wide border-b border-slate-100 pb-1 text-teal-750">⚡ Windows PowerShell</span>
                  <p className="text-[10px] text-slate-500">Ejecuta estas dos líneas para configurar las variables:</p>
                  <pre className="bg-slate-900 text-emerald-400 p-2 rounded text-[10px] font-mono leading-normal select-all">
{`$env:OLLAMA_ORIGINS="*"
ollama serve`}
                  </pre>
                </div>

                <div className="bg-white border border-slate-150 p-3 rounded-lg space-y-1.5 shadow-xs">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wide border-b border-slate-100 pb-1 text-teal-750">🍎 macOS / Linux (Terminal)</span>
                  <p className="text-[10px] text-slate-500">Ejecuta este comando de una sola vez:</p>
                  <pre className="bg-slate-900 text-emerald-400 p-2 rounded text-[10px] font-mono leading-normal select-all">
{`OLLAMA_ORIGINS="*" ollama serve`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-200/60 pt-4">
              <p className="text-[11px] text-slate-500 italic max-w-lg">
                <strong>Importante:</strong> Asegúrate de que Ollama está activo en segundo plano, y de escribir <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">http://localhost:11434</code> arriba en el campo de dirección. No pegues la dirección web de esta aplicación allí.
              </p>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-teal-600 bg-teal-50 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-all shrink-0 cursor-pointer disabled:opacity-60"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Probar Conexión
              </button>
            </div>
          </div>

          {/* Test connection result banner */}
          {testResult && (
            <div
              className={`rounded-xl p-4 text-xs flex gap-3 border ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 animate-fade-in"
                  : "bg-amber-50 border-amber-200 text-amber-800 animate-fade-in"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div>
                <p className="font-bold">{testResult.success ? "Conexión Exitosa" : "Error de Conexión"}</p>
                <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
                {testResult.models && testResult.models.length > 0 && (
                  <div className="mt-2.5">
                    <p className="font-semibold text-emerald-950 mb-1 font-mono text-[10px] uppercase tracking-wider">
                      Modelos de Ollama disponibles detectados:
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {testResult.models.map((model) => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => handleChange("ollamaModel", model)}
                          className={`px-2 py-0.5 rounded border text-[11px] font-mono transition-all cursor-pointer ${
                            config.ollamaModel === model
                              ? "bg-emerald-600 border-emerald-700 text-white font-bold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                          title="Haga clic para seleccionar este modelo"
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
