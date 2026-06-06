import React, { useState } from "react";
import { ReportInputs } from "../types";
import ReportVisualization from "./ReportVisualization";
import { Mail, Loader2, Copy, Check, FileText, Calculator, TrendingUp, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReportGeneratorProps {
  initialBusinessName: string;
  initialBusinessType: string;
}

export default function ReportGenerator({ initialBusinessName, initialBusinessType }: ReportGeneratorProps) {
  const [inputs, setInputs] = useState<ReportInputs>({
    businessName: initialBusinessName || "GastroBar Vigo",
    businessType: initialBusinessType || "Restaurantes",
    clientEmail: "propietario@gastrobarvigo.es",
    totalConversations: 240,
    reservationsCaptured: 32,
    peakDay: "Sábado por la tarde",
    topThreeQuestions: "1. Reservas de mesa, 2. Alérgenos del menú del día, 3. Si se aceptan perros.",
    monthlyPrice: 149,
    monthsActive: 4,
  });

  const [report, setReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (initialBusinessName) {
      setInputs((prev) => ({
        ...prev,
        businessName: initialBusinessName,
        businessType: initialBusinessType || prev.businessType,
      }));
    }
  }, [initialBusinessName, initialBusinessType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: name.includes("totalConversations") || name.includes("reservationsCaptured") || name.includes("monthlyPrice") || name.includes("monthsActive")
        ? Number(value) || 0
        : value,
    }));
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setErrorMsg("");
    setReport("");

    try {
      const res = await fetch("/api/gemini/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });

      let data: any;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const errorText = await res.text();
        throw new Error(`Respuesta no válida del servidor (${res.status}): ${errorText.substring(0, 200)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || "No se pudo generar el reporte del ROI de la IA.");
      }

      setReport(data.report || "Error al componer el reporte.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ocurrió un error al contactar al generador de reportes de IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    const input = document.getElementById("report-result-card");
    if (!input) return;

    try {
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("reporte_roi_ahorraai.pdf");
    } catch (err) {
      console.error("Error generating PDF:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#12151B] border border-slate-800/60 rounded-2xl p-6 shadow-xl text-slate-205">
        <div className="border-b border-slate-800/60 pb-4 mb-5">
          <h2 className="text-xl font-sans font-semibold tracking-tight text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-400" />
            3. Generador de Informes Mensuales (Retención ROI)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Demuestra el retorno financiero de AhorraAI. Compon un correo estratégico con cálculos automáticos de valor de negocio capturado.
          </p>
        </div>

        <form onSubmit={handleGenerateReport} id="report-form" className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Nombre del Negocio */}
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                Negocio Cliente
              </label>
              <input
                type="text"
                name="businessName"
                id="report-businessName"
                value={inputs.businessName}
                onChange={handleChange}
                required
                className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2 text-xs text-white outline-none transition-all"
              />
            </div>

            {/* Email Propietario */}
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                Email del Propietario
              </label>
              <input
                type="email"
                name="clientEmail"
                id="report-clientEmail"
                value={inputs.clientEmail}
                onChange={handleChange}
                required
                className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2 text-xs text-white outline-none transition-all"
                placeholder="propietario@empresa.com"
              />
            </div>

            {/* Cuota Suscripción */}
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                Cuota Mensual cobrada (€)
              </label>
              <input
                type="number"
                name="monthlyPrice"
                id="report-monthlyPrice"
                value={inputs.monthlyPrice}
                onChange={handleChange}
                required
                min={1}
                className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2 text-xs text-white outline-none transition-all"
              />
            </div>

            {/* Meses Activos */}
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                Meses Activos
              </label>
              <input
                type="number"
                name="monthsActive"
                id="report-monthsActive"
                value={inputs.monthsActive}
                onChange={handleChange}
                required
                min={1}
                max={24}
                className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2 text-xs text-white outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total conversaciones */}
            <div className="bg-[#0F1115]/60 p-4 border border-slate-800/80 rounded-xl flex items-center gap-3">
              <Calculator className="w-8 h-8 text-indigo-400 shrink-0" />
              <div className="flex-1">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1">
                  Conversaciones IA Atendidas
                </label>
                <input
                  type="number"
                  name="totalConversations"
                  id="report-totalConversations"
                  value={inputs.totalConversations}
                  onChange={handleChange}
                  required
                  min={0}
                  className="w-full bg-[#1A1F26] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white transition-all font-mono"
                />
              </div>
            </div>

            {/* Reservas capturadas */}
            <div className="bg-[#0F1115]/60 p-4 border border-slate-800/80 rounded-xl flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-400 shrink-0" />
              <div className="flex-1">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1">
                  Reservas/Leads Capturados
                </label>
                <input
                  type="number"
                  name="reservationsCaptured"
                  id="report-reservationsCaptured"
                  value={inputs.reservationsCaptured}
                  onChange={handleChange}
                  required
                  min={0}
                  className="w-full bg-[#1A1F26] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white transition-all font-mono"
                />
              </div>
            </div>

            {/* Día pico */}
            <div className="bg-[#0F1115]/60 p-4 border border-slate-800/80 rounded-xl flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-400 rotate-90 shrink-0" />
              <div className="flex-1">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1">
                  Día de Mayor Actividad
                </label>
                <input
                  type="text"
                  name="peakDay"
                  id="report-peakDay"
                  value={inputs.peakDay}
                  onChange={handleChange}
                  required
                  className="w-full bg-[#1A1F26] border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Top 3 preguntas */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              Las 3 preguntas/temas más repetidas por la clientela
            </label>
            <input
              type="text"
              name="topThreeQuestions"
              id="report-topThreeQuestions"
              value={inputs.topThreeQuestions}
              onChange={handleChange}
              required
              className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all"
              placeholder="Ej. Precios de menú, parking concertado, condiciones de cancelación."
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              id="btn-trigger-report"
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 text-white font-medium px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Calculando Retorno y Componiendo Correo...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generar Correo de Reporte de ROI dende Vigo
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <ReportVisualization conversations={inputs.totalConversations} reservations={inputs.reservationsCaptured} monthsActive={inputs.monthsActive} />

      {/* Report Render Screen */}
      {(report || isGenerating) && (
        <div id="report-result-card" className="bg-[#12151B] border border-slate-800/60 rounded-2xl p-6 shadow-xl text-slate-200 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4">
            <div>
              <h3 className="text-base font-sans font-semibold text-white flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-400" />
                Email Comercial ROI Compuesto por IA
              </h3>
              <p className="text-[11px] text-slate-400">
                AhorraAI calcula automáticamente el impacto financiero estimado según tus inputs para justificar tu servicio.
              </p>
            </div>
            {report && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-download-pdf"
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/50 bg-[#1A1F26] text-slate-300 text-xs font-medium cursor-pointer transition-all hover:bg-slate-800 hover:border-teal-500 hover:text-teal-400"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar PDF
                </button>
                <button
                  type="button"
                  id="btn-copy-report"
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                    copied
                      ? "bg-[#1A1F26] border-emerald-500 text-emerald-400"
                      : "bg-[#1A1F26] border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-indigo-500 hover:text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado al portapapeles
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar Correo
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
              <p className="text-xs font-mono">Redactando correo persuasivo con toques vigueses...</p>
            </div>
          ) : (
            <div className="flex-1 bg-[#0F1115] rounded-xl border border-slate-800/60 p-5 overflow-y-auto">
              {errorMsg ? (
                <div className="text-sm bg-red-950/60 text-red-400 border border-red-900/40 p-3 rounded-xl text-center">
                  {errorMsg}
                </div>
              ) : (
                <div className="text-slate-200 space-y-4 text-xs font-sans whitespace-pre-wrap leading-relaxed">
                  {report}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
