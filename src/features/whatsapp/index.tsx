import React, { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { apiFetch } from "@/lib/api";
import {
  Send,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Settings,
  History,
  Bot,
  Plus,
  Trash2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Eye,
  Sparkles,
  Save,
  AlertTriangle,
  Search,
  RotateCcw,
  Copy,
  ExternalLink,
  Info,
  Filter,
  Phone,
  User,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { SimplePagination } from "@/components/simple-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface WATemplate {
  id: string;
  name?: string;
  body: string;
  trigger_event?: string | null;
  auto_send?: boolean;
  is_active?: boolean;
}

interface WALog {
  id: string | number;
  recipient: string;
  patient_name?: string;
  type: string;
  body: string;
  status: "sent" | "failed" | "received" | "pending" | string;
  error_message?: string;
  created_at?: string;
}

interface WAAutoReply {
  id: number;
  keyword: string;
  reply_body: string;
  match_type: "exact" | "contains" | string;
  is_active: boolean;
}

const QUICK_TAGS = [
  { label: "+ Nama Ortu", tag: "{nama_ortu}" },
  { label: "+ Nama Anak", tag: "{nama_anak}" },
  { label: "+ Link Invoice 🔗", tag: "{link_invoice}" },
  { label: "+ Usia", tag: "{usia}" },
  { label: "+ Jenis Terapi", tag: "{jenis_terapi}" },
  { label: "+ Layanan", tag: "{layanan}" },
  { label: "+ No. Invoice", tag: "{invoice_number}" },
  { label: "+ Total Biaya", tag: "{total_amount}" },
  { label: "+ Jatuh Tempo", tag: "{due_date}" },
  { label: "+ Tanggal", tag: "{tanggal}" },
  { label: "+ Line Break", tag: "\n" },
];

const SAMPLE_VARS: Record<string, string> = {
  nama_ortu: "Bapak / Ibu ",
  nama_anak: "Budi",
  link_invoice: "https://app.alliakids.com/invoice/PUFFCRB9",
  usia: "5",
  jenis_terapi: "Terapi Wicara",
  layanan: "Sesi Terapi Wicara & Pendampingan",
  invoice_number: "INV-20260803-0001",
  total_amount: "350.000",
  due_date: "10 Agustus 2026",
  tanggal: "5 Agustus 2026",
};

export function WhatsAppManager() {
  const [activeTab, setActiveTab] = useState<"templates" | "logs" | "auto_replies" | "direct">("templates");
  const [templates, setTemplates] = useState<WATemplate[]>([]);
  const [logs, setLogs] = useState<WALog[]>([]);
  const [autoReplies, setAutoReplies] = useState<WAAutoReply[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected Template Builder state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [builderForm, setBuilderForm] = useState<{
    id: string;
    name: string;
    trigger_event: string;
    body: string;
    auto_send: boolean;
    is_active: boolean;
  }>({
    id: "",
    name: "",
    trigger_event: "",
    body: "",
    auto_send: true,
    is_active: true,
  });
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Direct send state
  const [phone, setPhone] = useState("");
  const [patientName, setPatientName] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Auto-reply modal / edit state
  const [showAutoReplyForm, setShowAutoReplyForm] = useState(false);
  const [autoReplyForm, setAutoReplyForm] = useState<{
    id?: number;
    keyword: string;
    reply_body: string;
    match_type: "exact" | "contains";
    is_active: boolean;
  }>({
    keyword: "",
    reply_body: "",
    match_type: "exact",
    is_active: true,
  });
  const [savingRule, setSavingRule] = useState(false);

  // Log Pengiriman state (search, filter, detail modal, retry)
  const [logSearch, setLogSearch] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState<"all" | "failed" | "sent" | "received">("all");
  const [selectedLog, setSelectedLog] = useState<WALog | null>(null);
  const [retryingLogId, setRetryingLogId] = useState<string | number | null>(null);

  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [autoCurrentPage, setAutoCurrentPage] = useState(1);
  const [autoPageSize, setAutoPageSize] = useState(10);

  const fetchLogs = async () => {
    try {
      const data = await apiFetch<WALog[]>("/admin/whatsapp/logs");
      setLogs(data);
    } catch (err: any) {
      console.warn("Failed to load WA logs:", err.message);
    }
  };

  const handleRetryLog = async (logId: string | number) => {
    setRetryingLogId(logId);
    try {
      const res = await apiFetch<{ log: WALog; sent: boolean; error?: string }>(`/admin/whatsapp/logs/${logId}/retry`, {
        method: "POST",
      });
      if (res.sent) {
        toast.success("Pesan WhatsApp berhasil dikirim ulang!");
      } else {
        toast.error(res.error || "Pesan gagal terkirim saat dicoba ulang.");
      }
      await fetchLogs();
      if (selectedLog && String(selectedLog.id) === String(logId)) {
        setSelectedLog(res.log);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mencoba mengirim ulang pesan.");
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleDeleteLog = async (logId: string | number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan log ini?")) return;
    try {
      await apiFetch(`/admin/whatsapp/logs/${logId}`, { method: "DELETE" });
      toast.success("Catatan log berhasil dihapus.");
      setLogs((prev) => prev.filter((l) => String(l.id) !== String(logId)));
      if (selectedLog && String(selectedLog.id) === String(logId)) {
        setSelectedLog(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus log");
    }
  };

  const getDiagnosticAdvice = (errorMsg?: string) => {
    if (!errorMsg) return null;
    const lower = errorMsg.toLowerCase();
    if (lower.includes("wasender_api_key") || lower.includes("api_key") || lower.includes("unauthorized") || lower.includes("401")) {
      return {
        title: "Konfigurasi API Key Bermasalah",
        desc: "Kunci WASENDER_API_KEY belum terpasang atau salah pada file environment backend (.env).",
        solution: "Pastikan konfigurasi WASENDER_API_KEY di file .env backend telah diisi dengan API Key yang valid dari WaSender.",
      };
    }
    if (lower.includes("invalid recipient") || lower.includes("nomor") || lower.includes("phone")) {
      return {
        title: "Nomor WhatsApp Tidak Valid",
        desc: "Format nomor telepon penerima tidak valid atau bukan akun WhatsApp terdaftar.",
        solution: "Periksa kembali nomor telepon pasien/orang tua di menu Pasien dan pastikan menggunakan format aktif (contoh: 0812... atau 62812...).",
      };
    }
    if (lower.includes("template") || lower.includes("tidak ditemukan")) {
      return {
        title: "Template Pesan Belum Aktif",
        desc: "Template pesan untuk event trigger ini belum dibuat atau berstatus non-aktif.",
        solution: "Buka tab 'Template Builder' di menu ini, lalu simpan template untuk trigger terkait dan pastikan statusnya aktif.",
      };
    }
    if (lower.includes("disconnected") || lower.includes("session") || lower.includes("device") || lower.includes("500") || lower.includes("400")) {
      return {
        title: "Sesi Device WhatsApp Terputus",
        desc: "Gateway WaSender terputus dari perangkat WhatsApp.",
        solution: "Buka dashboard wasenderapi.com, periksa koneksi perangkat WhatsApp Anda, dan lakukan scan ulang QR code jika sesi offline.",
      };
    }
    return {
      title: "Kegagalan Pengiriman Provider",
      desc: "Server WaSender menolak permintaan pengiriman pesan.",
      solution: "Periksa sisa kuota pesan WhatsApp, pastikan device online, dan klik 'Kirim Ulang Pesan' untuk mencoba kembali.",
    };
  };

  const filteredLogs = logs.filter((log) => {
    if (logStatusFilter !== "all" && log.status !== logStatusFilter) {
      return false;
    }
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      const matchRecipient = log.recipient?.toLowerCase().includes(q);
      const matchPatient = log.patient_name?.toLowerCase().includes(q);
      const matchType = log.type?.toLowerCase().includes(q);
      const matchBody = log.body?.toLowerCase().includes(q);
      const matchError = log.error_message?.toLowerCase().includes(q);
      return matchRecipient || matchPatient || matchType || matchBody || matchError;
    }
    return true;
  });

  const failedLogsCount = logs.filter((l) => l.status === "failed").length;
  const sentLogsCount = logs.filter((l) => l.status === "sent").length;
  const receivedLogsCount = logs.filter((l) => l.status === "received").length;

  const fetchTemplates = async () => {
    try {
      const data = await apiFetch<WATemplate[]>("/admin/whatsapp/templates");
      setTemplates(data);
      if (data.length > 0 && !selectedTemplateId && !isCreatingNew) {
        selectTemplate(data[0]);
      }
    } catch (err: any) {
      console.warn("Failed to load WA templates:", err.message);
    }
  };

  const fetchAutoReplies = async () => {
    try {
      const data = await apiFetch<WAAutoReply[]>("/admin/whatsapp/auto-replies");
      setAutoReplies(data);
    } catch (err: any) {
      console.warn("Failed to load WA auto-replies:", err.message);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.allSettled([fetchLogs(), fetchTemplates(), fetchAutoReplies()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const selectTemplate = (tpl: WATemplate) => {
    setIsCreatingNew(false);
    setSelectedTemplateId(tpl.id);
    setBuilderForm({
      id: tpl.id,
      name: tpl.name || tpl.id,
      trigger_event: tpl.trigger_event || "",
      body: tpl.body || "",
      auto_send: tpl.auto_send ?? true,
      is_active: tpl.is_active ?? true,
    });
  };

  const handleStartNewTemplate = () => {
    setIsCreatingNew(true);
    setSelectedTemplateId(null);
    setBuilderForm({
      id: `template_${Date.now()}`,
      name: "Template Baru",
      trigger_event: "custom",
      body: "Halo {nama_ortu}, ...",
      auto_send: true,
      is_active: true,
    });
  };

  const handleInsertTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      setBuilderForm((prev) => ({ ...prev, body: prev.body + tag }));
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = builderForm.body;
    const updated = current.substring(0, start) + tag + current.substring(end);
    setBuilderForm((prev) => ({ ...prev, body: updated }));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleSaveBuilderTemplate = async () => {
    if (!builderForm.name || !builderForm.body) {
      toast.error("Nama template dan isi pesan tidak boleh kosong!");
      return;
    }
    setSavingTemplate(true);
    try {
      if (isCreatingNew) {
        const created = await apiFetch<WATemplate>("/admin/whatsapp/templates", {
          method: "POST",
          body: JSON.stringify({
            id: builderForm.id,
            name: builderForm.name,
            body: builderForm.body,
            trigger_event: builderForm.trigger_event || null,
            auto_send: builderForm.auto_send,
            is_active: builderForm.is_active,
          }),
        });
        toast.success("Template pesan baru berhasil dibuat!");
        await fetchTemplates();
        selectTemplate(created);
      } else {
        const updated = await apiFetch<WATemplate>(`/admin/whatsapp/templates/${builderForm.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: builderForm.name,
            body: builderForm.body,
            trigger_event: builderForm.trigger_event || null,
            auto_send: builderForm.auto_send,
            is_active: builderForm.is_active,
          }),
        });
        toast.success("Template pesan berhasil disimpan!");
        setTemplates((prev) => prev.map((t) => (t.id === builderForm.id ? updated : t)));
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus template "${id}"?`)) return;
    try {
      await apiFetch(`/admin/whatsapp/templates/${id}`, { method: "DELETE" });
      toast.success("Template berhasil dihapus.");
      const updated = templates.filter((t) => t.id !== id);
      setTemplates(updated);
      if (updated.length > 0) {
        selectTemplate(updated[0]);
      } else {
        handleStartNewTemplate();
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus template");
    }
  };

  const renderLivePreview = (rawBody: string) => {
    if (!rawBody) return "";
    let filled = rawBody.replace(/\{(\w+)\}/g, (_, key) => SAMPLE_VARS[key] ?? `{${key}}`);
    // Format WhatsApp formatting: *bold*, _italic_, ~strikethrough~
    filled = filled
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      .replace(/~(.*?)~/g, "<del>$1</del>")
      .replace(/\n/g, "<br />");
    return filled;
  };

  // Auto Reply handlers
  const handleSaveAutoReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoReplyForm.keyword || !autoReplyForm.reply_body) {
      toast.error("Kata kunci dan balasan wajib diisi!");
      return;
    }
    setSavingRule(true);
    try {
      if (autoReplyForm.id) {
        await apiFetch(`/admin/whatsapp/auto-replies/${autoReplyForm.id}`, {
          method: "PUT",
          body: JSON.stringify(autoReplyForm),
        });
        toast.success("Aturan balas otomatis berhasil diperbarui.");
      } else {
        await apiFetch("/admin/whatsapp/auto-replies", {
          method: "POST",
          body: JSON.stringify(autoReplyForm),
        });
        toast.success("Aturan balas otomatis baru ditambahkan.");
      }
      setShowAutoReplyForm(false);
      setAutoReplyForm({ keyword: "", reply_body: "", match_type: "exact", is_active: true });
      fetchAutoReplies();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan aturan");
    } finally {
      setSavingRule(false);
    }
  };

  const handleToggleAutoReply = async (rule: WAAutoReply) => {
    try {
      const updated = await apiFetch<WAAutoReply>(`/admin/whatsapp/auto-replies/${rule.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...rule, is_active: !rule.is_active }),
      });
      setAutoReplies((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      toast.success(`Aturan "${rule.keyword}" ${!rule.is_active ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status aturan");
    }
  };

  const handleDeleteAutoReply = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus aturan ini?")) return;
    try {
      await apiFetch(`/admin/whatsapp/auto-replies/${id}`, { method: "DELETE" });
      setAutoReplies((prev) => prev.filter((r) => r.id !== id));
      toast.success("Aturan balas otomatis berhasil dihapus.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus aturan");
    }
  };

  const handleSendDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !message) {
      toast.error("Nomor WA dan pesan wajib diisi!");
      return;
    }
    setIsSending(true);
    try {
      await apiFetch("/admin/whatsapp/send", {
        method: "POST",
        body: JSON.stringify({
          recipient: phone,
          body: message,
          patient_name: patientName,
          type: "manual",
        }),
      });
      toast.success("Pesan WhatsApp berhasil dikirim!");
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim pesan WhatsApp");
    } finally {
      setIsSending(false);
      setPhone("");
      setPatientName("");
      setMessage("");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header fixed>
        <div className="flex items-center gap-2 px-3 py-1.5 w-64 max-w-sm" />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className="flex flex-1 flex-col gap-4 sm:gap-6 pt-20">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Message Templates & WhatsApp Center</h2>
            <p className="text-muted-foreground">
              Desain template pesan otomatis, lihat preview live tampilan WhatsApp, kelola balas otomatis & log pengiriman.
            </p>
          </div>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border border-input bg-background hover:bg-muted transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh Data
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border">
          {[
            { id: "templates", label: "Template Builder", icon: Sparkles },
            { id: "logs", label: "Log Pengiriman", icon: History },
            { id: "auto_replies", label: "Balas Otomatis", icon: Bot },
            { id: "direct", label: "Kirim Manual", icon: Send },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="mt-2">
          
          {/* TAB 1: TEMPLATE BUILDER WITH LIVE PREVIEW */}
          {activeTab === "templates" && (
            <div className="flex flex-col gap-6">
              {/* Category / Template Selector Sub-bar */}
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => selectTemplate(tpl)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      !isCreatingNew && selectedTemplateId === tpl.id
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    <FileText size={14} />
                    {tpl.name || tpl.id}
                  </button>
                ))}

                <button
                  onClick={handleStartNewTemplate}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border border-dashed ${
                    isCreatingNew
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/50 hover:bg-muted text-foreground border-primary/40"
                  }`}
                >
                  <Plus size={14} />
                  + Template Baru
                </button>
              </div>

              {/* Main Builder Grid: Left Editor (2 Cols) | Right Live Preview (1 Col) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* LEFT PANEL: TEMPLATE BUILDER & QUICK TAGS */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col gap-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-4">
                    <div>
                      <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                        <Sparkles size={18} className="text-primary" />
                        {isCreatingNew ? "Buat Template Pesan Baru" : `Edit Template: ${builderForm.name}`}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ketik teks template & gunakan tombol tag cepat di bawah untuk menyisipkan variabel otomatis.
                      </p>
                    </div>

                    {!isCreatingNew && (
                      <button
                        onClick={() => handleDeleteTemplate(builderForm.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        title="Hapus Template Ini"
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    )}
                  </div>

                  {/* Template Meta Info (Name, Event Trigger) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-foreground uppercase tracking-wide">Nama Template</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Invoice Sender Template"
                        value={builderForm.name}
                        onChange={(e) => setBuilderForm({ ...builderForm, name: e.target.value })}
                        className="bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-foreground uppercase tracking-wide">Trigger Event Automasi</label>
                      <select
                        value={builderForm.trigger_event}
                        onChange={(e) => setBuilderForm({ ...builderForm, trigger_event: e.target.value })}
                        className="bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-full"
                      >
                        <option value="">-- Manual Only (Tidak Ada Trigger) --</option>
                        <option value="apply_created">apply_created (Formulir Pendaftaran Baru)</option>
                        <option value="invoice_created">invoice_created (Invoice Baru Diterbitkan)</option>
                        <option value="payment_received">payment_received (Konfirmasi Pembayaran Lunas)</option>
                        <option value="session_reminder">session_reminder (Pengingat Sesi Terapi)</option>
                        <option value="custom">custom (Custom Tagihan / Broadcast)</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick Insert Tags & Emojis */}
                  <div className="flex flex-col gap-2 bg-muted/30 border border-border p-3.5 rounded-lg">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      <Sparkles size={12} className="text-primary" /> Quick Insert Tags & Emojis
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_TAGS.map((t) => (
                        <button
                          key={t.label}
                          type="button"
                          onClick={() => handleInsertTag(t.tag)}
                          className="bg-background hover:bg-primary/10 border border-input hover:border-primary/40 text-foreground hover:text-primary text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Textarea Editor */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Isi Pesan Template</label>
                    <textarea
                      ref={textareaRef}
                      required
                      rows={10}
                      placeholder="Tulis format pesan WhatsApp lengkap..."
                      value={builderForm.body}
                      onChange={(e) => setBuilderForm({ ...builderForm, body: e.target.value })}
                      className="bg-background border border-input rounded-md p-3.5 text-sm text-foreground focus:outline-none focus:border-primary font-mono leading-relaxed resize-none w-full shadow-2xs"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Gunakan <code>*teks*</code> untuk cetak tebal, <code>_teks_</code> untuk miring.
                    </span>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={savingTemplate}
                      onClick={handleSaveBuilderTemplate}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/95 font-bold px-6 py-2.5 rounded-lg text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Save size={16} />
                      {savingTemplate ? "Menyimpan..." : "Simpan Template"}
                    </button>
                  </div>
                </div>

                {/* RIGHT PANEL: WHATSAPP LIVE PREVIEW */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 sticky top-24">
                  <div className="border-b border-border pb-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Eye size={16} className="text-primary" /> Live Preview
                      </h4>
                      <p className="text-[11px] text-muted-foreground">Bagaimana pesan terlihat di HP orang tua</p>
                    </div>
                    <span className="text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full uppercase">
                      WhatsApp UI
                    </span>
                  </div>

                  {/* Phone Mockup Screen */}
                  <div className="bg-[#efeae2] dark:bg-[#0b141a] border border-border rounded-2xl p-4 min-h-[380px] flex flex-col justify-between shadow-inner relative overflow-hidden">
                    {/* Header bar simulated */}
                    <div className="flex items-center gap-2 bg-[#075e54] text-white px-3 py-2 rounded-t-xl text-xs font-semibold -mx-4 -mt-4 mb-3 shadow-xs">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                        AK
                      </div>
                      <span>Allia Kids Official</span>
                    </div>

                    {/* Chat Bubble */}
                    <div className="self-end max-w-[92%] bg-[#dcf8c6] dark:bg-[#005c4b] text-[#303030] dark:text-[#e9edef] rounded-lg rounded-tr-none p-3.5 shadow-sm text-xs leading-relaxed relative border border-green-200/40 dark:border-green-800/40 my-2">
                      <div
                        dangerouslySetInnerHTML={{ __html: renderLivePreview(builderForm.body) }}
                        className="whitespace-pre-line break-words"
                      />
                      <div className="flex items-center justify-end gap-1 mt-2 text-[9px] text-muted-foreground/70 dark:text-white/60 font-sans">
                        <span>12:00 PM</span>
                        <span className="text-blue-500 dark:text-blue-400 font-bold">✓✓</span>
                      </div>
                    </div>

                    {/* Bottom Disclaimer */}
                    <div className="text-[10px] text-center text-muted-foreground/60 italic pt-4">
                      *Variabel <code>{`{...}`}</code> akan otomatis terisi data riil pasien saat pesan terkirim.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: LOG PENGIRIMAN */}
          {activeTab === "logs" && (
            <div className="flex flex-col gap-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-card border border-border p-3.5 rounded-xl shadow-xs">
                {/* Status Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => { setLogStatusFilter("all"); setLogCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      logStatusFilter === "all"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    Semua ({logs.length})
                  </button>

                  <button
                    onClick={() => { setLogStatusFilter("failed"); setLogCurrentPage(1); }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      logStatusFilter === "failed"
                        ? "bg-red-600 text-white border-red-600 shadow-xs"
                        : failedLogsCount > 0
                        ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800/40 hover:bg-red-100"
                        : "bg-background hover:bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    <XCircle size={12} />
                    Gagal ({failedLogsCount})
                  </button>

                  <button
                    onClick={() => { setLogStatusFilter("sent"); setLogCurrentPage(1); }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      logStatusFilter === "sent"
                        ? "bg-green-600 text-white border-green-600 shadow-xs"
                        : "bg-background hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    <CheckCircle size={12} />
                    Terkirim ({sentLogsCount})
                  </button>

                  <button
                    onClick={() => { setLogStatusFilter("received"); setLogCurrentPage(1); }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      logStatusFilter === "received"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-background hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    <MessageSquare size={12} />
                    Masuk ({receivedLogsCount})
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative min-w-[240px] sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Cari penerima, pasien, error..."
                    value={logSearch}
                    onChange={(e) => { setLogSearch(e.target.value); setLogCurrentPage(1); }}
                    className="w-full bg-background border border-input rounded-lg pl-8 pr-8 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                  />
                  {logSearch && (
                    <button
                      onClick={() => setLogSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Logs Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase">
                        <th className="p-4">Penerima</th>
                        <th className="p-4">Pasien</th>
                        <th className="p-4">Tipe Pesan</th>
                        <th className="p-4">Isi Pesan</th>
                        <th className="p-4">Waktu</th>
                        <th className="p-4">Status & Diagnosa</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                            {logSearch || logStatusFilter !== "all"
                              ? "Tidak ada data log yang cocok dengan filter pencarian."
                              : "Belum ada log pengiriman WhatsApp."}
                          </td>
                        </tr>
                      ) : (
                        filteredLogs
                          .slice((logCurrentPage - 1) * logPageSize, logCurrentPage * logPageSize)
                          .map((log) => (
                          <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4 font-semibold text-foreground">
                              <div className="flex items-center gap-1.5">
                                <Phone size={13} className="text-muted-foreground shrink-0" />
                                <span>{log.recipient}</span>
                              </div>
                            </td>
                            <td className="p-4 text-foreground">{log.patient_name || "-"}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded bg-muted text-[11px] font-mono font-medium text-foreground">
                                {log.type}
                              </span>
                            </td>
                            <td className="p-4 text-muted-foreground max-w-xs truncate" title={log.body}>
                              {log.body}
                            </td>
                            <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                              {log.created_at ? new Date(log.created_at).toLocaleString("id-ID") : "-"}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col items-start gap-1">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                                    log.status === "sent" || log.status === "received"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                      : log.status === "failed"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  }`}
                                >
                                  {log.status === "sent" || log.status === "received" ? (
                                    <CheckCircle size={10} />
                                  ) : log.status === "failed" ? (
                                    <XCircle size={10} />
                                  ) : (
                                    <Clock size={10} />
                                  )}
                                  {log.status}
                                </span>

                                {log.status === "failed" && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 max-w-[200px] truncate"
                                    title={log.error_message || "Gagal terkirim"}
                                  >
                                    <AlertTriangle size={11} className="shrink-0" />
                                    {log.error_message || "Detail error belum tercatat"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedLog(log)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-input bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
                                  title="Lihat Detail Log & Diagnosa"
                                >
                                  <Eye size={13} />
                                  Detail
                                </button>

                                {log.status === "failed" && (
                                  <button
                                    onClick={() => handleRetryLog(log.id)}
                                    disabled={retryingLogId === log.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                                    title="Kirim Ulang Pesan Ini"
                                  >
                                    <RotateCcw size={13} className={retryingLogId === log.id ? "animate-spin" : ""} />
                                    Retry
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <SimplePagination
                  currentPage={logCurrentPage}
                  pageSize={logPageSize}
                  totalItems={filteredLogs.length}
                  onPageChange={setLogCurrentPage}
                  onPageSizeChange={setLogPageSize}
                />
              </div>

              {/* Detailed Log & Error Diagnosis Modal Dialog */}
              <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <div className="flex items-center justify-between gap-3 pr-6">
                      <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <History size={18} className="text-primary" />
                        Detail Log & Diagnosa WhatsApp
                      </DialogTitle>
                      {selectedLog && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            selectedLog.status === "sent" || selectedLog.status === "received"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : selectedLog.status === "failed"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {selectedLog.status === "sent" || selectedLog.status === "received" ? (
                            <CheckCircle size={10} />
                          ) : selectedLog.status === "failed" ? (
                            <XCircle size={10} />
                          ) : (
                            <Clock size={10} />
                          )}
                          {selectedLog.status}
                        </span>
                      )}
                    </div>
                    <DialogDescription>
                      ID Log: #{selectedLog?.id} • Waktu: {selectedLog?.created_at ? new Date(selectedLog.created_at).toLocaleString("id-ID") : "-"}
                    </DialogDescription>
                  </DialogHeader>

                  {selectedLog && (
                    <div className="flex flex-col gap-4 py-2">
                      {/* Meta Information Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-muted/40 border border-border p-3 rounded-lg flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Nomor Penerima</span>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground font-mono">{selectedLog.recipient}</span>
                            <a
                              href={`https://wa.me/${selectedLog.recipient.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline text-[11px] inline-flex items-center gap-0.5"
                              title="Buka Chat di WhatsApp"
                            >
                              <ExternalLink size={11} /> WA
                            </a>
                          </div>
                        </div>

                        <div className="bg-muted/40 border border-border p-3 rounded-lg flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Nama Pasien</span>
                          <span className="text-xs font-bold text-foreground truncate">{selectedLog.patient_name || "-"}</span>
                        </div>

                        <div className="bg-muted/40 border border-border p-3 rounded-lg flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Tipe Event</span>
                          <span className="text-xs font-mono font-bold text-foreground">{selectedLog.type}</span>
                        </div>
                      </div>

                      {/* Error Diagnostic Box (if failed) */}
                      {(selectedLog.status === "failed" || selectedLog.error_message) && (
                        <div className="bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wide flex items-center gap-1.5">
                              <AlertTriangle size={15} className="text-red-600 dark:text-red-400" />
                              Detail Log Error & Diagnosa
                            </h4>
                            {selectedLog.error_message && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedLog.error_message || "");
                                  toast.success("Pesan error berhasil disalin!");
                                }}
                                className="text-[11px] font-semibold text-red-700 dark:text-red-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Copy size={12} /> Salin Error
                              </button>
                            )}
                          </div>

                          {/* Raw error code/message */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-red-900 dark:text-red-200">Pesan Error dari Provider / Gateway:</span>
                            <pre className="bg-background/90 border border-red-300/60 dark:border-red-900/50 p-2.5 rounded-lg text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap break-all leading-relaxed">
                              {selectedLog.error_message || "Tidak ada rincian pesan error yang dilaporkan (periksa token / session WaSender)."}
                            </pre>
                          </div>

                          {/* Intelligent Diagnostic & Solution */}
                          {(() => {
                            const advice = getDiagnosticAdvice(selectedLog.error_message);
                            if (!advice) return null;
                            return (
                              <div className="bg-background/80 border border-red-200/70 dark:border-red-900/40 p-3 rounded-lg flex flex-col gap-1.5 text-xs">
                                <div className="font-bold text-foreground flex items-center gap-1.5">
                                  <Info size={13} className="text-primary shrink-0" />
                                  {advice.title}
                                </div>
                                <p className="text-muted-foreground">{advice.desc}</p>
                                <div className="text-primary font-semibold mt-0.5">
                                  💡 <strong>Saran Solusi:</strong> {advice.solution}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Full Message Preview */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-1.5">
                            <FileText size={13} className="text-primary" />
                            Isi Pesan Lengkap
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedLog.body);
                              toast.success("Isi pesan berhasil disalin!");
                            }}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Copy size={12} /> Salin Pesan
                          </button>
                        </div>

                        <div className="bg-[#efeae2] dark:bg-[#0b141a] border border-border rounded-xl p-4">
                          <div className="bg-[#dcf8c6] dark:bg-[#005c4b] text-[#303030] dark:text-[#e9edef] rounded-lg p-3 text-xs leading-relaxed border border-green-200/40 dark:border-green-800/40 whitespace-pre-wrap break-words">
                            {selectedLog.body}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <DialogFooter className="flex flex-row justify-between items-center gap-2 pt-2 border-t border-border">
                    <div>
                      {selectedLog && (
                        <button
                          onClick={() => handleDeleteLog(selectedLog.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        >
                          <Trash2 size={14} /> Hapus Log
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedLog(null)}
                        className="px-3.5 py-2 text-xs font-bold rounded-lg border border-input bg-background hover:bg-muted text-foreground cursor-pointer"
                      >
                        Tutup
                      </button>

                      {selectedLog && selectedLog.status === "failed" && (
                        <button
                          onClick={() => handleRetryLog(selectedLog.id)}
                          disabled={retryingLogId === selectedLog.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          <RotateCcw size={14} className={retryingLogId === selectedLog.id ? "animate-spin" : ""} />
                          {retryingLogId === selectedLog.id ? "Mengirim Ulang..." : "Kirim Ulang Pesan (Retry)"}
                        </button>
                      )}
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* TAB 3: BALAS OTOMATIS (AUTO-REPLIES) */}
          {activeTab === "auto_replies" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Aturan jawaban otomatis berdasarkan kata kunci pesan WhatsApp masuk dari pasien/orang tua.
                </p>
                <button
                  onClick={() => {
                    setAutoReplyForm({ keyword: "", reply_body: "", match_type: "exact", is_active: true });
                    setShowAutoReplyForm(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold px-3.5 py-2 rounded-md cursor-pointer shadow-sm"
                >
                  <Plus size={14} /> Tambah Aturan Balas
                </button>
              </div>

              {/* Auto Reply Create/Edit Form */}
              {showAutoReplyForm && (
                <div className="bg-card border border-primary/30 rounded-xl p-5 shadow-md flex flex-col gap-4">
                  <h3 className="font-bold text-sm text-foreground">
                    {autoReplyForm.id ? "Edit Aturan Balas Otomatis" : "Tambah Aturan Balas Otomatis"}
                  </h3>
                  <form onSubmit={handleSaveAutoReply} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                          Kata Kunci (Keyword)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: halo, biaya, alamat, *"
                          value={autoReplyForm.keyword}
                          onChange={(e) => setAutoReplyForm({ ...autoReplyForm, keyword: e.target.value })}
                          className="bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-full"
                        />
                        <span className="text-[10px] text-muted-foreground">
                          Gunakan <code>*</code> untuk kata kunci umum / fallback default.
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                          Tipe Pencocokan
                        </label>
                        <select
                          value={autoReplyForm.match_type}
                          onChange={(e) =>
                            setAutoReplyForm({ ...autoReplyForm, match_type: e.target.value as any })
                          }
                          className="bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-full"
                        >
                          <option value="exact">Persis Sama (Exact)</option>
                          <option value="contains">Mengandung Kata (Contains)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                        Isi Balasan Otomatis
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Tulis pesan balasan otomatis..."
                        value={autoReplyForm.reply_body}
                        onChange={(e) => setAutoReplyForm({ ...autoReplyForm, reply_body: e.target.value })}
                        className="bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none w-full"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAutoReplyForm(false)}
                        className="bg-muted text-muted-foreground hover:bg-muted/95 text-xs font-bold px-3.5 py-2 rounded-md cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={savingRule}
                        className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold px-4 py-2 rounded-md cursor-pointer disabled:opacity-50"
                      >
                        {savingRule ? "Menyimpan..." : "Simpan Aturan"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Rules List Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase">
                        <th className="p-4">Kata Kunci</th>
                        <th className="p-4">Tipe Match</th>
                        <th className="p-4">Isi Balasan Otomatis</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {autoReplies.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                            Belum ada aturan balas otomatis terdaftar.
                          </td>
                        </tr>
                      ) : (
                        autoReplies
                          .slice((autoCurrentPage - 1) * autoPageSize, autoCurrentPage * autoPageSize)
                          .map((rule) => (
                          <tr key={rule.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4 font-bold text-foreground flex items-center gap-2">
                              <Bot size={16} className="text-primary" />
                              <code className="bg-muted px-2 py-0.5 rounded text-xs">{rule.keyword}</code>
                            </td>
                            <td className="p-4 text-xs font-semibold text-muted-foreground uppercase">
                              {rule.match_type}
                            </td>
                            <td className="p-4 text-muted-foreground max-w-sm truncate">{rule.reply_body}</td>
                            <td className="p-4">
                              <button
                                onClick={() => handleToggleAutoReply(rule)}
                                className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                              >
                                {rule.is_active ? (
                                  <>
                                    <ToggleRight className="text-green-500" size={20} />
                                    <span className="text-green-600 dark:text-green-400">Aktif</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="text-muted-foreground" size={20} />
                                    <span className="text-muted-foreground">Non-aktif</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setAutoReplyForm(rule as any);
                                    setShowAutoReplyForm(true);
                                  }}
                                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Edit Aturan"
                                >
                                  <Settings size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAutoReply(rule.id)}
                                  className="p-1.5 rounded-md hover:bg-red-100 text-muted-foreground hover:text-red-600 dark:hover:bg-red-900/30 cursor-pointer"
                                  title="Hapus Aturan"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <SimplePagination
                  currentPage={autoCurrentPage}
                  pageSize={autoPageSize}
                  totalItems={autoReplies.length}
                  onPageChange={setAutoCurrentPage}
                  onPageSizeChange={setAutoPageSize}
                />
              </div>
            </div>
          )}

          {/* TAB 4: KIRIM MANUAL */}
          {activeTab === "direct" && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm max-w-xl">
              <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <Send size={18} className="text-primary" />
                Kirim Pesan WhatsApp Langsung
              </h3>

              <form onSubmit={handleSendDirect} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Nomor Penerima (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081915237935 atau +6281915237935"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-full"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Mendukung semua format: <code>0812...</code>, <code>+62812...</code>, atau <code>62812...</code> (otomatis disesuaikan dengan format API WaSender).
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Nama Penerima (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Ibu Rina Amalia"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Isi Pesan WhatsApp
                  </label>
                  <textarea
                    required
                    placeholder="Tulis pesan lengkap yang ingin dikirim..."
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none w-full"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="bg-primary text-primary-foreground hover:bg-primary/95 font-bold py-2.5 rounded-md text-sm transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Send size={14} />
                  {isSending ? "Mengirim..." : "Kirim Sekarang"}
                </button>
              </form>
            </div>
          )}

        </div>
      </Main>
    </div>
  );
}
