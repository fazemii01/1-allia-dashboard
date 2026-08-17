import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  User,
  FileText,
  TrendingUp,
  Receipt,
  MessageSquare,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  Save,
  Download,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  HeartHandshake,
  ShieldCheck,
  UserCheck,
  BarChart2,
  Eye,
  Volume2,
  Heart,
  CheckCircle,
  Target,
  Activity,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";

export interface PatientDetailData {
  id: string | number;
  nama_lengkap: string;
  usia?: string | number;
  jenis_kelamin?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  email_ortu?: string;
  no_telepon?: string;
  nama_ayah?: string;
  nama_ibu?: string;
  alamat?: string;
  jenis_terapi?: string;
  pendidikan_anak?: string;
  relasi_sosial?: string;
  relasi_dengan_ibu?: string;
  relasi_dengan_saudara?: string;
  status: "baru" | "terjadwal" | "aktif" | "selesai" | "dibatalkan";
  therapist?: any;
  therapist_id?: number | null;
  catatan_internal?: string;
  created_at?: string;

  formulir_wicara?: Record<string, any>;
  formulir_hipoterapi?: Record<string, any>;

  bookings?: Array<{
    id: string | number;
    jenis_terapi: string;
    program_title?: string;
    created_at?: string;
    status?: string;
    therapist_id?: number | null;
    therapist?: any;
    catatan_internal?: string;
    formulir_wicara?: Record<string, any>;
    formulir_hipoterapi?: Record<string, any>;
    [key: string]: any;
  }>;

  [key: string]: any;
}

interface PatientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientDetailData | null;
  therapists: Array<{ id: number; name: string; specialization?: string }>;
  patientLogs: any[];
  loadingLogs: boolean;
  onUpdateStatus: (id: string | number, newStatus: PatientDetailData["status"]) => void;
  onAssignTherapist: (id: string | number, therapistIdStr: string) => void;
  onUpdateNotes: (id: string | number, notes: string) => void;
  onSaveLog: (logData: any) => Promise<void>;
  onUpdateLog?: (logId: number, logData: any) => Promise<void>;
  onDeleteLog?: (logId: number) => Promise<void>;
  onOpenPdf: (patient: PatientDetailData, selectedBookingProgram?: string) => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  isOpen,
  onClose,
  patient,
  therapists,
  patientLogs,
  loadingLogs,
  onUpdateStatus,
  onAssignTherapist,
  onUpdateNotes,
  onSaveLog,
  onUpdateLog,
  onDeleteLog,
  onOpenPdf,
}) => {
  const [activeTab, setActiveTab] = useState<"bookings" | "progress" | "profile">("bookings");
  const [selectedBookingIndex, setSelectedBookingIndex] = useState<number>(0);
  const [notesInput, setNotesInput] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [selectedProgressProgram, setSelectedProgressProgram] = useState<string>("all");

  // New progress log form state
  const [savingLog, setSavingLog] = useState<boolean>(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [deleteLogId, setDeleteLogId] = useState<number | null>(null);
  const [deletingLog, setDeletingLog] = useState<boolean>(false);
  const [logForm, setLogForm] = useState({
    program_name: "",
    session_number: 1,
    total_sessions: 8,
    session_date: new Date().toISOString().slice(0, 10),
    fokus_latihan: "",
    progress_score: 80,
    aspect_scores: {
      atensi_fokus: 80,
      artikulasi_wicara: 75,
      regulasi_emosi: 85,
      kepatuhan_instruksi: 70,
      sosialisasi: 75,
    },
    catatan_terapis: "",
    rekomendasi_ortu: "",
    status_pencapaian: "sesuai_target",
  });

  // Extract all distinct bookings registered by this patient
  const bookingList = patient?.bookings && patient.bookings.length > 0
    ? patient.bookings
    : patient
    ? [
        {
          id: patient.id,
          jenis_terapi: patient.jenis_terapi || "Program Terapi & Stimulasi",
          created_at: patient.created_at,
          status: patient.status,
          therapist_id: patient.therapist_id,
          therapist: patient.therapist,
          catatan_internal: patient.catatan_internal,
          formulir_wicara: patient.formulir_wicara,
          formulir_hipoterapi: patient.formulir_hipoterapi,
        },
      ]
    : [];

  useEffect(() => {
    if (patient) {
      const currentB = bookingList[selectedBookingIndex] || bookingList[0];
      const defaultProg = currentB?.jenis_terapi || "Program Terapi & Stimulasi";
      setNotesInput(currentB?.catatan_internal || patient.catatan_internal || "");
      if (patientLogs && patientLogs.length > 0) {
        const maxSesi = Math.max(...patientLogs.map((l: any) => l.session_number || 0));
        setLogForm((f) => ({ ...f, program_name: f.program_name || defaultProg, session_number: maxSesi + 1 }));
      } else {
        setLogForm((f) => ({ ...f, program_name: f.program_name || defaultProg, session_number: 1 }));
      }
    }
  }, [patient, selectedBookingIndex, patientLogs]);

  if (!patient) return null;

  const activeBooking = bookingList[selectedBookingIndex] || bookingList[0] || patient;
  const wicaraData = activeBooking?.formulir_wicara || patient.formulir_wicara || {};
  const hipoData = activeBooking?.formulir_hipoterapi || patient.formulir_hipoterapi || {};

  const getVal = (...keys: string[]) => {
    const sources = [wicaraData, hipoData, activeBooking, patient];
    for (const key of keys) {
      for (const src of sources) {
        if (src && src[key] !== undefined && src[key] !== null && src[key] !== '' && src[key] !== '-') {
          if (Array.isArray(src[key])) {
            if (src[key].length > 0) return src[key];
          } else {
            return src[key];
          }
        }
      }
    }
    return "-";
  };

  const formatText = (val: any) => {
    if (val === true || val === "ya" || val === "Ya" || val === "true" || val === 1 || val === "1") return "Ya";
    if (val === false || val === "tidak" || val === "Tidak" || val === "false" || val === 0 || val === "0") return "Tidak";
    if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "-";
    if (typeof val === "object" && val !== null) return JSON.stringify(val);
    if (!val || val === "") return "-";
    return val;
  };

  const handleSaveNotesLocal = async () => {
    setSavingNotes(true);
    try {
      await onUpdateNotes(activeBooking.id, notesInput);
      toast.success(`Catatan internal untuk program ${getProgramTitle(activeBooking.jenis_terapi)} berhasil disimpan!`);
    } catch {
      toast.error("Gagal menyimpan catatan internal.");
    } finally {
      setSavingNotes(false);
    }
  };

  // Editing handlers

  const handleStartEditLog = (log: any) => {
    setEditingLogId(log.id);
    setLogForm({
      program_name: log.program_name || bookingList[0]?.jenis_terapi || "Program Terapi & Stimulasi",
      session_number: log.session_number || 1,
      total_sessions: log.total_sessions || 8,
      session_date: log.session_date ? String(log.session_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      fokus_latihan: log.fokus_latihan || "",
      progress_score: log.progress_score ?? 80,
      aspect_scores: {
        atensi_fokus: log.aspect_scores?.atensi_fokus ?? 80,
        artikulasi_wicara: log.aspect_scores?.artikulasi_wicara ?? 75,
        regulasi_emosi: log.aspect_scores?.regulasi_emosi ?? 85,
        kepatuhan_instruksi: log.aspect_scores?.kepatuhan_instruksi ?? 70,
        sosialisasi: log.aspect_scores?.sosialisasi ?? 75,
      },
      catatan_terapis: log.catatan_terapis || "",
      rekomendasi_ortu: log.rekomendasi_ortu || "",
      status_pencapaian: log.status_pencapaian || "sesuai_target",
    });
    const formEl = document.getElementById("progress-log-form");
    if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
  };

  const handleCancelEditLog = () => {
    setEditingLogId(null);
    const maxSesi = patientLogs && patientLogs.length > 0 ? Math.max(...patientLogs.map((l: any) => l.session_number || 0)) : 0;
    setLogForm({
      program_name: bookingList[0]?.jenis_terapi || "Program Terapi & Stimulasi",
      session_number: maxSesi + 1,
      total_sessions: 8,
      session_date: new Date().toISOString().slice(0, 10),
      fokus_latihan: "",
      progress_score: 80,
      aspect_scores: {
        atensi_fokus: 80,
        artikulasi_wicara: 75,
        regulasi_emosi: 85,
        kepatuhan_instruksi: 70,
        sosialisasi: 75,
      },
      catatan_terapis: "",
      rekomendasi_ortu: "",
      status_pencapaian: "sesuai_target",
    });
  };

  const handleDeleteLogClick = (logId: number) => {
    setDeleteLogId(logId);
  };

  const handleConfirmDeleteLog = async () => {
    if (!deleteLogId) return;
    setDeletingLog(true);
    try {
      if (onDeleteLog) {
        await onDeleteLog(deleteLogId);
        toast.success("Log perkembangan sesi terapi berhasil dihapus!");
      }
    } catch {
      toast.error("Gagal menghapus log perkembangan sesi");
    } finally {
      setDeletingLog(false);
      setDeleteLogId(null);
    }
  };

  const handleSubmitNewLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLog(true);
    try {
      if (editingLogId && onUpdateLog) {
        await onUpdateLog(editingLogId, logForm);
        toast.success("Log perkembangan sesi terapi berhasil diperbarui!");
        setEditingLogId(null);
      } else {
        await onSaveLog(logForm);
        toast.success("Log perkembangan sesi terapi berhasil ditambahkan!");
      }
      setLogForm((f) => ({
        ...f,
        session_number: f.session_number + 1,
        fokus_latihan: "",
        progress_score: 80,
        aspect_scores: {
          atensi_fokus: 80,
          artikulasi_wicara: 75,
          regulasi_emosi: 85,
          kepatuhan_instruksi: 70,
          sosialisasi: 75,
        },
        catatan_terapis: "",
        rekomendasi_ortu: "",
      }));
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan log perkembangan");
    } finally {
      setSavingLog(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      baru: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200",
      terjadwal: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-200",
      aktif: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200",
      selesai: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200",
      dibatalkan: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200",
    };
    return styles[status] || "bg-slate-100 text-slate-800";
  };

  const getProgramTitle = (jenis?: string) => {
    if (!jenis) return "Program Terapi & Stimulasi";
    const lower = jenis.toLowerCase();
    if (lower.includes("wicara")) return "Terapi Wicara";
    if (lower.includes("hipo")) return "Hipoterapi & Sensori";
    if (lower.includes("konsultasi")) return "Konsultasi Tumbuh Kembang";
    if (lower.includes("skrining")) return "Skrining Tumbuh Kembang";
    if (lower.includes("bakat") || lower.includes("sidik")) return "Analisa Sidik Jari Bakat";
    return jenis;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-5xl w-[96vw] sm:w-[94vw] max-h-[92vh] flex flex-col p-0 gap-0 bg-slate-50 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
        {/* Modal Header */}
        <DialogHeader className="p-4 sm:p-6 pr-10 sm:pr-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
            <div className="p-2.5 sm:p-3 bg-blue-600 text-white rounded-xl shadow-md shrink-0">
              <User className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 break-words leading-tight">
                  {patient.nama_lengkap}
                </DialogTitle>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide shrink-0 ${getStatusBadge(patient.status)}`}>
                  {patient.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                <span>Usia: <strong>{patient.usia ? `${patient.usia} Thn` : "-"}</strong></span>
                <span className="hidden sm:inline">•</span>
                <span>Ortu: <strong>{patient.nama_ibu || patient.nama_ayah || "-"}</strong> ({patient.no_telepon || "-"})</span>
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Button
              onClick={() => onOpenPdf(patient, activeBooking?.jenis_terapi)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm px-4 py-2"
            >
              <Download className="h-4 w-4" />
              <span>PDF Formulir ({bookingList.length > 1 ? `Booking #${selectedBookingIndex + 1}` : "Rekap"})</span>
            </Button>
          </div>
        </DialogHeader>
        
        {/* Modal Tabs Navigation Bar */}
        <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 sm:px-6 sm:py-0 overflow-x-auto whitespace-nowrap z-10">
          <div className="flex sm:gap-6 gap-1 bg-slate-100 dark:bg-slate-800/80 sm:bg-transparent sm:dark:bg-transparent p-1 sm:p-0 rounded-xl sm:rounded-none">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex-1 sm:flex-initial py-2 sm:py-3.5 px-2.5 sm:px-2 text-xs font-bold transition-all rounded-lg sm:rounded-none sm:border-b-2 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "bookings"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm sm:shadow-none sm:border-blue-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 sm:border-transparent"
              }`}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Booking</span>
              <span className="hidden sm:inline">Riwayat Booking & Formulir</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {bookingList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("progress")}
              className={`flex-1 sm:flex-initial py-2 sm:py-3.5 px-2.5 sm:px-2 text-xs font-bold transition-all rounded-lg sm:rounded-none sm:border-b-2 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "progress"
                  ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm sm:shadow-none sm:border-purple-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 sm:border-transparent"
              }`}
            >
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Progress</span>
              <span className="hidden sm:inline">Progress & Sesi Terapi</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                {patientLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 sm:flex-initial py-2 sm:py-3.5 px-2.5 sm:px-2 text-xs font-bold transition-all rounded-lg sm:rounded-none sm:border-b-2 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "profile"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm sm:shadow-none sm:border-blue-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 sm:border-transparent"
              }`}
            >
              <User className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Profil</span>
              <span className="hidden sm:inline">Profil Pasien & Terapis</span>
            </button>
          </div>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* TAB 1: RIWAYAT BOOKING & FORMULIR PROGRAM */}
          {activeTab === "bookings" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Program Selector Bar */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                    Pilih Program Pendaftaran Pasien ({bookingList.length} Terdaftar):
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                  {bookingList.map((b, idx) => {
                    const isSelected = idx === selectedBookingIndex;
                    return (
                      <button
                        key={b.id || idx}
                        onClick={() => setSelectedBookingIndex(idx)}
                        className={`flex items-center justify-between sm:justify-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer w-full sm:w-auto ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span className="truncate">{getProgramTitle(b.jenis_terapi)}</span>
                        {b.created_at && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                            {new Date(b.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 1: IDENTITAS ANAK & ORANG TUA */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <User className="h-4 w-4" />
                  1. Identitas Anak & Orang Tua
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Anak</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{patient.nama_lengkap}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Usia / Jenis Kelamin</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {patient.usia ? `${patient.usia} Thn` : "-"} • {patient.jenis_kelamin || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tempat & Tanggal Lahir</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {patient.tempat_lahir || "-"}, {patient.tanggal_lahir || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Ibu / Ayah</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Ibu: {patient.nama_ibu || "-"} | Ayah: {patient.nama_ayah || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">No. WhatsApp Orang Tua</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{patient.no_telepon || "-"}</span>
                      {patient.no_telepon && (
                        <a
                          href={`https://wa.me/${patient.no_telepon.replace(/^0/, "62")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100"
                        >
                          WA
                        </a>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Email Orang Tua</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{patient.email_ortu || "-"}</p>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Alamat Rumah</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{patient.alamat || "-"}</p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: EVALUASI KEADAAN & RELASI ANAK */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <HeartHandshake className="h-4 w-4" />
                  2. Evaluasi Keadaan & Relasi Anak
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Pendidikan Anak saat Ini</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{patient.pendidikan_anak || "-"}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Relasi / Hubungan Sosial dengan Sebaya</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{patient.relasi_sosial || "-"}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Relasi / Hubungan Emosional dengan Ibu</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{patient.relasi_dengan_ibu || "-"}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Relasi / Hubungan dengan Saudara / Keluarga</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{patient.relasi_dengan_saudara || "-"}</p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: DETAIL FORMULIR KUESIONER PROGRAM SPESIFIK */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    3. Detail Formulir Kuesioner ({getProgramTitle(activeBooking?.jenis_terapi)})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenPdf(patient, activeBooking?.jenis_terapi)}
                    className="gap-1.5 text-xs font-bold"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Cetak PDF Program Ini
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Program Detail Spesifik</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {getVal("program_spesifik", "program", "program_detail", "jenis_terapi")}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Keluhan Utama / Masalah BICARA/PERILAKU</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {formatText(getVal("masalah_bicara", "keluhan_utama", "keluhan_emosi", "gangguan_utama"))}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Penjelasan Singkat Permasalahan Anak</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatText(getVal("penjelasan_keluhan", "keluhan_lainnya", "detail_keterlambatan", "penjelasan_permasalahan"))}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Durasi / Berapa Lama Terjadi</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {getVal("sudah_berapa_lama_wicara", "sudah_berapa_lama_hipo", "sudah_berapa_lama")}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pengurus Utama Anak Sehari-hari</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatText(getVal("pengurus_utama", "pengurus_utama_wicara", "pengurus_utama_hipo", "pengurus", "pengasuh_utama", "pengasuh"))}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Bahasa Sehari-hari</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {getVal("bahasa_sehari_hari_wicara", "bahasa_sehari_hari_hipo", "bahasa_sehari_hari")}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Dalam Penanganan Dokter / Terapi Lain</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatText(getVal("dalam_penanganan_lain", "dalam_penanganan_dokter", "dalam_penanganan_psikolog"))}
                      {getVal("nama_penanganan_lain", "nama_dokter") !== "-" && ` (${getVal("nama_penanganan_lain", "nama_dokter")})`}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Riwayat Masalah Kehamilan & Persalinan</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatText(getVal("masalah_kehamilan_wicara", "masalah_kehamilan_hipo", "masalah_kehamilan"))}
                      {getVal("detail_masalah_kehamilan_wicara", "detail_masalah_kehamilan_hipo", "detail_masalah_kehamilan") !== "-" && ` - ${getVal("detail_masalah_kehamilan_wicara", "detail_masalah_kehamilan_hipo", "detail_masalah_kehamilan")}`}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Riwayat Trauma Fisik / Emosional</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatText(getVal("pernah_trauma_wicara", "pernah_trauma_hipo", "pernah_trauma", "riwayat_keterlambatan"))}
                      {getVal("detail_trauma_wicara", "detail_trauma_hipo", "detail_trauma", "detail_keterlambatan") !== "-" && ` - ${getVal("detail_trauma_wicara", "detail_trauma_hipo", "detail_trauma", "detail_keterlambatan")}`}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Ada Ketakutan / Kekhawatiran Selama Terapi</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatText(getVal("ada_kekhawatiran_terapi", "ada_ketakutan_terapi"))}
                      {getVal("detail_kekhawatiran", "detail_ketakutan") !== "-" && ` - ${getVal("detail_kekhawatiran", "detail_ketakutan")}`}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tempat Favorit Anak</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatText(getVal("tempat_favorit"))}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Hobi / Kegiatan Favorit Anak</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatText(getVal("hobby", "kegiatan_favorit"))}
                    </p>
                  </div>

                  <div className="md:col-span-2 p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300">Harapan Orang Tua Terhadap Hasil Terapi</span>
                    <p className="font-semibold text-blue-900 dark:text-blue-100 italic">
                      {getVal("harapan_terapi_wicara", "harapan_terapi_hipo", "harapan_terapi", "harapan_setelah_terapi") !== "-" 
                        ? `"${getVal("harapan_terapi_wicara", "harapan_terapi_hipo", "harapan_terapi", "harapan_setelah_terapi")}"` 
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 4: VERIFIKASI KLINIK & PENUGASAN TERAPIS (PER-PROGRAM BOOKING!) */}
              <div className="bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900 rounded-xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <ShieldCheck className="h-4 w-4" />
                  4. Verifikasi Klinik & Penugasan Terapis (Khusus Program: {getProgramTitle(activeBooking?.jenis_terapi)})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Status Pendaftaran Program Ini</label>
                    <select
                      value={activeBooking.status || "baru"}
                      onChange={(e) => onUpdateStatus(activeBooking.id, e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 font-bold text-slate-900 dark:text-slate-100"
                    >
                      <option value="baru">Baru (Pending)</option>
                      <option value="terjadwal">Terjadwal</option>
                      <option value="aktif">Aktif Terapi</option>
                      <option value="selesai">Selesai Program</option>
                      <option value="dibatalkan">Dibatalkan</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Terapis Penanggung Jawab Program Ini</label>
                    <select
                      value={activeBooking.therapist_id ? String(activeBooking.therapist_id) : ""}
                      onChange={(e) => onAssignTherapist(activeBooking.id, e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 font-bold text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- Belum Ditugaskan --</option>
                      {therapists.map((t) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.name} {t.specialization ? `(${t.specialization})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Info Note to prevent confusion with Jadwal Sesi */}
                <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg p-3 text-xs flex items-start gap-2.5 text-blue-900 dark:text-blue-200">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Informasi Penjadwalan Sesi Terapi:</p>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      Bagian ini hanya untuk menentukan terapis penanggung jawab dan status penerimaan program klinik. Untuk membuat, mengatur kalender mingguan, dan mengalokasikan <strong>Batch Jadwal Sesi</strong>, silakan buka menu <strong>Jadwal Sesi</strong>.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">Catatan Internal Klinik Untuk Program Ini</label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan catatan internal tim klinik/terapis untuk pendaftaran program ini..."
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveNotesLocal}
                      disabled={savingNotes}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5"
                    >
                      <Save className="h-4 w-4" />
                      {savingNotes ? "Menyimpan..." : "Simpan Catatan Program Ini"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROGRESS & SESI TERAPI */}
          {activeTab === "progress" && (() => {
            const activeLogs = patientLogs.filter((log: any) => {
              if (selectedProgressProgram === "all") return true;
              const logProg = (log.program_name || "").toLowerCase();
              const selProg = selectedProgressProgram.toLowerCase();
              return logProg.includes(selProg) || selProg.includes(logProg);
            });

            const getLogScore = (l: any) => {
              if (l?.progress_score && Number(l.progress_score) > 0) return Number(l.progress_score);
              if (l?.aspect_scores) {
                const asp = l.aspect_scores;
                const vals = [asp.atensi_fokus, asp.artikulasi_wicara, asp.regulasi_emosi, asp.kepatuhan_instruksi, asp.sosialisasi].filter(
                  (v) => typeof v === 'number' && v > 0
                );
                if (vals.length > 0) {
                  return Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
                }
              }
              return 80;
            };

            const latestLog = activeLogs.length > 0 ? activeLogs[activeLogs.length - 1] : null;
            const totalSesi = latestLog?.total_sessions || 8;
            const completedSesi = activeLogs.length;
            const percentSesi = Math.min(100, Math.round((completedSesi / totalSesi) * 100));
            const avgScore = activeLogs.length > 0 
              ? Math.round(activeLogs.reduce((acc: number, l: any) => acc + getLogScore(l), 0) / activeLogs.length)
              : 0;
            const aspect = latestLog?.aspect_scores || {};

            return (
              <div className="space-y-6">
                {/* Filter Program Selector Bar for Multi-Program Patients */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      Filter Program Terapi ({bookingList.length} Program Pasien):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedProgressProgram("all")}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selectedProgressProgram === "all"
                          ? "bg-purple-600 text-white border-purple-600 shadow-md"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span>Semua Program ({patientLogs.length})</span>
                    </button>
                    {bookingList.map((b, idx) => {
                      const progName = b.jenis_terapi || "Program Terapi";
                      const isSelected = selectedProgressProgram.toLowerCase() === progName.toLowerCase();
                      const logCount = patientLogs.filter((l: any) =>
                        (l.program_name || "").toLowerCase().includes(progName.toLowerCase()) ||
                        progName.toLowerCase().includes((l.program_name || "").toLowerCase())
                      ).length;
                      return (
                        <button
                          key={b.id || idx}
                          onClick={() => setSelectedProgressProgram(progName)}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-600 text-white border-purple-600 shadow-md"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          <span>{getProgramTitle(progName)}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                            {logCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Progress Gauges & Aspect Skill Breakdown Chart */}
                {activeLogs.length > 0 && (
                  <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <BarChart2 className="h-4 w-4 text-purple-600" />
                      Visual Progress & Breakdown Aspek Tumbuh Kembang (Tampil Di Portal Orang Tua)
                    </h4>

                    {/* Gauges Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Gauge 1: Sesi Counter */}
                      <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 flex flex-col justify-between gap-2.5">
                        <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">Penyelesaian Sesi Terapi</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-blue-700 dark:text-blue-400">{completedSesi}</span>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ {totalSesi} Sesi ({percentSesi}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${percentSesi}%` }} />
                        </div>
                      </div>

                      {/* Gauge 2: Overall Score */}
                      <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-4 flex flex-col justify-between gap-2.5">
                        <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">Rata-Rata Evaluation Score</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{avgScore}%</span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                            {avgScore >= 80 ? "Sangat Baik" : avgScore >= 60 ? "Baik" : "Cukup"}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${avgScore}%` }} />
                        </div>
                      </div>

                      {/* Gauge 3: Status Milestone */}
                      <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl p-4 flex flex-col justify-between gap-2 shadow-xs">
                        <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">Status Milestone Terkini</span>
                        <span className="text-sm font-black text-amber-800 dark:text-amber-300 capitalize flex items-center gap-1.5">
                          {latestLog?.status_pencapaian === 'melampaui_target' ? (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-600 inline" />
                              <span>Melampaui Target</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 text-emerald-600 inline" />
                              <span>Sesuai Target Evaluasi</span>
                            </>
                          )}
                        </span>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold leading-tight">
                          Anak menunjukkan respon positif konsisten di setiap sesi stimulasi terapis.
                        </p>
                      </div>
                    </div>

                    {/* Aspect Skills Breakdown Bars */}
                    <div className="space-y-3 pt-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Capaian 5 Aspek Tumbuh Kembang Terkini:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { label: "Atensi & Fokus", icon: <Eye className="w-3.5 h-3.5 text-blue-500" />, score: aspect.atensi_fokus ?? 80, color: "bg-blue-500" },
                          { label: "Artikulasi Wicara", icon: <Volume2 className="w-3.5 h-3.5 text-emerald-500" />, score: aspect.artikulasi_wicara ?? 75, color: "bg-emerald-500" },
                          { label: "Regulasi Emosi", icon: <Heart className="w-3.5 h-3.5 text-purple-500" />, score: aspect.regulasi_emosi ?? 85, color: "bg-purple-500" },
                          { label: "Kepatuhan Instruksi", icon: <CheckCircle className="w-3.5 h-3.5 text-amber-500" />, score: aspect.kepatuhan_instruksi ?? 70, color: "bg-amber-500" },
                          { label: "Sosialisasi", icon: <Activity className="w-3.5 h-3.5 text-rose-500" />, score: aspect.sosialisasi ?? 75, color: "bg-rose-500" },
                        ].map((asp, idx) => (
                          <div key={idx} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-1.5 truncate">
                                {asp.icon}
                                <span className="truncate">{asp.label}</span>
                              </div>
                              <span className="text-blue-600 dark:text-blue-400 font-extrabold">{asp.score}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className={`${asp.color} h-full rounded-full transition-all duration-500`} style={{ width: `${asp.score}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Progress Logs Timeline */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Riwayat Perkembangan Sesi Terapi (
                    {selectedProgressProgram === "all"
                      ? `${patientLogs.length} Sesi`
                      : `${activeLogs.length} Sesi ${getProgramTitle(selectedProgressProgram)}`}
                    )
                  </h3>

                  {loadingLogs ? (
                    <div className="py-8 text-center text-xs text-slate-500 animate-pulse">Memuat log perkembangan sesi...</div>
                  ) : activeLogs.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <AlertCircle className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Belum ada log perkembangan sesi terapi.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Gunakan formulir di bawah untuk menambahkan catatan perkembangan sesi pertama pasien ini.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {activeLogs.map((log: any) => (
                        <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-xs text-blue-700 dark:text-blue-400">
                                Sesi Ke-{log.session_number} dari {log.total_sessions || 8}
                              </span>
                              {log.program_name && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                                  {getProgramTitle(log.program_name)}
                                </span>
                              )}
                              {log.progress_score !== undefined && log.progress_score !== null && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60">
                                  Skor: {log.progress_score}%
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 font-medium">
                                {new Date(log.session_date || log.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEditLog(log)}
                                className="p-1 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 font-bold text-[11px] flex items-center gap-1 hover:bg-blue-100 transition-all cursor-pointer"
                                title="Edit Log Perkembangan"
                              >
                                <Pencil className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLogClick(log.id)}
                                className="p-1 px-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 font-bold text-[11px] flex items-center gap-1 hover:bg-red-100 transition-all cursor-pointer"
                                title="Hapus Log Perkembangan"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Fokus Latihan: <span className="font-semibold text-slate-600 dark:text-slate-400">{log.fokus_latihan || "-"}</span>
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            Catatan Terapis: {log.catatan_terapis || "-"}
                          </p>
                          {log.rekomendasi_ortu && (
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-lg text-[11px]">
                              <strong>Rekomendasi Ortu:</strong> {log.rekomendasi_ortu}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Add / Edit Progress Log With Full Manageable Parameters */}
                <form id="progress-log-form" onSubmit={handleSubmitNewLog} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    {editingLogId ? (
                      <>
                        <Pencil className="h-4 w-4 text-purple-600" />
                        Edit Log Perkembangan Sesi (Sesi Ke-{logForm.session_number})
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 text-blue-600" />
                        Tambah Log Perkembangan Sesi Baru (Kelola Semua Parameter Portal)
                      </>
                    )}
                  </h3>

                  {/* Row 1: Program, Sesi, Total Sesi, Tanggal */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400">Program Terapi *</label>
                      <select
                        required
                        value={logForm.program_name || bookingList[0]?.jenis_terapi || "Program Terapi & Stimulasi"}
                        onChange={(e) => setLogForm({ ...logForm, program_name: e.target.value })}
                        className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-slate-100"
                      >
                        {bookingList.map((b, idx) => (
                          <option key={b.id || idx} value={b.jenis_terapi || "Program Terapi & Stimulasi"}>
                            {getProgramTitle(b.jenis_terapi)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400">Sesi Ke-</label>
                      <input
                        type="number"
                        required
                        value={logForm.session_number}
                        onChange={(e) => setLogForm({ ...logForm, session_number: Number(e.target.value) })}
                        className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400">Total Sesi Paket</label>
                      <input
                        type="number"
                        required
                        value={logForm.total_sessions}
                        onChange={(e) => setLogForm({ ...logForm, total_sessions: Number(e.target.value) })}
                        className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400">Tanggal Sesi</label>
                      <input
                        type="date"
                        required
                        value={logForm.session_date}
                        onChange={(e) => setLogForm({ ...logForm, session_date: e.target.value })}
                        className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold"
                      />
                    </div>
                  </div>

                  {/* Row 2: Evaluasi Score & Status Pencapaian */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 flex justify-between">
                        <span>Skor Evaluasi Sesi Saja (0 - 100%)</span>
                        <span className="text-blue-600 dark:text-blue-400 font-extrabold">{logForm.progress_score}%</span>
                      </label>
                      <div className="flex items-center gap-3 mt-1">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={logForm.progress_score}
                          onChange={(e) => setLogForm({ ...logForm, progress_score: Number(e.target.value) })}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={logForm.progress_score}
                          onChange={(e) => setLogForm({ ...logForm, progress_score: Number(e.target.value) })}
                          className="w-16 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-center font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400">Status Pencapaian Milestone</label>
                      <select
                        value={logForm.status_pencapaian}
                        onChange={(e) => setLogForm({ ...logForm, status_pencapaian: e.target.value })}
                        className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold"
                      >
                        <option value="sesuai_target">Sesuai Target Evaluasi</option>
                        <option value="melampaui_target">Melampaui Target</option>
                        <option value="perlu_pendampingan">Perlu Pendampingan Ekstra</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Aspect Scores Management Sliders */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
                    <span className="font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      Penilaian 5 Aspek Tumbuh Kembang Pasien (Skala 0 - 100%):
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div>
                        <label className="font-bold text-[11px] text-slate-600 dark:text-slate-400 flex justify-between">
                          <span>Atensi & Fokus</span>
                          <span className="text-blue-600">{logForm.aspect_scores.atensi_fokus}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={logForm.aspect_scores.atensi_fokus}
                          onChange={(e) =>
                            setLogForm({
                              ...logForm,
                              aspect_scores: { ...logForm.aspect_scores, atensi_fokus: Number(e.target.value) },
                            })
                          }
                          className="mt-1 w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-[11px] text-slate-600 dark:text-slate-400 flex justify-between">
                          <span>Artikulasi Wicara</span>
                          <span className="text-emerald-600">{logForm.aspect_scores.artikulasi_wicara}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={logForm.aspect_scores.artikulasi_wicara}
                          onChange={(e) =>
                            setLogForm({
                              ...logForm,
                              aspect_scores: { ...logForm.aspect_scores, artikulasi_wicara: Number(e.target.value) },
                            })
                          }
                          className="mt-1 w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-[11px] text-slate-600 dark:text-slate-400 flex justify-between">
                          <span>Regulasi Emosi</span>
                          <span className="text-purple-600">{logForm.aspect_scores.regulasi_emosi}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={logForm.aspect_scores.regulasi_emosi}
                          onChange={(e) =>
                            setLogForm({
                              ...logForm,
                              aspect_scores: { ...logForm.aspect_scores, regulasi_emosi: Number(e.target.value) },
                            })
                          }
                          className="mt-1 w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-[11px] text-slate-600 dark:text-slate-400 flex justify-between">
                          <span>Kepatuhan Instruksi</span>
                          <span className="text-amber-600">{logForm.aspect_scores.kepatuhan_instruksi}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={logForm.aspect_scores.kepatuhan_instruksi}
                          onChange={(e) =>
                            setLogForm({
                              ...logForm,
                              aspect_scores: { ...logForm.aspect_scores, kepatuhan_instruksi: Number(e.target.value) },
                            })
                          }
                          className="mt-1 w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-[11px] text-slate-600 dark:text-slate-400 flex justify-between">
                          <span>Sosialisasi</span>
                          <span className="text-rose-600">{logForm.aspect_scores.sosialisasi}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={logForm.aspect_scores.sosialisasi}
                          onChange={(e) =>
                            setLogForm({
                              ...logForm,
                              aspect_scores: { ...logForm.aspect_scores, sosialisasi: Number(e.target.value) },
                            })
                          }
                          className="mt-1 w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="font-bold text-slate-600 dark:text-slate-400">Fokus Latihan Sesi Ini</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Penguatan otot bicara A-I-U-E-O & Atensi visual"
                      value={logForm.fokus_latihan}
                      onChange={(e) => setLogForm({ ...logForm, fokus_latihan: e.target.value })}
                      className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-semibold"
                    />
                  </div>

                  <div className="text-xs">
                    <label className="font-bold text-slate-600 dark:text-slate-400">Catatan Terapis</label>
                    <textarea
                      rows={3}
                      placeholder="Tuliskan catatan detail hasil sesi terapi hari ini..."
                      value={logForm.catatan_terapis}
                      onChange={(e) => setLogForm({ ...logForm, catatan_terapis: e.target.value })}
                      className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>

                  <div className="text-xs">
                    <label className="font-bold text-slate-600 dark:text-slate-400">Rekomendasi Latihan Di Rumah (Untuk Orang Tua)</label>
                    <textarea
                      rows={2}
                      placeholder="Tuliskan panduan instruksi latihan di rumah untuk orang tua..."
                      value={logForm.rekomendasi_ortu}
                      onChange={(e) => setLogForm({ ...logForm, rekomendasi_ortu: e.target.value })}
                      className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {editingLogId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEditLog}
                        className="font-bold text-xs gap-1.5 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                        Batal Edit
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={savingLog}
                      className={`${editingLogId ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"} text-white font-bold text-xs gap-1.5 cursor-pointer`}
                    >
                      <Save className="h-4 w-4" />
                      {savingLog
                        ? "Menyimpan..."
                        : editingLogId
                        ? "Simpan Perubahan Log"
                        : "Simpan Log Perkembangan Sesi"}
                    </Button>
                  </div>
                </form>
              </div>
            );
          })()}

          {/* TAB 3: PROFIL PASIEN & TERAPIS */}
          {activeTab === "profile" && (
            <div className="space-y-6 text-xs">
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  Identitas Lengkap Pasien & Orang Tua
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Anak</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{patient.nama_lengkap}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tempat & Tanggal Lahir</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {patient.tempat_lahir || "-"}, {patient.tanggal_lahir || "-"} ({patient.usia ? `${patient.usia} Thn` : "-"})
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Ibu</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{patient.nama_ibu || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Ayah</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{patient.nama_ayah || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">No. Telepon / WhatsApp</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{patient.no_telepon || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Email Orang Tua</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{patient.email_ortu || "-"}</p>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Alamat Lengkap</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{patient.alamat || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-2 sm:gap-3">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto font-bold text-xs py-2.5 sm:py-2">
            Tutup
          </Button>
          <Button
            onClick={() => onOpenPdf(patient, activeBooking?.jenis_terapi)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm py-2.5 sm:py-2"
          >
            <Download className="h-4 w-4" />
            Cetak PDF Formulir ({bookingList.length > 1 ? `Booking #${selectedBookingIndex + 1}` : "Rekap"})
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Delete Progress Log Confirmation Modal */}
      <ConfirmDialog
        open={deleteLogId !== null}
        onOpenChange={(open) => { if (!open) setDeleteLogId(null); }}
        title="Hapus Log Perkembangan Sesi"
        desc="Apakah Anda yakin ingin menghapus log perkembangan sesi ini? Catatan ini akan dihapus permanen dari rekam medis pasien."
        confirmText="Hapus Log"
        cancelBtnText="Batal"
        destructive
        isLoading={deletingLog}
        handleConfirm={handleConfirmDeleteLog}
      />
    </Dialog>
  );
};
