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
      body: { text: "👋 Hola, soy AhorraAI. ¿En qué puedo ayudarte?" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "buscar_negocio", title: "🔍 Buscar negocio" } },
          { type: "reply", reply: { id: "hacer_reserva", title: "📅 Hacer reserva" } },
          { type: "reply", reply: { id: "hablar_persona", title: "👤 Hablar con alguien" } }
        ]
      }
    }
  });
}

async function sendBusinessList(to: string, businesses: any[]) {
  if (businesses.length === 0) {
    await sendMessage(to, {
      type: "text",
      text: { body: `No encontré opciones verificadas. Contacta en ${escalationContact}.` }
    });
    return;
  }
  const rows = businesses.map((b: any) => ({
    id: `negocio_${b.id || b.name}`,
    title: b.name.substring(0, 24),
    description: `${b.type || "Local"}${b.address ? " · " + b.address.substring(0, 30) : ""}`
  }));
  await sendMessage(to, {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: "He encontrado estas opciones en Vigo:" },
      action: {
        button: "Ver opciones",
        sections: [{ title: "Negocios verificados", rows }]
      }
    }
  });
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

    // Mensaje de texto normal
    if (message.type === "text") {
      const text = message.text.body.toLowerCase().trim();
      const isGreeting = /^(hola|buenas|buenos|hey|hi|hello|ola|que tal|qué tal)/.test(text);
      if (isGreeting) {
        await sendWelcomeButtons(from);
      } else {
        const reply = await generateReply(message.text.body);
        await sendMessage(from, { type: "text", text: { body: reply } });
      }
      return res.status(200).send("OK");
    }

    // Respuesta a botón
    if (message.type === "interactive") {
      const interactive = message.interactive;

      if (interactive.type === "button_reply") {
        const buttonId = interactive.button_reply.id;
        if (buttonId === "buscar_negocio") {
          await sendMessage(from, {
            type: "text",
            text: { body: "¿Qué tipo de negocio buscas? Por ejemplo: restaurante, clínica dental, farmacia, taller mecánico..." }
          });
        } else if (buttonId === "hacer_reserva") {
          await sendMessage(from, {
            type: "text",
            text: { body: "¿Para qué negocio quieres hacer la reserva y para cuántas personas?" }
          });
        } else if (buttonId === "hablar_persona") {
          await sendMessage(from, {
            type: "text",
            text: { body: `Ahora mismo nuestro equipo está disponible en ${escalationContact}. También puedes seguir escribiéndome y te ayudo.` }
          });
        }
        return res.status(200).send("OK");
      }

      if (interactive.type === "list_reply") {
        const selectedId = interactive.list_reply.id;
        const selectedTitle = interactive.list_reply.title;
        await sendMessage(from, {
          type: "text",
          text: { body: `Has elegido *${selectedTitle}*. ¿Quieres hacer una reserva, un pedido o necesitas más información?` }
        });
        return res.status(200).send("OK");
      }
    }

    return res.status(200).send("OK");
  }

  return res.status(405).send("Method not allowed");
}
}