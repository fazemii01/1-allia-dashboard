import React, { useState } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { Send, CheckCircle, XCircle, Clock, FileText, Settings, History, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface WATemplate {
  id: string;
  name: string;
  body: string;
  isActive: boolean;
}

interface WALog {
  id: string;
  recipient: string;
  patientName: string;
  type: string;
  body: string;
  status: "sent" | "failed" | "pending";
  timestamp: string;
}

const mockTemplates: WATemplate[] = [
  {
    id: "registration_confirm",
    name: "Konfirmasi Registrasi Baru",
    body: "Halo Ayah/Bunda dari {{nama_anak}}, terima kasih telah mengisi formulir pendaftaran di Allia Kids. Terapis kami akan segera menghubungi Anda untuk menjadwalkan konsultasi awal.",
    isActive: true,
  },
  {
    id: "session_reminder",
    name: "Pengingat Sesi Terapi",
    body: "Halo Ayah/Bunda dari {{nama_anak}}, mengingatkan kembali jadwal terapi wicara sikecil besok tanggal {{tanggal_terapi}} jam {{jam_terapi}} bersama terapis {{nama_terapis}}.",
    isActive: true,
  },
  {
    id: "invoice_billing",
    name: "Tagihan Bulanan Sesi",
    body: "Halo Ayah/Bunda dari {{nama_anak}}, berikut kami kirimkan rincian invoice untuk sesi terapi bulan {{bulan_tagihan}}. Total pembayaran adalah {{total_bayar}}.",
    isActive: true,
  }
];

const mockLogs: WALog[] = [
  {
    id: "LOG001",
    recipient: "081915237935",
    patientName: "Arfan Wijaya",
    type: "registration_confirm",
    body: "Halo Ayah/Bunda dari Arfan Wijaya, terima kasih telah mengisi formulir pendaftaran di Allia Kids. Terapis kami akan segera menghubungi Anda untuk menjadwalkan konsultasi awal.",
    status: "sent",
    timestamp: "2026-07-14 11:20:45",
  },
  {
    id: "LOG002",
    recipient: "082244866770",
    patientName: "Rania Amanda",
    type: "session_reminder",
    body: "Halo Ayah/Bunda dari Rania Amanda, mengingatkan kembali jadwal terapi wicara sikecil besok tanggal 15 Juli jam 14:00 bersama terapis Faza S.Psi.",
    status: "sent",
    timestamp: "2026-07-14 09:15:22",
  },
  {
    id: "LOG003",
    recipient: "089887766554",
    patientName: "Budi Santoso",
    type: "invoice_billing",
    body: "Halo Ayah/Bunda dari Budi Santoso, berikut kami kirimkan rincian invoice untuk sesi terapi bulan Juni. Total pembayaran adalah Rp 850.000.",
    status: "failed",
    timestamp: "2026-07-13 16:45:10",
  }
];

export function WhatsAppManager() {
  const [activeTab, setActiveTab] = useState<"logs" | "templates" | "direct">("logs");
  const [templates, setTemplates] = useState<WATemplate[]>(mockTemplates);
  const [logs, setLogs] = useState<WALog[]>(mockLogs);

  // Direct send state
  const [phone, setPhone] = useState("");
  const [patientName, setPatientName] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Template edit state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const handleSaveTemplate = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, body: editBody } : t))
    );
    setEditingTemplateId(null);
    toast.success("Template WhatsApp berhasil diperbarui.");
  };

  const handleSendDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !message) {
      toast.error("Nomor WA dan pesan wajib diisi!");
      return;
    }

    setIsSending(true);

    try {
      // API trigger target: Serve NestJS
      const response = await fetch("http://localhost:3001/api/admin/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          message_body: message,
          patient_name: patientName,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengirim");
      }

      toast.success("Pesan WhatsApp berhasil dikirim ke antrian!");
    } catch (err) {
      console.warn("Backend not running. Simulation send active...", err);
      
      // Local simulation add
      const newLog: WALog = {
        id: "LOG" + Math.floor(Math.random() * 1000),
        recipient: phone,
        patientName: patientName || "Umum / Non-Pasien",
        type: "manual",
        body: message,
        status: "sent",
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      };

      setLogs((prev) => [newLog, ...prev]);
      toast.success("WhatsApp Terkirim (Simulasi Offline)");
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
        <div>
          <h2 className="text-2xl font-bold tracking-tight">WhatsApp Notification Center</h2>
          <p className="text-muted-foreground">
            Monitor log pengiriman whatsapp template, ubah pesan template, dan kirim pesan manual.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border">
          {[
            { id: "logs", label: "Log Pengiriman", icon: History },
            { id: "templates", label: "Template Pesan", icon: FileText },
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
        <div className="mt-4">
          
          {/* TAB 1: LOG PENGIRIMAN */}
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
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-semibold text-foreground">{log.recipient}</td>
                        <td className="p-4 text-foreground">{log.patientName}</td>
                        <td className="p-4 font-semibold text-muted-foreground">{log.type}</td>
                        <td className="p-4 text-muted-foreground max-w-xs truncate">{log.body}</td>
                        <td className="p-4 text-xs text-muted-foreground">{log.timestamp}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              log.status === "sent"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : log.status === "failed"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}
                          >
                            {log.status === "sent" ? (
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TEMPLATE PESAN */}
          {activeTab === "templates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((tpl) => (
                <div key={tpl.id} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <FileText size={16} className="text-primary" />
                      {tpl.name}
                    </h3>
                    <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded uppercase tracking-wider text-muted-foreground">
                      {tpl.id}
                    </span>
                  </div>

                  {editingTemplateId === tpl.id ? (
                    <div className="flex flex-col gap-3">
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={4}
                        className="bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none w-full"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingTemplateId(null)}
                          className="bg-muted text-muted-foreground hover:bg-muted/95 text-xs font-bold px-3 py-1.5 rounded-md cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => handleSaveTemplate(tpl.id)}
                          className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold px-3 py-1.5 rounded-md cursor-pointer"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/20 p-4 rounded-lg">
                        {tpl.body}
                      </p>
                      <button
                        onClick={() => {
                          setEditingTemplateId(tpl.id);
                          setEditBody(tpl.body);
                        }}
                        className="inline-flex items-center gap-1.5 border border-input bg-background hover:bg-muted text-foreground text-xs font-bold px-3.5 py-2 rounded-md w-fit cursor-pointer"
                      >
                        <Settings size={12} /> Ubah Template
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: KIRIM MANUAL */}
          {activeTab === "direct" && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm max-w-xl">
              <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <Send size={18} className="text-primary" />
                Kirim Pesan WhatsApp Langsung
              </h3>

              <form onSubmit={handleSendDirect} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Nomor Penerima (WhatsApp)</label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081915237935"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Nama Penerima (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Ibu Rina Amalia"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Isi Pesan WhatsApp</label>
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
