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
} from "lucide-react";
import { toast } from "sonner";
import { SimplePagination } from "@/components/simple-pagination";

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
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                          Belum ada log pengiriman WhatsApp.
                        </td>
                      </tr>
                    ) : (
                      logs
                        .slice((logCurrentPage - 1) * logPageSize, logCurrentPage * logPageSize)
                        .map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4 font-semibold text-foreground">{log.recipient}</td>
                          <td className="p-4 text-foreground">{log.patient_name || "-"}</td>
                          <td className="p-4 font-semibold text-muted-foreground">{log.type}</td>
                          <td className="p-4 text-muted-foreground max-w-xs truncate">{log.body}</td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {log.created_at ? new Date(log.created_at).toLocaleString("id-ID") : "-"}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
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
                totalItems={logs.length}
                onPageChange={setLogCurrentPage}
                onPageSizeChange={setLogPageSize}
              />
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
