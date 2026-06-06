import React, { useState } from "react";
import { BusinessIntake } from "../types";
import { Sparkles, ArrowRight, HelpCircle } from "lucide-react";

interface IntakeFormProps {
  onSubmit: (data: BusinessIntake) => void;
  isGenerating: boolean;
}

const DEFAULT_INTAKE: BusinessIntake = {
  businessName: "GastroBar Vigo",
  businessType: "Restaurantes",
  address: "Rúa do Príncipe 42, 36202 Vigo, Pontevedra",
  phone: "614053674",
  whatsapp: "614053674",
  website: "www.gastrobarvigo.es",
  hours: "Lunes a Viernes: 13:00 - 16:00 y 20:00 - 23:30. Sábados: 13:00 - 00:00. Domingos: Cerrado.",
  services: `- Menú del Día: 14.50€ (Primer plato, segundo plato, bebida y postre o café).
- Arroz con Bogavante (Especialidad): 24€ por persona (mínimo 2 personas).
- Empanada Gallega de Xoubas: 8€ la ración.
- Pulpo a la Gallega (Polbo á feira): 18€ ración mediana.
- Hamburguesa Premium Castro: 12.50€ (Carne de ternera gallega, queso del Cebreiro, cebolla caramelizada).
- Botella de Vino Albariño de la casa: 15€.`,
  allergens: "Opciones sin gluten disponibles para la empanada y hamburguesas (bajo petición). Informar siempre de alergias al marisco.",
  faqs: `1. ¿Se necesita reservar mesa con antelación? -> Sí, especialmente los fines de semana. Se puede reservar llamando o por WhatsApp.
2. ¿Tenéis opciones vegetarianas o veganas? -> Sí, disponemos de ensaladas especiales y hamburguesa vegetal de lentejas.
3. ¿Tenéis terraza exterior? -> Sí, contamos con una terraza de 6 mesas en zona peatonal en Rúa do Príncipe.
4. ¿Se permiten mascotas (peticfriendly)? -> En la terraza sí se permiten mascotas de forma amigable, en el interior del local no por normativa de espacio.
5. ¿Cuál es el último turno de cena? -> Los fogones cierran a las 23:15 de lunes a viernes y a las 23:45 los sábados.`,
  neverSay: "No inventar precios de platos fuera del menú. No prometer mesas libres sin confirmación del encargado. No discutir con clientes cansados, mantener la calma siempre.",
  tone: "cercano",
  escalationContact: "Atención por WhatsApp del encargado en el 600 123 456 o llamar directamente al fijo 886 123 456",
  useGalicianAccents: true,
};

export default function IntakeForm({ onSubmit, isGenerating }: IntakeFormProps) {
  const [formData, setFormData] = useState<BusinessIntake>(() => {
    const saved = localStorage.getItem("ahorraai_intake_data");
    return saved ? JSON.parse(saved) : DEFAULT_INTAKE;
  });

  React.useEffect(() => {
    localStorage.setItem("ahorraai_intake_data", JSON.stringify(formData));
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const loadPreset = (type: string) => {
    switch (type) {
      case "hair":
        setFormData({
          businessName: "Estilo & Brillo Vigo",
          businessType: "Peluquerías",
          address: "Rúa de Urzaiz 85, 36201 Vigo",
          phone: "986 112 233",
          whatsapp: "699 112 233",
          website: "www.estilobrillovigo.com",
          hours: "Lunes a Viernes: 09:30 - 20:00 (horario ininterrumpido). Sábados: 09:00 - 14:00. Domingos: Cerrado.",
          services: `- Lavado y peinado básico: 18€
- Corte de pelo mujer: 15€ (no incluye peinado)
- Corte de pelo hombre / barbería: 12€
- Tratamiento de Hidratación de Keratina completo: 45€
- Coloración / Tinte orgánico: dende 28€
- Mechas Balayage tendencia: dende 65€`,
          allergens: "Utilizamos productos 100% orgánicos, libres de amoníaco. Informar si se tiene piel atópica o alergias capilares.",
          faqs: `1. ¿Hacéis peinados para bodas y eventos en Vigo? -> Sí, hacemos recogidos y servicios especiales para novias, bajo reserva de cita previa.
2. ¿Se puede acudir sin cita previa? -> Sí, pero la prioridad absoluta de atención es para las citas agendadas de forma online o telefónica.
3. ¿Aceptáis pagos con tarjeta y Bizum? -> Sí, aceptamos tarjetas Visa, Mastercard, Bizum y pagos en efectivo.
4. ¿Tenéis bonos de ahorro mensual? -> Sí, consulta nuestro bono de 4 lavados y peinados al mes por 60€.
5. ¿Qué marcas de tintes utilizáis? -> Trabajamos exclusivamente con marcas ecológicas premium e hipoalergénicas.`,
          neverSay: "No inventar cotizaciones exactas para balayage complejas si no vemos el cabello. Indicar siempre que los precios de mechas son dende el mínimo. No dar citas sin confirmar cupo.",
          tone: "cercano",
          escalationContact: "Escribir al WhatsApp personal de la jefa de estilistas (Marta) en el 699 112 233",
          useGalicianAccents: true,
        });
        break;
      case "dentist":
        setFormData({
          businessName: "Clínica Dental Castro-Vigo",
          businessType: "Clínicas Dentales",
          address: "Gran Vía 14, 2º Izquierda, 36203 Vigo",
          phone: "986 445 566",
          whatsapp: "612 445 566",
          website: "www.dentalcastrovigo.com",
          hours: "Lunes a Jueves: 09:00 - 13:30 y 16:00 - 20:00. Viernes: 09:00 - 15:00 (jornada intensiva). Sábados y Domingos: Cerrado.",
          services: `- Primera Consulta Diagnóstica + Radiografía panorámica: ¡Gratis para nuevos pacientes!
- Higiene bucodental profunda con ultrasonidos: 45€
- Obturación / Empaste dental simple: 55€
- Blanqueamiento dental LED profesional en cabina: 180€
- Tratamientos de Implantología y Ortodoncia invisible (Invisalign): Previa valoración y estudio individual (financiación sin intereses).`,
          allergens: "Instalaciones adaptadas para movilidad reducida. Cumplimiento estricto de control de látex y metales en pacientes sensibles.",
          faqs: `1. ¿Trabajáis con seguros públicos o mutuas privadas? -> Sí, colaboramos con Adeslas, Sanitas y Mapfre. El Servicio Gallego de Salud (SERGAS) cubre el plan infantil PADI.
2. ¿Tenéis facilidades de financiación? -> Sí, ofrecemos planes de financiación a medida sin intereses hasta 24 meses.
3. ¿Qué hago en caso de urgencia dolorosa fuera de hora? -> Deja un mensaje inmediato en el WhatsApp o llama al número de guardias habilitado.
4. ¿Cuánto dura la sesión de limpieza? -> Aproximadamente 40 minutos en cabina con higienista titulada.
5. ¿Hay parking cerca de la clínica? -> Sí, el parking público de Gran Vía se encuentra a solo 50 metros del portal.`,
          neverSay: "No prometer curas milagrosas ni desestimar el dolor de una muela. No presupuestar implantes por chat sin ver al ortodoncista.",
          tone: "profesional",
          escalationContact: "Llamar a recepción al 986 445 566 o escribir al WhatsApp de emergencias odontológicas en el 612 445 566",
          useGalicianAccents: false,
        });
        break;
    }
  };

  return (
    <div id="intake-form-container" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-sans font-semibold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            1. Formulario de Admisión Comercial
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Recopila los datos operativos de tu cliente local en Vigo. ¡La IA los estructurará en segundos!
          </p>
        </div>
        <div id="quick-presets" className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-500 mr-2">Cargar Plantilla:</span>
          <button
            type="button"
            id="preset-hair"
            onClick={() => loadPreset("hair")}
            className="text-xs bg-[#1A1F26] hover:bg-slate-800 text-indigo-400 border border-slate-700/50 hover:border-indigo-550 rounded-lg px-3 py-1.5 font-medium transition-all"
          >
            ✂️ Peluquería
          </button>
          <button
            type="button"
            id="preset-dentist"
            onClick={() => loadPreset("dentist")}
            className="text-xs bg-[#1A1F26] hover:bg-slate-800 text-indigo-400 border border-slate-700/50 hover:border-indigo-550 rounded-lg px-3 py-1.5 font-medium transition-all"
          >
            🦷 Odontólogo
          </button>
          <button
            type="button"
            id="preset-restaurant"
            onClick={() => setFormData(DEFAULT_INTAKE)}
            className="text-xs bg-[#1A1F26] hover:bg-slate-800 text-indigo-400 border border-slate-700/50 hover:border-indigo-550 rounded-lg px-3 py-1.5 font-medium transition-all"
          >
            🍽️ Tapería Vigo
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} id="intake-form-actual" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              Nombre Comercial
            </label>
            <input
              type="text"
              name="businessName"
              id="input-businessName"
              value={formData.businessName}
              onChange={handleChange}
              required
              className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 transition-all text-sm outline-none"
              placeholder="Ej. Tapería dende Vigo"
            />
          </div>

          {/* Tipo de negocio */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              Tipo de Negocio
            </label>
            <select
              name="businessType"
              id="input-businessType"
              value={formData.businessType}
              onChange={handleChange}
              required
              className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2.5 text-white transition-all text-sm outline-none"
            >
              <option value="Restaurantes">🍽️ Restaurantes & Taperías</option>
              <option value="Peluquerías">✂️ Peluquería & Salones de Estética</option>
              <option value="Clínicas Dentales">🦷 Clínicas Dentales</option>
              <option value="Gimnasios">💪 Gimnasios & Centros Deportivos</option>
              <option value="Despachos de Abogados">⚖️ Despachos de Abogados</option>
              <option value="Talleres Mecánicos">🚗 Talleres Mecánicos</option>
              <option value="Hoteles">🏨 Hoteles, Hospedaje y Hostales</option>
              <option value="Otros">🏢 Servicios Locales en Vigo</option>
            </select>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              Dirección Física en Vigo (Cálidade)
            </label>
            <input
              type="text"
              name="address"
              id="input-address"
              value={formData.address}
              onChange={handleChange}
              required
              className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2.5 text-white transition-all text-sm outline-none"
              placeholder="Rúa de Urzaiz, Vigo..."
            />
          </div>

          {/* Web */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              Página Web (Opcional)
            </label>
            <input
              type="text"
              name="website"
              id="input-website"
              value={formData.website}
              onChange={handleChange}
              className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2.5 text-white transition-all text-sm outline-none"
              placeholder="https://gastrobarvigo.es"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              Teléfono de Contacto fijo
            </label>
            <input
              type="text"
              name="phone"
              id="input-phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2.5 text-white transition-all text-sm outline-none"
              placeholder="Ej. 986 000 000"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              WhatsApp para Clientes
            </label>
            <input
              type="text"
              name="whatsapp"
              id="input-whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              required
              className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2.5 text-white transition-all text-sm outline-none"
              placeholder="Ej. 600 000 000"
            />
          </div>
        </div>

        {/* Horarios de apertura */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
            Horarios de Apertura Completos
          </label>
          <textarea
            name="hours"
            id="input-hours"
            value={formData.hours}
            onChange={handleChange}
            required
            rows={2}
            className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-3 text-white transition-all text-sm outline-none font-mono resize-none"
            placeholder="Lunes y Martes..."
          />
        </div>

        {/* Servicios y precios */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest">
              Catálogo de Servicios o Menú con Precios
            </label>
            <span className="text-[10px] text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-2 py-0.5 rounded-full">
              Crítico: Indica precios exactos
            </span>
          </div>
          <textarea
            name="services"
            id="input-services"
            value={formData.services}
            onChange={handleChange}
            required
            rows={5}
            className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-3 text-white transition-all text-xs outline-none font-mono"
            placeholder="Introduce los servicios con sus precios detallados..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Alérgenos */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              Alérgenos e Indicaciones Especiales
            </label>
            <textarea
              name="allergens"
              id="input-allergens"
              value={formData.allergens}
              onChange={handleChange}
              rows={3}
              className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-3 text-white transition-all text-sm outline-none resize-none"
              placeholder="Declaraciones de alérgenos de la cocina..."
            />
          </div>

          {/* Cosas que nunca debe decir */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              Cosas que la IA NUNCA debe decir
            </label>
            <textarea
              name="neverSay"
              id="input-neverSay"
              value={formData.neverSay}
              onChange={handleChange}
              rows={3}
              className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-3 text-white transition-all text-sm outline-none resize-none"
              placeholder="Ej. No prometer descuentos que no estén activados..."
            />
          </div>
        </div>

        {/* FAQs */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest">
              5 Preguntas Frecuentes (FAQs) con Respuestas
            </label>
            <span className="text-[10px] text-slate-500 font-mono">Introduce la consulta e indica la respuesta exacta</span>
          </div>
          <textarea
            name="faqs"
            id="input-faqs"
            value={formData.faqs}
            onChange={handleChange}
            required
            rows={5}
            className="w-full bg-[#1A1F26] border border-slate-800/80 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-3 text-white transition-all text-xs outline-none font-mono"
            placeholder="Preguntas rápidas de ejemplo..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tono */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              Tono de Comunicación del Bot
            </label>
            <select
              name="tone"
              id="input-tone"
              value={formData.tone}
              onChange={handleChange}
              required
              className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2.5 text-white transition-all text-sm outline-none"
            >
              <option value="cercano">😊 Cercano & Amistoso</option>
              <option value="profesional">💼 Profesional & Técnico</option>
              <option value="informal">👋 Informal & Distendido</option>
              <option value="formal">👔 Formal & Protocolario</option>
            </select>
          </div>

          {/* Contacto de Escalado de Emergencia */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              Derivación / Escalado Humano (Garantía)
            </label>
            <input
              type="text"
              name="escalationContact"
              id="input-escalationContact"
              value={formData.escalationContact}
              onChange={handleChange}
              required
              className="w-full bg-[#1A1F26] border border-slate-800 hover:border-slate-705 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl px-4 py-2.5 text-white transition-all text-sm outline-none"
              placeholder="Ej. Hablar por WhatsApp con el gerente al 600123456"
            />
          </div>
        </div>

        {/* Opciones de localización en gallego */}
        <div id="localization-block" className="bg-[#0F1115] border border-slate-800/60 p-4 rounded-xl flex items-center justify-between">
          <div className="flex flex-col gap-0.5 animate-pulse-subtle">
            <span className="text-sm font-medium text-white flex items-center gap-1.5">
              <span>💙 Soporte de Idioma Gallego (+)</span>
              <span className="text-[10px] bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded-full font-sans uppercase">
                Plus
              </span>
            </span>
            <span className="text-xs text-slate-400">
              Usa modismos y saludos gallegos emblemáticos (Ola, boas, graciñas, etc.) para conectar con el público local vigués.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="useGalicianAccents"
              id="input-useGalicianAccents"
              checked={formData.useGalicianAccents}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            id="btn-generate-prompt"
            disabled={isGenerating}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 disabled:text-indigo-400 text-white font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-600/20 duration-200 cursor-pointer text-sm"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Estructurando Inteligencia...
              </>
            ) : (
              <>
                Generar Prompt de Sistema AI
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
