import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  : null;

const systemPrompt = "Eres AhorraAI, un asistente que ayuda a usuarios a descubrir y comprar oferta local de Vigo. No inventes informacion. Responde siempre en español, de forma breve y directa.";
const escalationContact = "+34 614053674";
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const TOKEN = process.env.WHATSAPP_TOKEN;

async function sendMessage(to: string, body: any) {
  await fetch(`https://graph.facebook.com/v25.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to, ...body })
  });
}

async function sendWelcomeButtons(to: string) {
  await sendMessage(to, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: "👋 Hola, soy AhorraAI. Tu asistente local en Vigo.\n\n¿En qué puedo ayudarte?" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "buscar_negocio", title: "🔍 Buscar negocio" } },
          { type: "reply", reply: { id: "reservar_pedir", title: "📅 Reservar o pedir" } },
          { type: "reply", reply: { id: "mas_opciones", title: "ℹ️ Más opciones" } }
        ]
      }
    }
  });
}

async function sendMoreOptions(to: string) {
  await sendMessage(to, {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: "¿Qué necesitas?" },
      action: {
        button: "Ver opciones",
        sections: [{
          title: "Opciones disponibles",
          rows: [
            { id: "recomendaciones", title: "⭐ Recomendaciones", description: "Negocios destacados en Vigo" },
            { id: "mi_lista", title: "📋 Mi lista", description: "Tus negocios y pedidos guardados" },
            { id: "hacer_pedido", title: "🛒 Hacer pedido", description: "Pedir a domicilio o recogida" },
            { id: "ayuda", title: "❓ Ayuda", description: "Cómo funciona AhorraAI" },
            { id: "hablar_persona", title: "👤 Hablar con alguien", description: "Contactar con el equipo" }
          ]
        }]
      }
    }
  });
}

async function sendBusinessResults(to: string, businesses: any[]) {
  if (businesses.length === 0) {
    await sendMessage(to, {
      type: "text",
      text: { body: `No encontré opciones verificadas para esa búsqueda. Contacta con nosotros en ${escalationContact}.` }
    });
    return;
  }
  const rows = businesses.map((b: any) => ({
    id: `negocio_${b.id || b.name}`,
    title: b.name.substring(0, 24),
    description: `${b.type || "Local"}${b.address ? " · " + b.address.substring(0, 30) : ""}${b.phone ? " · " + b.phone : ""}`
  }));
  await sendMessage(to, {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: "He encontrado estas opciones en Vigo:" },
      action: {
        button: "Ver negocios",
        sections: [{ title: "Negocios verificados", rows }]
      }
    }
  });
}

async function searchBusinesses(text: string) {
  if (!supabase) return [];
  const palabraClave = text.toLowerCase().split(" ").find(w => w.length > 4) || text;
  const { data } = await supabase.from("businesses").select("*").eq("status", "verified")
    .or(`type.ilike.%${palabraClave}%,name.ilike.%${palabraClave}%`).limit(5);
  return data || [];
}

async function generateReply(text: string): Promise<string> {
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
      system: systemPrompt,
      messages: [{ role: "user", content: text }]
    })
  });
  const data: any = await response.json();
  return data.content?.[0]?.text || "No pude generar respuesta.";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  if (req.method === "POST") {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return res.status(404).send("Not found");
    const entry = body.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    if (!message) return res.status(200).send("OK");

    const from = message.from;

    // Mensaje de texto
    if (message.type === "text") {
      const text = message.text.body;
      const lower = text.toLowerCase().trim();
      const isGreeting = /^(hola|buenas|buenos|hey|hi|hello|ola|que tal|qué tal|inicio|menu|menú)/.test(lower);
      const isCatalogQuery = /(busco|quiero|reservar|pedido|pedir|domicilio|restaurante|cafeteria|masaje|farmacia|clinica|taller)/i.test(lower);

      if (isGreeting) {
        await sendWelcomeButtons(from);
      } else if (isCatalogQuery) {
        const businesses = await searchBusinesses(text);
        await sendBusinessResults(from, businesses);
      } else {
        const reply = await generateReply(text);
        await sendMessage(from, { type: "text", text: { body: reply } });
      }
      return res.status(200).send("OK");
    }

    // Respuesta interactiva
    if (message.type === "interactive") {
      const interactive = message.interactive;

      if (interactive.type === "button_reply") {
        const id = interactive.button_reply.id;

        if (id === "buscar_negocio") {
          await sendMessage(from, {
            type: "text",
            text: { body: "¿Qué tipo de negocio buscas? Por ejemplo: restaurante, clínica dental, farmacia, peluquería, taller mecánico..." }
          });
        } else if (id === "reservar_pedir") {
          await sendMessage(from, {
            type: "text",
            text: { body: "¿Para qué negocio quieres hacer la reserva o el pedido? Dime el nombre o el tipo de negocio." }
          });
        } else if (id === "mas_opciones") {
          await sendMoreOptions(from);
        }
        return res.status(200).send("OK");
      }

      if (interactive.type === "list_reply") {
        const id = interactive.list_reply.id;
        const title = interactive.list_reply.title;

        if (id === "recomendaciones") {
          const businesses = await searchBusinesses("restaurante");
          await sendBusinessResults(from, businesses);
        } else if (id === "mi_lista") {
          await sendMessage(from, {
            type: "text",
            text: { body: "📋 Aún estamos construyendo tu lista personal. Por ahora puedes buscar cualquier negocio y te ayudo a contactar con ellos." }
          });
        } else if (id === "hacer_pedido") {
          await sendMessage(from, {
            type: "text",
            text: { body: "🛒 ¿De qué negocio quieres hacer el pedido? Dime el nombre o el tipo y te ayudo." }
          });
        } else if (id === "ayuda") {
          await sendMessage(from, {
            type: "text",
            text: { body: "❓ *¿Cómo funciona AhorraAI?*\n\n1. Escríbeme qué tipo de negocio buscas en Vigo\n2. Te muestro opciones reales y verificadas\n3. Te ayudo a reservar, pedir o contactar\n\nSiempre con información real, sin inventar nada. 🙌" }
          });
        } else if (id === "hablar_persona") {
          await sendMessage(from, {
            type: "text",
            text: { body: `👤 Nuestro equipo está disponible en ${escalationContact}. También puedes seguir escribiéndome y te ayudo en lo que pueda.` }
          });
        } else if (id.startsWith("negocio_")) {
          await sendMessage(from, {
            type: "interactive",
            interactive: {
              type: "button",
              body: { text: `Has elegido *${title}*. ¿Qué quieres hacer?` },
              action: {
                buttons: [
                  { type: "reply", reply: { id: `reservar_${id}`, title: "📅 Reservar" } },
                  { type: "reply", reply: { id: `pedir_${id}`, title: "🛒 Pedir" } },
                  { type: "reply", reply: { id: `info_${id}`, title: "ℹ️ Más info" } }
                ]
              }
            }
          });
        }
        return res.status(200).send("OK");
      }
    }

    return res.status(200).send("OK");
  }

  return res.status(405).send("Method not allowed");
}