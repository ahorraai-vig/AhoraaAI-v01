export interface BusinessIntake {
  businessName: string;
  businessType: string;
  address: string;
  phone: string;
  whatsapp: string;
  website: string;
  hours: string;
  services: string;
  allergens: string;
  faqs: string;
  neverSay: string;
  tone: "cercano" | "profesional" | "informal" | "formal";
  escalationContact: string;
  useGalicianAccents: boolean;
}

export type ClientStatus = "trial" | "active" | "inactive";

export interface BusinessClient {
  id?: string; // row index or generated id
  name: string;
  type: string;
  status: ClientStatus;
  monthlyPrice: number; // 99, 149, 199
  upsells: string[]; // e.g. ["Chat Web", "Integración WhatsApp", "Multiidioma", "Soporte VIP"]
  startDate: string;
  nextBillingDate: string;
  notes: string;
}

export interface ReportInputs {
  businessName: string;
  businessType: string;
  clientEmail: string;
  totalConversations: number;
  reservationsCaptured: number;
  peakDay: string;
  topThreeQuestions: string;
  monthlyPrice: number;
  monthsActive: number;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}
