import React, { useState, useEffect } from "react";
import { BusinessClient, ClientStatus } from "../types";
import {
  googleSignIn,
  getAccessToken,
  logout as authLogout,
  initAuth,
} from "../lib/firebaseStore";
import {
  createSpreadsheet,
  fetchClientsFromSheet,
  saveClientsToSheet,
} from "../lib/sheetsService";
import {
  Database,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  Check,
  AlertTriangle,
  LogOut,
  FolderSync,
  X,
  Search,
  TrendingUp,
} from "lucide-react";
import { User } from "firebase/auth";

interface ClientManagerProps {
  onSelectBusiness: (name: string, type: string) => void;
}

const UPSELL_OPTIONS = [
  "Burbuja Chat Web",
  "Pasarela WhatsApp 24/7",
  "Soporte Gallego y Multiidioma",
  "Reportes Premium de ROI",
  "Integración con Reservas",
];

export default function ClientManager({ onSelectBusiness }: ClientManagerProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [spreadsheetId, setSpreadsheetId] = useState<string>("");
  const [inputSpreadsheetId, setInputSpreadsheetId] = useState("");
  const [clients, setClients] = useState<BusinessClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [sheetsError, setSheetsError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Client Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedClientIndex, setSelectedClientIndex] = useState<number | null>(null);
  const [modalClient, setModalClient] = useState<BusinessClient>({
    name: "",
    type: "Restaurantes",
    status: "trial",
    monthlyPrice: 99,
    upsells: [],
    startDate: new Date().toISOString().split("T")[0],
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
  });

  // Load saved configurations from LocalStorage
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setNeedsAuth(false);
        setIsLoadingAuth(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
        setIsLoadingAuth(false);
      }
    );

    const savedSheetId = localStorage.getItem("ahorraai_spreadsheet_id");
    if (savedSheetId) {
      setSpreadsheetId(savedSheetId);
      setInputSpreadsheetId(savedSheetId);
    }

    return () => unsubscribe();
  }, []);

  // Fetch clients whenever auth token or spreadsheet ID becomes available
  useEffect(() => {
    if (accessToken && spreadsheetId) {
      loadClientsData();
    }
  }, [accessToken, spreadsheetId]);

  const loadClientsData = async () => {
    setIsLoadingClients(true);
    setSheetsError("");
    try {
      const data = await fetchClientsFromSheet(accessToken!, spreadsheetId);
      setClients(data);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || "Fallo inesperado al recuperar los datos de Google Sheets.");
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoadingAuth(true);
    setSheetsError("");
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error(err);
      setSheetsError("Fallo al iniciar sesión con Google. Inténtalo de nuevo.");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    await authLogout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setClients([]);
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) return;
    setIsLoadingClients(true);
    setSheetsError("");
    try {
      const newId = await createSpreadsheet(accessToken);
      setSpreadsheetId(newId);
      setInputSpreadsheetId(newId);
      localStorage.setItem("ahorraai_spreadsheet_id", newId);
      setSuccessMsg("¡Hoja de cálculo creada con éxito en tu Google Sheets!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || "No se pudo crear el archivo de Google Sheets.");
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleLinkExistingSheet = () => {
    if (!inputSpreadsheetId.trim()) return;
    const cleanId = extractSpreadsheetId(inputSpreadsheetId);
    setSpreadsheetId(cleanId);
    localStorage.setItem("ahorraai_spreadsheet_id", cleanId);
    setSuccessMsg("Hoja vinculada con éxito. Cargando clientes...");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const extractSpreadsheetId = (input: string): string => {
    // Check if user pasted a complete Google Sheet URL or just the ID
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  };

  const handleUnlinkSheet = () => {
    if (window.confirm("¿Seguro que deseas desvincular la hoja de cálculo actual de AhorraAI? No se perderán tus datos en Google Sheets.")) {
      setSpreadsheetId("");
      localStorage.removeItem("ahorraai_spreadsheet_id");
      setClients([]);
    }
  };

  // CRUD Actions
  const openCreateModal = () => {
    setModalMode("create");
    setSelectedClientIndex(null);
    setModalClient({
      name: "",
      type: "Restaurantes",
      status: "trial",
      monthlyPrice: 99,
      upsells: [],
      startDate: new Date().toISOString().split("T")[0],
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (client: BusinessClient, index: number) => {
    setModalMode("edit");
    setSelectedClientIndex(index);
    setModalClient({ ...client });
    setIsModalOpen(true);
  };

  const toggleModalUpsell = (upsell: string) => {
    setModalClient((prev) => {
      const isSelected = prev.upsells.includes(upsell);
      const newUpsells = isSelected
        ? prev.upsells.filter((u) => u !== upsell)
        : [...prev.upsells, upsell];
      return { ...prev, upsells: newUpsells };
    });
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !spreadsheetId) return;

    // MANDATORY confirmation dialogue
    const actionLabel = modalMode === "create" ? "registrar" : "guardar los cambios para";
    const confirmed = window.confirm(`¿Estás seguro que deseas ${actionLabel} el cliente "${modalClient.name}" en tu Google Sheet?`);
    if (!confirmed) return;

    setIsLoadingClients(true);
    setSheetsError("");
    try {
      let updatedClients = [...clients];
      if (modalMode === "create") {
        updatedClients.push({
          ...modalClient,
          id: (clients.length + 2).toString(), // Map to sheets coordinate
        });
      } else if (selectedClientIndex !== null) {
        updatedClients[selectedClientIndex] = { ...modalClient };
      }

      await saveClientsToSheet(accessToken, spreadsheetId, updatedClients);
      setClients(updatedClients);
      setIsModalOpen(false);
      setSuccessMsg(`Cliente "${modalClient.name}" guardado correctamente en Google Sheets.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || "Error al sincronizar datos en Google Sheets.");
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleDeleteClient = async (indexToDelete: number, clientName: string) => {
    if (!accessToken || !spreadsheetId) return;

    // MANDATORY confirmation dialogue for DELETIVE action
    const confirmed = window.confirm(
      `⚠️ ATENCIÓN: ¿Estás seguro que deseas eliminar permanentemente a "${clientName}" de tu listado de Google Sheets? Esta acción mutará tu hoja de cálculo.`
    );
    if (!confirmed) return;

    setIsLoadingClients(true);
    setSheetsError("");
    try {
      const updatedClients = clients.filter((_, idx) => idx !== indexToDelete);
      await saveClientsToSheet(accessToken, spreadsheetId, updatedClients);
      setClients(updatedClients);
      setSuccessMsg(`Negocio "${clientName}" eliminado de Google Sheets con éxito.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || "Fallo al borrar el cliente en la hoja de cálculo.");
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Calculations
  const totalMRR = clients
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + c.monthlyPrice, 0);

  const activeClientsCount = clients.filter((c) => c.status === "active").length;
  const trialClientsCount = clients.filter((c) => c.status === "trial").length;

  // Filter & Search application
  const filteredClients = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoadingAuth) {
    return (
      <div className="bg-[#12151B] border border-slate-800/60 rounded-2xl p-10 shadow-xl flex flex-col items-center justify-center text-slate-200 min-h-[300px]">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <p className="text-sm font-medium">Iniciando verificación de acceso con Google Sheets...</p>
      </div>
    );
  }

  // View: Not Authenticated yet
  if (needsAuth) {
    return (
      <div id="auth-gate-panel" className="bg-[#12151B] border border-slate-800/60 rounded-2xl p-8 shadow-xl text-center text-slate-200 max-w-2xl mx-auto space-y-6">
        <div className="mx-auto w-16 h-16 bg-[#1A1F26] border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 mb-2">
          <Database className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-sans font-semibold text-white">4. Conexión de Persistencia con Google Sheets</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Para gestionar la base de datos de tus clientes, AhorraAI utiliza <strong className="text-indigo-400">Google Sheets como memoria persistente 24/7</strong>.
            Inicia sesión con tu cuenta de Google para poder leer y escribir suscripciones de la operadora dende Vigo.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={handleGoogleLogin}
            id="btn-google-auth-login"
            className="gsi-material-button bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 font-medium px-5 py-3 rounded-xl shadow-md transition-all flex items-center gap-3 cursor-pointer text-sm"
          >
            <div className="gsi-material-button-icon">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "20px", height: "20px" }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            </div>
            <span className="gsi-material-button-contents font-sans font-semibold">Iniciar Sesión con Google</span>
          </button>
        </div>
      </div>
    );
  }

  // View: Connected to Google but no spreadsheet linked yet
  if (!spreadsheetId) {
    return (
      <div id="sheet-wizard-panel" className="bg-[#12151B] border border-slate-800/60 rounded-2xl p-6 shadow-xl text-slate-200 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-805/40 pb-4">
          <div className="flex items-center gap-2">
            <span className="bg-[#1A1F26] text-indigo-400 p-2 rounded-xl">🔒</span>
            <div className="text-left">
              <span className="text-xs text-slate-500 font-mono">AUTENTICADO COMO</span>
              <h3 className="text-sm font-sans font-bold text-white">{user?.email}</h3>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[11px] text-red-400 hover:bg-[#1A1F26] border border-slate-700/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>

        <div className="space-y-2 text-center">
          <h3 className="text-base font-sans font-semibold text-white">Configuración del Gestor de Clientes</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            No tienes vinculada ninguna hoja de cálculo para AhorraAI en Vigo. Elige una de estas dos sencillas opciones:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Option 1: Auto-create sheets file */}
          <div className="bg-[#1A1F26] p-5 rounded-xl border border-slate-800/60 flex flex-col justify-between text-left space-y-4">
            <div>
              <span className="text-xs font-mono text-indigo-400 font-bold">OPCIÓN AUTOMÁTICA (RECOMENDADO)</span>
              <h4 className="text-sm font-sans font-bold text-white mt-1">Crear nueva hoja en blanco</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                AhorraAI creará automáticamente una hoja de cálculo en tu Google Drive con la estructura de variables, columnas y formatos correctos para Vigo.
              </p>
            </div>
            <button
              id="btn-create-sheet"
              onClick={handleCreateNewSheet}
              disabled={isLoadingClients}
              className="w-full bg-indigo-600 hover:bg-indigo-505 disabled:bg-[#12151B] text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {isLoadingClients ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creando archivo...
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  Crear Hoja en Google Drive
                </>
              )}
            </button>
          </div>

          {/* Option 2: Link existing ID */}
          <div className="bg-[#1A1F26] p-5 rounded-xl border border-slate-800/60 flex flex-col justify-between text-left space-y-4">
            <div>
              <span className="text-xs font-mono text-indigo-400 font-bold">OPCIÓN MANUAL</span>
              <h4 className="text-sm font-sans font-bold text-white mt-1">Vincular hoja existente dende Vigo</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Pega la URL completa de tu Google Sheet o el Spreadsheet ID donde almacenas la cartera de clientes.
              </p>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                id="link-sheet-id-input"
                value={inputSpreadsheetId}
                onChange={(e) => setInputSpreadsheetId(e.target.value)}
                placeholder="ID de la Hoja o enlace completo..."
                className="w-full bg-[#0F1115] border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
              />
              <button
                id="btn-link-action"
                onClick={handleLinkExistingSheet}
                disabled={!inputSpreadsheetId.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#12151B] text-white text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                Vincular Documento
              </button>
            </div>
          </div>
        </div>

        {sheetsError && (
          <div className="text-xs bg-red-950/40 text-red-405 border border-red-900/40 p-3 rounded-lg flex items-center gap-1.5 justify-center">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            {sheetsError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upper Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric Column 1: Connected Sheet ID */}
        <div className="bg-[#12151B] border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between text-left h-28 relative overflow-hidden">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">BASE DE DATOS GOOGLE</span>
            <span className="text-xs font-bold text-white mt-1 block truncate">
              AhorraAI Vigo - Sincronizado
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 font-mono"
            >
              Abrir Hoja <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span className="text-slate-700 font-mono">|</span>
            <button
              onClick={handleUnlinkSheet}
              className="text-[10px] text-red-400 hover:underline font-mono cursor-pointer"
            >
              Desvincular
            </button>
          </div>
          <span className="absolute bottom-2 right-4 text-4xl select-none opacity-5">📊</span>
        </div>

        {/* Metric Column 2: Total Active Subscription MRR */}
        <div className="bg-[#12151B] border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between text-left h-28 relative overflow-hidden">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">INGRESOS MENSUALES (MRR)</span>
          <span className="text-2xl font-sans font-semibold text-indigo-400 mt-1 flex items-baseline">
            {totalMRR}€ <span className="text-[10px] font-mono text-slate-500 font-normal ml-1">/ mes</span>
          </span>
          <span className="text-[11px] text-slate-450 mt-1 block font-sans">
            Facturado sobre clientes con suscripción Activa
          </span>
          <span className="absolute bottom-2 right-4 text-4xl select-none opacity-5 text-indigo-550">💰</span>
        </div>

        {/* Metric Column 3: Active Subscriptions count */}
        <div className="bg-[#12151B] border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between text-left h-28 relative overflow-hidden">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">SUSCRIPTORES CONTRATADOS</span>
          <span className="text-2xl font-sans font-semibold text-white mt-1">
            {activeClientsCount} <span className="text-xs font-sans font-normal text-slate-500 font-mono">activos</span>
          </span>
          <span className="text-[11px] text-slate-450 mt-1 block font-sans">
            Soportes continuos dende tu panel de Vigo
          </span>
          <span className="absolute bottom-2 right-4 text-4xl select-none opacity-5">🚀</span>
        </div>

        {/* Metric Column 4: Trial Subscriptions count */}
        <div className="bg-[#12151B] border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between text-left h-28 relative overflow-hidden">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">CLIENTES EN PRUEBA (TRIAL)</span>
          <span className="text-2xl font-sans font-semibold text-orange-400 mt-1">
            {trialClientsCount} <span className="text-xs font-sans font-normal text-slate-500 font-mono">en trial</span>
          </span>
          <span className="text-[11px] text-slate-450 mt-1 block font-sans">
            Potenciales conversiones comerciales
          </span>
          <span className="absolute bottom-2 right-4 text-4xl select-none opacity-5">⌛</span>
        </div>
      </div>

      {/* Main Table controls Area */}
      <div className="bg-[#12151B] border border-slate-800/60 rounded-2xl p-6 shadow-xl text-slate-200">
        
        {/* Header Action Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-5 mb-5">
          <div>
            <h2 className="text-lg font-sans font-semibold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Gestión de Cartera de Clientes (Google Sheets Activo)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Sincronizado en tiempo real. Edita o añade la información, y la IA mutará tu hoja de cálculo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-sync-sheet-now"
              onClick={loadClientsData}
              disabled={isLoadingClients}
              className="text-xs bg-[#1A1F26] hover:bg-slate-800 disabled:bg-slate-900 border border-slate-800/60 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FolderSync className="w-4 h-4" />
              Sincronizar
            </button>
            <button
              id="btn-add-client-modal"
              onClick={openCreateModal}
              disabled={isLoadingClients}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-md hover:shadow-indigo-500/10"
            >
              <Plus className="w-4 h-4" />
              Añadir Negocio
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-center gap-3 mb-5">
          <div className="w-full md:flex-1 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              id="search-client-text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente local por nombre, tipo, notas o servicios de Vigo..."
              className="w-full bg-[#1A1F26] border border-slate-800/80 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none transition-all placeholder-slate-600 focus:ring-1 focus:ring-indigo-555"
            />
          </div>
          <div className="w-full md:w-48 flex items-center gap-1">
            <label className="text-xs font-mono text-slate-500 uppercase tracking-widest shrink-0">Filtrar:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              id="filter-status-select"
              className="w-full bg-[#1A1F26] border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-550"
            >
              <option value="all">Suscripción (Todos)</option>
              <option value="active">🟢 Activos</option>
              <option value="trial">🟡 Periodo de Prueba</option>
              <option value="inactive">🔴 Inactivos</option>
            </select>
          </div>
        </div>

        {/* Alerts Block */}
        {sheetsError && (
          <div className="bg-red-950/40 border border-red-900/45 p-4 rounded-xl text-xs text-red-400 mb-5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {sheetsError}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/40 border border-emerald-900/45 p-4 rounded-xl text-xs text-emerald-400 mb-5 flex items-center gap-2">
            <Check className="w-4 h-4" /> {successMsg}
          </div>
        )}

        {/* Dynamic Client Table */}
        {isLoadingClients ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-450">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <p className="text-xs font-mono">Actualizando y consultando celdas en Google Sheets...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-xl py-14 text-center text-slate-500 space-y-2">
            <p className="text-sm">No se encontraron clientes registrados con esos criterios.</p>
            <p className="text-xs text-slate-600">Haz clic en "Añadir Negocio" para registrar el primero dende Vigo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-[#0F1115]/50">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1A1F26] border-b border-slate-800/80 font-mono text-slate-400 text-[10px] uppercase tracking-wider">
                  <th className="p-4">Negocio</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Suscripción</th>
                  <th className="p-2">Cuota</th>
                  <th className="p-4 max-w-xs">Servicios Activos</th>
                  <th className="p-4">Próxima Factura</th>
                  <th className="p-4">Operaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredClients.map((client, idx) => {
                  const dataIndex = clients.findIndex((c) => c.id === client.id);
                  return (
                    <tr key={client.id || idx} className="hover:bg-[#1A1F26]/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{client.name}</div>
                        {client.notes && (
                          <div className="text-[10px] text-slate-500 italic max-w-xs truncate mt-0.5">
                            {client.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-sans text-slate-300">
                        {client.type}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            client.status === "active"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/70"
                              : client.status === "trial"
                              ? "bg-amber-950/65 text-amber-450 border border-amber-900/65"
                              : "bg-red-950/60 text-red-400 border border-red-900/70"
                          }`}
                        >
                          {client.status === "active"
                            ? "Activo"
                            : client.status === "trial"
                            ? "Prueba"
                            : "Inactivo"}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-white text-right pr-6">
                        {client.monthlyPrice}€<span className="text-[10px] text-slate-500">/mes</span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                           {client.upsells.length === 0 ? (
                            <span className="text-slate-600 font-serif lowercase italic">Soporte básico</span>
                          ) : (
                            client.upsells.map((up, uIdx) => (
                              <span
                                key={uIdx}
                                className="text-[9px] bg-[#1A1F26] text-indigo-300 border border-slate-700/40 px-1.5 py-0.5 rounded"
                              >
                                {up}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-400">
                        {client.nextBillingDate || "No agendada"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            title="Generar Prompt de este cliente"
                            onClick={() => onSelectBusiness(client.name, client.type)}
                            className="text-[10px] bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-400 border border-indigo-900/50 px-2 py-1 rounded transition-all cursor-pointer font-semibold"
                          >
                            🤖 Ver Prompt
                          </button>
                          <button
                            onClick={() => openEditModal(client, dataIndex)}
                            className="p-1.5 bg-[#1A1F26] hover:bg-[#252C36] text-slate-300 rounded border border-slate-800 transition-all cursor-pointer"
                            title="Editar Suscripción"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(dataIndex, client.name)}
                            className="p-1.5 bg-red-950/30 hover:bg-red-900/60 hover:text-white text-red-400 rounded transition-all border border-transparent hover:border-red-905 cursor-pointer"
                            title="Eliminar Negocio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit/Create Subscription Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0A0C10]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#12151B] border border-slate-800 rounded-2xl p-6 max-w-lg w-full text-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3.5 mb-4">
              <h3 className="text-base font-sans font-semibold text-white">
                {modalMode === "create" ? "🆕 Crear Registro Comercial" : "✏️ Editar Suscripción del Negocio"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-450 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Field 1: Name */}
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
                  Nombre Comercial del local
                </label>
                <input
                  type="text"
                  required
                  value={modalClient.name}
                  onChange={(e) => setModalClient({ ...modalClient, name: e.target.value })}
                  placeholder="Ej. Parrillada Alborada Vigo"
                  className="w-full bg-[#1A1F26] border border-slate-800 focus:border-indigo-505 rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Field 2: Business Type */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
                    Tipo de negocio
                  </label>
                  <select
                    value={modalClient.type}
                    onChange={(e) => setModalClient({ ...modalClient, type: e.target.value })}
                    className="w-full bg-[#1A1F26] border border-slate-800 rounded-lg px-2 py-2 text-xs text-white outline-none"
                  >
                    <option value="Restaurantes">Restaurante</option>
                    <option value="Peluquerías">Peluquería</option>
                    <option value="Clínicas Dentales">Dental</option>
                    <option value="Gimnasios">Gimnasio</option>
                    <option value="Despachos de Abogados">Abogado</option>
                    <option value="Talleres Mecánicos">Taller</option>
                    <option value="Hoteles">Hotel</option>
                    <option value="Otros">Servicios</option>
                  </select>
                </div>

                {/* Field 3: Status */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
                    Estado de Suscripción
                  </label>
                  <select
                    value={modalClient.status}
                    onChange={(e) =>
                      setModalClient({ ...modalClient, status: e.target.value as ClientStatus })
                    }
                    className="w-full bg-[#1A1F26] border border-slate-800 rounded-lg px-2 py-2 text-xs text-white outline-none"
                  >
                    <option value="trial">🟡 Periodo de Prueba</option>
                    <option value="active">🟢 Activo</option>
                    <option value="inactive">🔴 Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Field 4: Price tier */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
                    Cuota mensual (€/mes)
                  </label>
                  <select
                    value={modalClient.monthlyPrice}
                    onChange={(e) =>
                      setModalClient({ ...modalClient, monthlyPrice: Number(e.target.value) })
                    }
                    className="w-full bg-[#1A1F26] border border-slate-800 rounded-lg px-2 py-2 text-xs text-white outline-none"
                  >
                    <option value={99}>99€ - Plan Planificando</option>
                    <option value={149}>149€ - Plan Acelerando</option>
                    <option value={199}>199€ - Plan Total Vigo</option>
                    <option value={299}>299€ - Plan Premium Plus</option>
                  </select>
                </div>

                {/* Field 5: Start Date */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    required
                    value={modalClient.startDate}
                    onChange={(e) => setModalClient({ ...modalClient, startDate: e.target.value })}
                    className="w-full bg-[#1A1F26] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Field 6: Next Billing */}
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
                  Próxima fecha de Cobro/Factura
                </label>
                <input
                  type="date"
                  required
                  value={modalClient.nextBillingDate}
                  onChange={(e) => setModalClient({ ...modalClient, nextBillingDate: e.target.value })}
                  className="w-full bg-[#1A1F26] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              {/* Field 7: Active Upsell Packages */}
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
                  Módulos de Upsell Activos (+ Valor)
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#0F1115] p-3 rounded-xl border border-slate-800/60">
                  {UPSELL_OPTIONS.map((upsell) => {
                    const active = modalClient.upsells.includes(upsell);
                    return (
                      <button
                        type="button"
                        key={upsell}
                        onClick={() => toggleModalUpsell(upsell)}
                        className={`text-[10px] p-1.5 border rounded-lg text-left transition-all flex items-center justify-between ${
                          active
                            ? "bg-indigo-950/40 border-indigo-500 text-indigo-300"
                            : "bg-[#1A1F26] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        <span>{upsell}</span>
                        {active && <Check className="w-3 h-3 shrink-0 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 8: Notes */}
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
                  Notas Privadas del Operador
                </label>
                <textarea
                  value={modalClient.notes}
                  onChange={(e) => setModalClient({ ...modalClient, notes: e.target.value })}
                  rows={2}
                  placeholder="Información relevante sobre el cliente de Vigo..."
                  className="w-full bg-[#1A1F26] border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none resize-none"
                />
              </div>

              {/* Confirm Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-850 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 bg-[#1A1F26] text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-medium cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md hover:shadow-indigo-500/10"
                >
                  {modalMode === "create" ? "Registrar Cliente" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
