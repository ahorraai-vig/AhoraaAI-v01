import express from "express";
import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const app = express();
const PORT = 3000;
app.use(express.json({ limit: "10mb" }));

type Channel = "mock" | "telegram";
type AgentType = "atencion" | "captacion" | "escalado";
type Commerce = { id: string; name: string; type: string; phone: string; whatsapp: string; address: string; services: string; faqs: string; escalationContact: string; systemPrompt: string; };
type Customer = { id: string; channel: Channel; channelUserId: string; displayName?: string; };
type ConversationMessage = { id: string; sender: "user" | "assistant"; text: string; timestamp: string; };
type Conversation = { id: string; commerceId: string; customerId: string; channel: Channel; messages: ConversationMessage[]; lastAgent: AgentType; escalated: boolean; updatedAt: string; };
type CatalogBusiness = { id: string; name: string; category: string; area: string; address: string | null; phone: string | null; hours: any; services: any; faqs: any; systemPrompt: string | null; keywords: string[]; sourceUrl: string; };
type JourneyIntent = "pedido" | "reserva" | "cita" | "descubrir";

const db = {
  commerces: new Map<string, Commerce>(),
  customers: new Map<string, Customer>(),
  conversations: new Map<string, Conversation>(),
};

const defaultCommerce: Commerce = {
  id: "default",
  name: "AhorraAI Vigo",
  type: "Marketplace local por WhatsApp",
  phone: "+34 600000000",
  whatsapp: "+34 600000000",
  address: "Vigo",
  services: "Descubrir comercios locales, comparar opciones, reservar, pedir a domicilio.",
  faqs: "Que opciones hay en Vigo, horarios, reservas, pedidos, disponibilidad.",
  escalationContact: "+34 614053674",
  systemPrompt: "Eres AhorraAI, un asistente que ayuda a usuarios a descubrir y comprar oferta local de Vigo. No inventes informacion."
};
db.commerces.set(defaultCommerce.id, defaultCommerce);

const asyncHandler = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => { Promise.resolve(fn(req, res, next)).catch(next); };
const nowIso = () => new Date().toISOString();
const newId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

function getOrCreateCustomer(channel: Channel, channelUserId: string, displayName?: string): Customer {
  const key = `${channel}:${channelUserId}`;
  let customer = db.customers.get(key);
  if (!customer) { customer = { id: key, channel, channelUserId, displayName }; db.customers.set(key, customer); }
  return customer;
}

function getOrCreateConversation(commerceId: string, customerId: string, channel: Channel): Conversation {
  const key = `${commerceId}:${customerId}`;
  let c = db.conversations.get(key);
  if (!c) { c = { id: key, commerceId, customerId, channel, messages: [], lastAgent: "atencion", escalated: false, updatedAt: nowIso() }; db.conversations.set(key, c); }
  return c;
}

function detectAgent(text: string): AgentType {
  const t = text.toLowerCase();
  if (/(queja|reclamo|urgente|problema grave)/.test(t)) return "escalado";
  if (/(reserva|pedido|comprar|precio|quiero)/.test(t)) return "captacion";
  return "atencion";
}

async function buscarEnSupabase(texto: string): Promise<CatalogBusiness[]> {
  if (!supabase) return [];
  const query = texto.toLowerCase();
  let palabraClave = "";
  if (query.includes("masaj")) palabraClave = "masaj";
  else if (query.includes("dent") || query.includes("clinic")) palabraClave = "dent";
  else if (query.includes("restaurante") || query.includes("comer")) palabraClave = "restaurant";
  else if (query.includes("farmacia")) palabraClave = "farmaci";
  else palabraClave = query.split(" ").find(w => w.length > 4) || query;

  const { data, error } = await supabase.from("businesses").select("*").eq("status", "verified").or(`type.ilike.%${palabraClave}%,name.ilike.%${palabraClave}%`).limit(3);
  if (error) return [];
  return (data || []).map(b => ({ id: b.id || b.name, name: b.name, category: b.type || "Local", area: "Vigo", address: b.address || null, phone: b.phone || null, hours: b.hours ?? null, services: b.services ?? null, faqs: b.faqs ?? null, systemPrompt: b.system_prompt ?? null, keywords: [], sourceUrl: b.maps_url || b.website || "" }));
}

function isCatalogQuery(text: string) { return /(busco|quiero|reservar|pedido|pedir|domicilio|restaurante|cafeteria|masaje|farmacia|clinica)/i.test(text.toLowerCase()); }

function formatCatalogReply(businesses: CatalogBusiness[], commerce: Commerce) {
  if (!businesses.length) return `No tengo opciones verificadas para esa peticion. Contacta con nosotros en ${commerce.escalationContact}.`;
  const lines = businesses.map((b, i) => {
    const parts = [`${i + 1}. ${b.name}`, b.category, b.address || null, b.phone ? `Tel: ${b.phone}` : null].filter(Boolean);
    return parts.join(" | ");
  });
  return `Estas son las opciones en Vigo:\n\n${lines.join("\n")}\n\nResponde con el nombre del comercio para continuar.`;
}

async function generateReply(text: string, commerce: Commerce, conversation: Conversation): Promise<string> {
  const agent = detectAgent(text);
  if (agent === "escalado") return `Te derivamos con una persona en ${commerce.escalationContact}.`;
  
  let contextoAhorraAI = "";

  // 1. Buscamos SIEMPRE en la base de datos por si la consulta coincide con un comercio
  const negocios = await buscarEnSupabase(text);

  if (negocios.length > 0) {
    contextoAhorraAI = "\n\nAquí tienes la información extraída de nuestra base de datos de AhorraAI para responder al usuario. Usa ESTOS datos exactos y no inventes precios ni horarios:\n";
    negocios.forEach(negocio => {
      contextoAhorraAI += `\n### ${negocio.name} (${negocio.category})\n`;
      contextoAhorraAI += `Dirección: ${negocio.address || "No especificada"}\n`;
      contextoAhorraAI += `Teléfono: ${negocio.phone || "No especificado"}\n`;
      if (negocio.hours) contextoAhorraAI += `Horarios: ${JSON.stringify(negocio.hours)}\n`;
      if (negocio.services) contextoAhorraAI += `Servicios y menú con precios: ${JSON.stringify(negocio.services)}\n`;
      if (negocio.faqs) contextoAhorraAI += `Preguntas frecuentes: ${JSON.stringify(negocio.faqs)}\n`;
      if (negocio.sourceUrl) contextoAhorraAI += `Enlace: ${negocio.sourceUrl}\n`;
    });
  } else if (isCatalogQuery(text)) {
    contextoAhorraAI = `\n\nHe buscado en la base de datos pero no he encontrado comercios locales para esta petición. Pide disculpas amablemente y ofrece el teléfono de contacto manual: ${commerce.escalationContact}.`;
  }

  // 2. Unimos las instrucciones base (prompt propio del negocio si lo tiene) con los datos encontrados
  const basePrompt = negocios.find(n => n.systemPrompt)?.systemPrompt || commerce.systemPrompt;
  const systemPromptEnriquecido = basePrompt + contextoAhorraAI;

  // 3. Dejamos que Claude genere la respuesta final con toda esa información
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: systemPromptEnriquecido,
        messages: [{ role: "user", content: text }]
      })
    });
    const data: any = await response.json();
    return data.content?.[0]?.text || "No pude generar respuesta.";
  } catch {
    return `Hola, soy AhorraAI. ¿En qué puedo ayudarte?`;
  }
}

// === WHATSAPP WEBHOOK ===
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", asyncHandler(async (req: express.Request, res: express.Response) => {
  const body = req.body;
  if (body.object !== "whatsapp_business_account") return res.sendStatus(404);
  const entry = body.entry?.[0]?.changes?.[0]?.value;
  const message = entry?.messages?.[0];
  if (!message || message.type !== "text") return res.sendStatus(200);
  const from = message.from;
  const text = message.text.body;
  console.log(`[WhatsApp] Mensaje de ${from}: ${text}`);
  const commerce = db.commerces.get("default")!;
  const customer = getOrCreateCustomer("mock", from);
  const conversation = getOrCreateConversation("default", customer.id, "mock");
  conversation.messages.push({ id: newId("msg"), sender: "user", text, timestamp: nowIso() });
  const reply = await generateReply(text, commerce, conversation);
  conversation.messages.push({ id: newId("msg"), sender: "assistant", text: reply, timestamp: nowIso() });
  console.log(`[WhatsApp] Respondiendo: ${reply}`);
  await fetch(`https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: from, type: "text", text: { body: reply } })
  });
  res.sendStatus(200);
}));

// ================================================
// NUEVO: SCRAPER DE NEGOCIOS VIGO CON SERPAPI
// ================================================

// Función principal de scraping
async function scrapeNegociosVigo() {
  if (!process.env.SERPAPI_KEY) {
    console.error("❌ Falta SERPAPI_KEY en .env");
    return;
  }

  const categorias = [
    "restaurantes en Vigo centro",
    "bares en Casco Vello Vigo",
    "cafeterías Vigo",
    "tiendas de alimentación Vigo",
    "farmacias Vigo",
    "peluquerías Vigo centro",
    "supermercados Vigo",
    "gimnasios Vigo",
    "dentistas Vigo",
    // Añade aquí más según necesites
  ];

  console.log(`🚀 Iniciando scrape de ${categorias.length} categorías...`);

  for (const query of categorias) {
    try {
      console.log(`🔍 Buscando: ${query}`);

      const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&ll=@42.240,-8.720,14z&radius=10000&api_key=${process.env.SERPAPI_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      const results = data.local_results?.results || data.local_results || [];

      for (const place of results) {
        if (!place.title) continue;

        const negocio = {
          nombre: place.title,
          direccion: place.address || place.street || null,
          telefono: place.phone || null,
          google_place_id: place.place_id || null,
          tipo_negocio: query.split(" ")[0] || "Comercio",
          zona_barrio: extraerZona(place.address || ""), // Función auxiliar abajo
          latitud: place.gps_coordinates?.latitude || null,
          longitud: place.gps_coordinates?.longitude || null,
          horario: place.hours || null,
          web: place.website || null,
          fuente: "serpapi",
          datos_extra: place
        };

        // Upsert (inserta o actualiza)
        const { error } = await supabase
          .from('negocios_vigo')
          .upsert(negocio, { 
            onConflict: 'google_place_id',
            ignoreDuplicates: true 
          });

        if (error) {
          console.error(`Error guardando ${place.title}:`, error.message);
        } else {
          console.log(`✅ Guardado: ${place.title}`);
        }
      }
    } catch (err) {
      console.error(`❌ Error en categoría ${query}:`, err);
    }

    // Pequeña pausa para no saturar SerpAPI
    await new Promise(r => setTimeout(r, 800));
  }

  console.log("🎉 Scrape de negocios finalizado.");
}

// Función auxiliar para intentar detectar zona
function extraerZona(direccion: string): string {
  const zonas = ["Casco Vello", "Centro", "Bouzas", "Navia", "Teis", "Bajo de Guía", "Coia", "Zamáns"];
  for (const zona of zonas) {
    if (direccion.toLowerCase().includes(zona.toLowerCase())) return zona;
  }
  return "Vigo";
}

// === NUEVO ENDPOINT PARA LLAMAR AL SCRAPER ===
app.post("/scrape-negocios", asyncHandler(async (req: express.Request, res: express.Response) => {
  // Opcional: protección simple (puedes mejorar después)
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: "No autorizado" });
  }

  res.json({ message: "Scrape iniciado en background..." });
  
  // Ejecutar en segundo plano
  scrapeNegociosVigo().catch(console.error);
}));

// === MEJORA: Actualizar buscarEnSupabase para usar la nueva tabla ===
async function buscarEnSupabase(texto: string): Promise<CatalogBusiness[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("negocios_vigo")
    .select("*")
    .or(`nombre.ilike.%${texto}%,tipo_negocio.ilike.%${texto}%,categoria.ilike.%${texto}%`)
    .limit(5);

  if (error) {
    console.error("Error Supabase:", error);
    return [];
  }

  return (data || []).map(b => ({
    id: b.id,
    name: b.nombre,
    category: b.tipo_negocio || b.categoria || "Local",
    area: b.zona_barrio || "Vigo",
    address: b.direccion,
    phone: b.telefono,
    hours: b.horario,
    services: null,
    faqs: null,
    systemPrompt: null,
    keywords: [],
    sourceUrl: b.web || ""
  }));
}

app.listen(PORT, () => console.log(`Servidor AhorraAI en http://localhost:${PORT}`));