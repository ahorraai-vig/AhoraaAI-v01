import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const supabase = process.env.SUPABASE_URL && SUPABASE_KEY
  ? createClient(process.env.SUPABASE_URL, SUPABASE_KEY)
  : null;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

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

function buildCaption(b: any): string {
  return [
    `*${b.name}*`,
    b.type ? `🏷️ ${b.type}` : "",
    b.address ? `📍 ${b.address}` : "",
    b.phone ? `📞 ${b.phone}` : "",
    b.hours ? `🕒 ${b.hours}` : "",
    b.website ? `🌐 ${b.website}` : "",
    b.maps_url ? `🗺️ ${b.maps_url}` : ""
  ].filter(Boolean).join("\n");
}

// Envia la ficha de un negocio: foto (si hay) + datos, menu/catalogo en PDF
// (si hay) y botones de accion.
async function sendBusinessCard(to: string, b: any) {
  const caption = buildCaption(b);
  if (b.image_url) {
    await sendMessage(to, { type: "image", image: { link: b.image_url, caption } });
  } else {
    await sendMessage(to, { type: "text", text: { body: caption } });
  }
  if (b.menu_url) {
    await sendMessage(to, {
      type: "document",
      document: { link: b.menu_url, filename: `${b.name}.pdf`, caption: "📄 Menú / Catálogo" }
    });
  }
  const ref = b.id || b.name;
  await sendMessage(to, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: "¿Qué quieres hacer?" },
      action: {
        buttons: [
          { type: "reply", reply: { id: `reservar_negocio_${ref}`, title: "📅 Reservar" } },
          { type: "reply", reply: { id: `pedir_negocio_${ref}`, title: "🛒 Pedir" } }
        ]
      }
    }
  });
}

// Distancia en km entre dos coordenadas (formula haversine).
function distanciaKm(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371;
  const dLa = (la2 - la1) * Math.PI / 180;
  const dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2
    + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Devuelve los negocios mas cercanos a unas coordenadas, dentro de radioKm.
async function negociosCercanos(lat: number, lng: number, radioKm = 5) {
  if (!supabase) return [];
  const { data } = await supabase.from("businesses").select("*")
    .eq("status", "verified").not("lat", "is", null).not("lng", "is", null);
  return (data || [])
    .map((b: any) => ({ ...b, _dist: distanciaKm(lat, lng, b.lat, b.lng) }))
    .filter((b: any) => b._dist <= radioKm)
    .sort((a: any, b: any) => a._dist - b._dist)
    .slice(0, 5);
}

const STOPWORDS = new Set([
  "busco", "quiero", "donde", "dónde", "hay", "algun", "algún", "alguna",
  "necesito", "buscar", "puedo", "tienes", "tienen", "sobre", "para", "como",
  "cómo", "cerca", "vigo", "favor", "porfa", "quería", "queria", "recomienda",
  "recomiendame", "recomiéndame", "conoces", "sabes", "decir", "buenas"
]);

function palabraClaveDe(text: string) {
  const palabras = text.toLowerCase().replace(/[¿?¡!.,]/g, "").split(/\s+/);
  return palabras.find(w => w.length > 4 && !STOPWORDS.has(w))
    || palabras.find(w => w.length > 3 && !STOPWORDS.has(w))
    || text;
}

async function searchBusinesses(text: string) {
  if (!supabase) return [];
  const palabraClave = palabraClaveDe(text);
  const { data } = await supabase.from("businesses").select("*").eq("status", "verified")
    .or(`type.ilike.%${palabraClave}%,name.ilike.%${palabraClave}%,address.ilike.%${palabraClave}%`).limit(5);
  return data || [];
}

// Fallback: busca en Google (SerpAPI google_maps), devuelve los negocios y los
// guarda en Supabase como verified para no volver a gastar cuota la proxima vez.
async function searchSerpApi(text: string) {
  if (!SERPAPI_KEY) return [];
  const query = `${text} Vigo`;
  const url = `https://serpapi.com/search.json?engine=google_maps&type=search&hl=es`
    + `&q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}`;

  let local: any[] = [];
  try {
    const res = await fetch(url);
    const json: any = await res.json();
    local = json.local_results || [];
  } catch {
    return [];
  }
  if (local.length === 0) return [];

  const palabraClave = palabraClaveDe(text);
  const candidatos = local.slice(0, 5).map((r: any) => ({
    name: r.title,
    type: r.type || palabraClave,
    phone: r.phone || null,
    website: r.website || null,
    hours: typeof r.hours === "string" ? r.hours : (r.open_state || null),
    address: r.address || null,
    maps_url: r.place_id ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}` : null,
    image_url: r.thumbnail || null,
    lat: r.gps_coordinates?.latitude ?? null,
    lng: r.gps_coordinates?.longitude ?? null,
    status: "verified",
    notes: `Importado via SerpAPI (${query})`
  })).filter((c: any) => c.name);

  if (!supabase || candidatos.length === 0) return candidatos;

  // Evita duplicados: descarta los que ya existen por nombre.
  const nombres = candidatos.map((c: any) => c.name);
  const { data: existentes } = await supabase.from("businesses")
    .select("name").in("name", nombres);
  const yaExisten = new Set((existentes || []).map((e: any) => e.name.toLowerCase()));
  const nuevos = candidatos.filter((c: any) => !yaExisten.has(c.name.toLowerCase()));

  if (nuevos.length > 0) {
    const { data: insertados } = await supabase.from("businesses").insert(nuevos).select("*");
    if (insertados && insertados.length > 0) return insertados;
  }
  return candidatos;
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
      const isGreeting = /^(hola|buenas|buenos|hey|hi|hello|ola|que tal|qué tal|inicio|menu|menú)$/.test(lower);

      if (isGreeting) {
        await sendWelcomeButtons(from);
      } else {
        // Para cualquier consulta: primero Supabase, luego SerpAPI; si no hay
        // nada en ninguno, responde Claude. Asi reconoce cualquier negocio.
        let businesses = await searchBusinesses(text);
        if (businesses.length === 0) {
          businesses = await searchSerpApi(text);
        }
        if (businesses.length > 0) {
          await sendBusinessResults(from, businesses);
        } else {
          const reply = await generateReply(text);
          await sendMessage(from, { type: "text", text: { body: reply } });
        }
      }
      return res.status(200).send("OK");
    }

    // Ubicacion compartida por el usuario
    if (message.type === "location") {
      const { latitude, longitude } = message.location || {};
      if (latitude && longitude) {
        const cercanos = await negociosCercanos(latitude, longitude);
        if (cercanos.length > 0) {
          await sendMessage(from, {
            type: "text",
            text: { body: "📍 Estos son los negocios más cercanos a tu ubicación:" }
          });
          await sendBusinessResults(from, cercanos);
        } else {
          await sendMessage(from, {
            type: "text",
            text: { body: "No encontré negocios cerca de tu ubicación todavía. Dime qué buscas y te ayudo." }
          });
        }
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
          const ref = id.replace("negocio_", "");
          const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
          let negocio: any = null;
          if (supabase) {
            const q = supabase.from("businesses").select("*");
            const { data } = await (esUuid ? q.eq("id", ref) : q.eq("name", ref)).limit(1);
            negocio = data?.[0] || null;
          }
          if (negocio) {
            await sendBusinessCard(from, negocio);
          } else {
            await sendMessage(from, {
              type: "interactive",
              interactive: {
                type: "button",
                body: { text: `Has elegido *${title}*. ¿Qué quieres hacer?` },
                action: {
                  buttons: [
                    { type: "reply", reply: { id: `reservar_${id}`, title: "📅 Reservar" } },
                    { type: "reply", reply: { id: `pedir_${id}`, title: "🛒 Pedir" } }
                  ]
                }
              }
            });
          }
        }
        return res.status(200).send("OK");
      }
    }

    return res.status(200).send("OK");
  }

  return res.status(405).send("Method not allowed");
}