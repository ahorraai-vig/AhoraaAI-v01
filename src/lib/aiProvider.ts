import { BusinessIntake, ReportInputs, ChatMessage, BrainConfig } from "../types";

// Default configuration for Ollama / Qwen integration
export const DEFAULT_BRAIN_CONFIG: BrainConfig = {
  brainType: "gemini",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "qwen2.5:latest",
  ollamaConnectionMode: "browser",
};

// Map client-side chat history to standard LLM messages format
function formatChatMessages(systemPrompt: string, history: ChatMessage[], currentMessage: string) {
  const messages = [];
  
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  // LLM engines require the conversation to start with a "user" role and alternate properly.
  // We ignore initial greetings or any bot contributions that exist before the user's first input.
  let foundFirstUser = false;
  for (const item of history) {
    if (item.sender === "user") {
      foundFirstUser = true;
    }
    if (foundFirstUser) {
      messages.push({
        role: item.sender === "user" ? "user" : "assistant",
        content: item.text,
      });
    }
  }

  messages.push({ role: "user", content: currentMessage });
  return messages;
}

// Generate the user instructions for prompt generation (same as server.ts)
export function getPromptGenerationInstructions(data: BusinessIntake): string {
  return `
Eres un creador experto de prompts de sistema para asistentes de Inteligencia Artificial destinados a la atención al cliente de negocios locales en Vigo, España.
Por favor, genera un SYSTEM_PROMPT refinado, profesional, estructurado y altamente efectivo en español (con toques de gallego si está activado) para el siguiente negocio.

DATOS DEL NEGOCIO:
- Nombre: ${data.businessName}
- Tipo: ${data.businessType}
- Dirección: ${data.address}
- Teléfono: ${data.phone}
- WhatsApp: ${data.whatsapp}
- Web: ${data.website || "No disponible"}
- Horarios de apertura: ${data.hours}
- Servicios / Menú y Precios: ${data.services}
- Notas especiales / Alérgenos: ${data.allergens || "No aplicable"}
- Preguntas frecuentes de clientes (FAQs): ${data.faqs}
- Cosas que el asistente NUNCA debe decir: ${data.neverSay || "No inventar información, no hablar del backend"}
- Tono preferido: ${data.tone} (opciones sugeridas: cercano, profesional, informal, formal)
- Contacto de escalado / derivación: ${data.escalationContact}
- Toques de gallego amigable en saludos/despedidas (Galician support +): ${data.useGalicianAccents ? "SÍ, añade términos gallegos cálidos como 'Ola', 'Boas', 'Graciñas', 'Un saúdo dende Vigo' de forma natural" : "NO, mantener puro español de España"}

REGLAS CRÍTICAS DE COMPORTAMIENTO PARA EL ASISTENTE QUE DEBES INCLUIR EN EL PROMPT:
1. **NUNCA INVENTAR INFORMACIÓN**: Si un cliente pregunta por un precio, servicio, plato o política que NO está explícitamente detallada en los datos proporcionados, el asistente debe admitir amablemente que no dispone de esa información y ofrecer de inmediato el contacto de escalado (${data.escalationContact}) para que un humano responda por WhatsApp o llamada.
2. **RESOLVER PREGUNTAS EN EL IDIOMA DEL CLIENTE**: El asistente debe responder fluidamente en gallego si el cliente escribe en gallego, en español si escribe en español, o en inglés si escribe en inglés.
3. **TONO DE VOZ**: Debe reflejar de forma consistente el tono "${data.tone}".
4. **LLAMADA A LA ACCIÓN**: Invitar sutilmente a reservar, comprar o visitar el local físico en Vigo.
5. **CANALES DE COMUNICACIÓN**: Indicar que los clientes pueden comunicarse por WhatsApp en el número ${data.whatsapp} o teléfono ${data.phone}.

Escribe el output en un formato Markdown muy claro, limpio y copiable, listo para usar en sistemas como Claude, OpenAI o Gemini API. Incluye comentarios explicativos en español para guiar al propietario del negocio sobre cómo integrarlo.
`;
}

// Generate the user instructions for ROI report generation (same as server.ts)
export function getReportGenerationInstructions(inputs: ReportInputs): string {
  return `
Eres un consultor de marketing B2B de la agencia AhorraAI en Vigo. Tu tarea es generar un informe mensual de ROI (Retorno de Inversión) estructurado como un correo electrónico profesional en español, dirigido al propietario de "${inputs.businessName}" (${inputs.businessType}).
El objetivo es deleitar al cliente, demostrar de manera cuantitativa y cualitativa el valor del servicio de asistente virtual de IA de AhorraAI y justificar la cuota mensual de ${inputs.monthlyPrice}€/mes para que sigan renovando contentos.

DATOS DE USO MENSUAL:
- Negocio: ${inputs.businessName}
- Total de conversaciones atendidas 24/7 por la IA: ${inputs.totalConversations}
- Reservas o Leads capturados directamente: ${inputs.reservationsCaptured}
- Día de máxima actividad: ${inputs.peakDay}
- Las 3 preguntas más repetidas por los clientes: ${inputs.topThreeQuestions}
- Cuota mensual del servicio: ${inputs.monthlyPrice}€

ESTIMACIONES DE ROI QUE DEBES CALCULAR Y DETALLAR EN EL CORREO:
1. **Tiempo Ahorrado**: Asume que cada conversación telefónica o de WhatsApp manual le habría tomado un promedio de 4 minutos al personal del negocio. ¡Multiplica esto por ${inputs.totalConversations} y exprésalo en horas completas de trabajo liberadas!
2. **Valor de Reservas Estimado**: Asume un ticket medio según el tipo de negocio. (Por ejemplo, si es restaurante asume un valor de 30€ por reserva capturada, si es clínica dental 60€, peluquería 25€, despacho 80€, etc.). Calcula el volumen de negocio potencial generado por las ${inputs.reservationsCaptured} reservas captured.
3. **Efficiency de Atención 24/7**: Destaca cuántas consultas ocurrieron fuera de horario comercial (típicamente entre 25% y 40% del total), explicando que estas consultas se habrían perdido sin el asistente AhorraAI.

ESTRUCTURA DEL CORREO:
- Asunto atractivo (con gancho, ej: "Tu informe de valor AhorraAI - ¡Descubre el impacto de tu Asistente en Vigo este mes!").
- Introducción cálida y personalizada dende Vigo.
- Panel de métricas clave (formato tabla Markdown o lista elegante).
- Sección detallada de Retorno de Inversión (ROI cuantitativo y cualitativo: horas de personal guardadas y valor retenido).
- Análisis corto de las preguntas frecuentes más calientes, sugiriendo optimizaciones comerciales (ej: "tu clientela pregunta mucho por X, tal vez quieras lanzar una oferta dende Vigo...").
- Cierre profesional impulsando la renovación de la suscripción y reafirmando el soporte de AhorraAI.

Proporciona la respuesta en Markdown de excelente calidad visual.
`;
}

// Global API dispatchers
export async function generateAIPrompt(
  data: BusinessIntake,
  config: BrainConfig
): Promise<string> {
  if (config.brainType === "ollama" && config.ollamaConnectionMode === "browser") {
    const prompt = getPromptGenerationInstructions(data);
    const response = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollamaModel,
        messages: [
          { role: "system", content: "Eres un experto de Inteligencia Artificial dende Vigo." },
          { role: "user", content: prompt }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en Ollama (${response.status}): No se pudo contactar el servicio local.`);
    }

    const json = await response.json();
    return json.message?.content || "";
  }

  // Fallback / Proxy or Gemini
  const response = await fetch("/api/gemini/generate-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, brainConfig: config }),
  });

  const contentType = response.headers.get("content-type");
  let result: any;
  if (contentType && contentType.includes("application/json")) {
    result = await response.json();
  } else {
    const errorText = await response.text();
    throw new Error(`Respuesta no válida del servidor (${response.status}): ${errorText.substring(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(result.error || "No se pudo estructurar el prompt del sistema.");
  }

  return result.prompt || "";
}

export async function generateAIReport(
  inputs: ReportInputs,
  config: BrainConfig
): Promise<string> {
  if (config.brainType === "ollama" && config.ollamaConnectionMode === "browser") {
    const prompt = getReportGenerationInstructions(inputs);
    const response = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollamaModel,
        messages: [
          { role: "system", content: "Eres un consultor de marketing B2B de AhorraAI Vigo." },
          { role: "user", content: prompt }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en Ollama (${response.status}): No se pudo contactar el servicio local.`);
    }

    const json = await response.json();
    return json.message?.content || "";
  }

  // Fallback / Proxy or Gemini
  const response = await fetch("/api/gemini/generate-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...inputs, brainConfig: config }),
  });

  const contentType = response.headers.get("content-type");
  let result: any;
  if (contentType && contentType.includes("application/json")) {
    result = await response.json();
  } else {
    const errorText = await response.text();
    throw new Error(`Respuesta no válida del servidor (${response.status}): ${errorText.substring(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(result.error || "No se pudo generar el reporte del ROI de la IA.");
  }

  return result.report || "";
}

export async function sendAIChatMessage(
  systemPrompt: string,
  message: string,
  history: ChatMessage[],
  config: BrainConfig
): Promise<string> {
  if (config.brainType === "ollama" && config.ollamaConnectionMode === "browser") {
    const messages = formatChatMessages(systemPrompt, history, message);
    const response = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollamaModel,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en Ollama (${response.status}): No se pudo contactar el servicio local.`);
    }

    const json = await response.json();
    return json.message?.content || "";
  }

  // Fallback / Proxy or Gemini
  const response = await fetch("/api/gemini/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt,
      message,
      history,
      brainConfig: config,
    }),
  });

  const contentType = response.headers.get("content-type");
  let result: any;
  if (contentType && contentType.includes("application/json")) {
    result = await response.json();
  } else {
    const errorText = await response.text();
    throw new Error(`Respuesta no válida del servidor (${response.status}): ${errorText.substring(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(result.error || "No se pudo simular la respuesta del chat.");
  }

  return result.reply || "";
}
