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
type CatalogBusiness = { id: string; name: string; category: string; area: string; address: string | null; phone: string | null; hours: string | null; services: string[]; keywords: string[]; sourceUrl: string; };
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
  return (data || []).map(b => ({ id: b.id || b.name, name: b.name, category: b.type || "Local", area: "Vigo", address: b.address || null, phone: b.phone || null, hours: null, services: [], keywords: [], sourceUrl: b.maps_url || "" }));
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

  // 1. Buscamos en la base de datos si la pregunta tiene que ver con comercios
  if (isCatalogQuery(text)) {
    const negocios = await buscarEnSupabase(text);
    
    if (negocios.length > 0) {
      contextoAhorraAI = "\n\nAquí tienes la información extraída de nuestra base de datos de AhorraAI para responder al usuario. Usa ESTOS datos exactos:\n";
      negocios.forEach(negocio => {
        contextoAhorraAI += `- Nombre: ${negocio.name}, Categoría: ${negocio.category}, Dirección: ${negocio.address || "No especificada"}, Teléfono: ${negocio.phone || "No especificado"}\n`;
      });
    } else {
      contextoAhorraAI = `\n\nHe buscado en la base de datos pero no he encontrado comercios locales para esta petición. Pide disculpas amablemente y ofrece el teléfono de contacto manual: ${commerce.escalationContact}.`;
    }
  }

  // 2. Unimos las instrucciones base con los datos encontrados
  const systemPromptEnriquecido = commerce.systemPrompt + contextoAhorraAI;

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

app.listen(PORT, () => console.log(`Servidor AhorraAI en http://localhost:${PORT}`));