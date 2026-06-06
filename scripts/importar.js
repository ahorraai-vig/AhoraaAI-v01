import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { getJson } from "serpapi";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function importarNegocios(categoria, ubicacion) {
  console.log(`--- Buscando: ${categoria} en ${ubicacion} ---`);

  try {
    const results = await getJson({
      engine: "google_maps",
      q: `${categoria} en ${ubicacion}`,
      api_key: process.env.SERPAPI_KEY
    });

    if (!results.local_results) {
      console.log("No se encontraron locales.");
      return;
    }

    for (const local of results.local_results) {
      // Intentamos hacer upsert ahora que la tabla tiene la restricción UNIQUE
      const { error } = await supabase
        .from('businesses')
        .upsert({
          name: local.title,
          type: categoria,
          status: 'unclaimed',
          notes: `Google Maps Rating: ${local.rating || 'N/A'}`,
          phone: local.phone || null,
          website: local.website || null,
          address: local.address || null,
          maps_url: local.link || null
        }, { onConflict: 'name' });

      if (error) {
        console.error("Error al guardar:", local.title, error.message);
      } else {
        console.log("Guardado/Actualizado:", local.title);
      }
    }
    console.log("--- Proceso finalizado ---");
  } catch (err) {
    console.error("Error crítico:", err);
  }
}

const categoria = process.argv[2];
const ubicacion = process.argv[3] || "Vigo";

if (!categoria) {
  console.log("Uso: npx tsx scripts/importar.js <categoria> <ubicacion>");
} else {
  importarNegocios(categoria, ubicacion);
}