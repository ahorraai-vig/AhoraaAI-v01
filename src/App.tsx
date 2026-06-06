import React, { useState } from "react";
import ClientManager from "./components/ClientManager";
import IntakeForm from "./components/IntakeForm";
import PromptViewer from "./components/PromptViewer";
import ReportGenerator from "./components/ReportGenerator";

import { BusinessIntake } from "./types";
import { Sparkles, FileText, Database, Mail, Landmark, Smile, MessageCircle } from "lucide-react";

type ActiveTab = "clients" | "prompt" | "report";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("clients");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [lastInputs, setLastInputs] = useState<BusinessIntake | null>(null);

  const [promptBusinessName, setPromptBusinessName] = useState("");
  const [promptBusinessType, setPromptBusinessType] = useState("");

  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptError, setPromptError] = useState("");

  const handleSelectBusinessFromTable = (name: string, type: string) => {
    setPromptBusinessName(name);
    setPromptBusinessType(type);
    setActiveTab("prompt");
  };

  const handleIntakeSubmit = async (data: BusinessIntake) => {
    setIsGeneratingPrompt(true);
    setPromptError("");
    setSystemPrompt("");
    setLastInputs(data);

    try {
      const response = await fetch("/api/gemini/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      let result: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const errorText = await response.text();
        throw new Error(`Respuesta no válida del servidor (${response.status}): ${errorText.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || "No se pudo estructurar el prompt del sistema.");
      }

      setSystemPrompt(result.prompt || "Error al estructurar el prompt del sistema.");
    } catch (err: any) {
      console.error("[IntakeSubmit Error]", err);
      setPromptError(err.message || "Ocurrió un error al contactar con el generador de prompts de AhorraAI.");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800 selection:bg-teal-500 selection:text-white">
      
      {/* Upper Navigation/Header Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Slogan dende Vigo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-600/30">
              <span className="font-extrabold text-white text-base tracking-wider font-sans">A</span>
            </div>
            <div className="text-left">
              <h1 className="text-xl font-sans font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
                Ahorra<span className="text-teal-600">AI</span> <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-mono uppercase tracking-widest">Vigo Edition</span>
              </h1>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">Consola de Operaciones B2B</p>
            </div>
          </div>

          {/* Navigation Tab Switcher & Telegram Access */}
          <div className="flex items-center gap-3">
            <nav className="flex items-center bg-slate-100 p-1 border border-slate-200 rounded-xl">
              <button
                id="tab-btn-clients"
                onClick={() => setActiveTab("clients")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "clients"
                    ? "bg-teal-600 text-white font-bold shadow-md shadow-teal-600/10"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                1. Cartera de Clientes
              </button>
              <button
                id="tab-btn-prompt"
                onClick={() => setActiveTab("prompt")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "prompt"
                    ? "bg-teal-600 text-white font-bold shadow-md shadow-teal-600/10"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                2. Diseñar Prompt AI
              </button>
              <button
                id="tab-btn-report"
                onClick={() => setActiveTab("report")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "report"
                    ? "bg-teal-600 text-white font-bold shadow-md shadow-teal-600/10"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                3. Informe Mensual ROI
              </button>
            </nav>

            <a 
              href="https://t.me/ahorraai_vigo_bot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition-all h-[42px]"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Telegram Bot
            </a>
          </div>
        </div>
      </header>

      {/* Main Viewport Content block */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome Intro Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-left relative overflow-hidden flex items-center gap-6">
          <img src="/src/assets/images/ahorraai_vigo_illustration_1779844579352.png" alt="AhorraAI Illustration" className="w-20 h-20" />
          <div className="max-w-2xl">
            <h2 className="text-lg font-sans font-semibold text-slate-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-teal-600" />
              B2B Manager: Conecta de forma inteligente Vigo y su Comercio Local
            </h2>
            <p className="text-xs text-slate-600 mt-1 pb-1 leading-relaxed">
              Diseñado exclusivamente para operadores SaaS. Registra clientes locales, genera sus reglas de atención comercial anti-alucinación alineadas con su catálogo de precios, y demuestra rentabilidad recurrente mediante reportes automatizados en español.
            </p>
          </div>
        </div>

        {/* Dynamic Inner Tab Router */}
        {activeTab === "clients" && (
          <div id="view-clients-module" className="animate-fade-in">
            <ClientManager onSelectBusiness={handleSelectBusinessFromTable} />
          </div>
        )}

        {activeTab === "prompt" && (
          <div id="view-prompt-module" className="space-y-8 animate-fade-in">
            {/* If we loaded a business name and category from the client ledger */}
            {promptBusinessName && (
              <div className="bg-[#12151B] border border-indigo-950/40 p-4 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">⭐</span>
                  <span>
                    Has seleccionado <strong className="text-white">"{promptBusinessName}"</strong> ({promptBusinessType}) desde tu panel de clientes. Ajusta su admisión:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPromptBusinessName("");
                    setPromptBusinessType("");
                  }}
                  className="text-indigo-400 hover:text-indigo-300 underline font-mono cursor-pointer"
                >
                  Limpiar Selección
                </button>
              </div>
            )}

            <IntakeForm onSubmit={handleIntakeSubmit} isGenerating={isGeneratingPrompt} />

            {promptError && (
              <div className="bg-red-950/40 border border-red-900/50 p-4 rounded-xl text-red-450 text-xs">
                {promptError}
              </div>
            )}

            {/* If a prompt is generated, or if we want to show instructions */}
            {systemPrompt ? (
              <PromptViewer systemPrompt={systemPrompt} businessName={lastInputs?.businessName || promptBusinessName || "GastroBar Vigo"} />
            ) : (
              !isGeneratingPrompt && (
                <div className="border border-slate-805/40 bg-[#12151B] rounded-2xl py-12 px-6 text-center text-slate-400">
                  <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-medium">No se ha generado ningún prompt aún.</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Completa el formulario de admisión de arriba o carga una plantilla y haz clic en "Generar Prompt de Sistema AI" para comenzar.
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === "report" && (
          <div id="view-report-module" className="animate-fade-in">
            <ReportGenerator
              initialBusinessName={lastInputs?.businessName || promptBusinessName}
              initialBusinessType={lastInputs?.businessType || promptBusinessType}
            />
          </div>
        )}

      </main>

      {/* Modern Footer */}
      <footer className="border-t border-slate-200 py-6 text-slate-500 text-xs mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-sans flex items-center gap-1 text-slate-500">
            <span>AhorraAI Vigo - Plataforma SaaS. Contactar: 614053674 | contacto@ahorraai.com | Hecho en Galicia con</span>
            <Smile className="w-3.5 h-3.5 text-teal-600" />
            <span>para negocios de cáliadade.</span>
          </p>
          <p className="font-mono text-[10px] text-slate-400">
            Versión 2.4.0 • Persistencia Google Sheets • Gemini Engine
          </p>
        </div>
      </footer>

    </div>
  );
}
