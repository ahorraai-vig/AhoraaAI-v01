import { BusinessClient } from "../types";

const SHEET_NAME = "Clientes";

/**
 * Creates a brand new spreadsheet in the user's Google Drive with custom B2B client headers.
 */
export async function createSpreadsheet(accessToken: string): Promise<string> {
  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: "AhorraAI - Panel de Clientes (Vigo)",
      },
      sheets: [
        {
          properties: {
            title: SHEET_NAME,
            gridProperties: {
              frozenRowCount: 1, // Freeze header row for perfect readability
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Error al crear la hoja de cálculo en Google Sheets.");
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Initialize headers
  await writeSpreadsheetHeaders(accessToken, spreadsheetId);

  return spreadsheetId;
}

/**
 * Appends standard headers on the newly created spreadsheet.
 */
async function writeSpreadsheetHeaders(accessToken: string, spreadsheetId: string): Promise<void> {
  const range = `${SHEET_NAME}!A1:I1`;
  const values = [
    [
      "ID",
      "Nombre del Negocio",
      "Tipo de Negocio",
      "Estado",
      "Precio Mensual (EUR)",
      "Servicios Upsell",
      "Fecha de Inicio",
      "Próxima Facturación",
      "Notas",
    ],
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values,
      }),
    }
  );
}

/**
 * Fetch all clients from Google Sheet
 */
export async function fetchClientsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<BusinessClient[]> {
  const range = `${SHEET_NAME}!A2:I150`; // Support up to 150 clients
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "No se pudo leer la hoja de cálculo. Verifica el ID.");
  }

  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any, index: number) => {
    return {
      id: (index + 2).toString(), // Map ID to row number (starts at row 2)
      name: row[1] || "",
      type: row[2] || "Restaurante",
      status: (row[3] || "trial") as any,
      monthlyPrice: Number(row[4]) || 99,
      upsells: row[5] ? row[5].split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      startDate: row[6] || "",
      nextBillingDate: row[7] || "",
      notes: row[8] || "",
    };
  });
}

/**
 * Writes or updates the full client list on Google Sheets.
 * Overwriting values in the active grid range of sheets.
 */
export async function saveClientsToSheet(
  accessToken: string,
  spreadsheetId: string,
  clients: BusinessClient[]
): Promise<void> {
  // Clear the existing range first to prevent stale rows when deleting/shrinking
  const clearRange = `${SHEET_NAME}!A2:I200`;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (clients.length === 0) return;

  const range = `${SHEET_NAME}!A2:I${clients.length + 1}`;
  const values = clients.map((client, index) => {
    return [
      client.id || (index + 2).toString(),
      client.name,
      client.type,
      client.status,
      client.monthlyPrice,
      client.upsells.join(", "),
      client.startDate,
      client.nextBillingDate,
      client.notes,
    ];
  });

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Fallo al guardar clientes en Google Sheets.");
  }
}
