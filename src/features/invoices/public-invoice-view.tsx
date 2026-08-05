import React, { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Upload,
  ArrowLeft,
  Calendar,
  CreditCard,
  User,
  ShieldCheck,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

interface InvoiceItem {
  description: string;
  amount: number;
}

interface InvoiceData {
  id: number;
  invoice_number: string;
  invoice_token?: string;
  patient_id?: number;
  total_amount: number;
  full_amount?: number;
  payment_type?: string;
  dp_percentage?: number;
  installment_no?: number;
  status: "belum_bayar" | "menunggu_verifikasi" | "sudah_bayar" | "dibatalkan" | string;
  payment_method?: string;
  payment_proof?: string;
  due_date?: string;
  created_at?: string;
  patient?: {
    nama_lengkap: string;
    nama_ayah?: string;
    nama_ibu?: string;
    no_telepon?: string;
    email_ortu?: string;
    jenis_terapi?: string;
  };
  items?: InvoiceItem[];
}

export default function PublicInvoiceView() {
  const { code } = useParams({ from: '/invoice/$code' });
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [selectedBank, setSelectedBank] = useState("BCA");

  const API_BASE = import.meta.env.VITE_API_URL || "https://backend.alliakids.com/api";

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      let res = await fetch(`${API_BASE}/public/invoices/${code}`);
      if (!res.ok) {
        res = await fetch(`${API_BASE}/invoice/${code}`);
      }
      if (!res.ok) {
        throw new Error(`Invoice "${code}" tidak ditemukan`);
      }
      const data = await res.json();
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat invoice.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code) {
      fetchInvoice();
    }
  }, [code]);

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile || !invoice) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("payment_proof", proofFile);
    formData.append("payment_method", selectedBank);

    try {
      const token = invoice.invoice_token || code;
      const res = await fetch(`${API_BASE}/invoice/${token}/upload-proof-public`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Gagal mengunggah bukti pembayaran.");
      }

      toast.success("Bukti pembayaran berhasil diunggah! Tim kami akan memverifikasi dalam waktu singkat.");
      fetchInvoice();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah bukti.");
    } finally {
      setUploading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sudah_bayar":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: "LUNAS",
        };
      case "menunggu_verifikasi":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: <Clock className="h-4 w-4" />,
          label: "MENUNGGU VERIFIKASI",
        };
      default:
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: <AlertCircle className="h-4 w-4" />,
          label: "BELUM DIBAYAR",
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-300 font-medium">Memuat Tagihan Invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-rose-500/10 p-4 rounded-full border border-rose-500/20 text-rose-400 mb-4">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Invoice Tidak Ditemukan</h1>
        <p className="text-slate-400 max-w-md mb-6">
          {error || `Invoice dengan kode "${code}" tidak ada atau telah dihapus.`}
        </p>
        <a
          href="https://alliakids.com"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg"
        >
          Kembali ke Beranda
        </a>
      </div>
    );
  }

  const badge = getStatusBadge(invoice.status);
  const items = invoice.items || [{ description: "Biaya Terapi", amount: invoice.total_amount }];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
              A
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">KLINIK ALLIAKIDS</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Rincian Tagihan Resmi Pendaftaran & Terapi Anak</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${badge.bg}`}>
              {badge.icon}
              {badge.label}
            </span>
            <button
              onClick={handlePrint}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title="Cetak Invoice"
            >
              <Printer className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nomor Invoice</span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{invoice.invoice_number}</span>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Diterbitkan: {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              </div>
            </div>

            <div className="md:text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Jatuh Tempo</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              </span>
              <span className="text-xs text-rose-500 font-semibold mt-1 block">Mohon selesaikan sebelum batas jatuh tempo.</span>
            </div>
          </div>

          {/* Patient Info Section */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Nama Orang Tua / Wali</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {invoice.patient?.nama_ibu || invoice.patient?.nama_ayah || 'Bapak / Ibu'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Nama Pasien (Anak)</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {invoice.patient?.nama_lengkap || '-'}
              </span>
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Rincian Layanan & Sesi</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">Deskripsi</th>
                    <th className="py-2.5 px-3 text-right">Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, idx) => (
                    <tr key={idx} className="text-slate-800 dark:text-slate-200">
                      <td className="py-3 px-3 font-medium">{item.description}</td>
                      <td className="py-3 px-3 text-right font-bold">
                        Rp {Number(item.amount).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Amount Box */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 p-5 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">Total Tagihan Harus Dibayar</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Termasuk pajak & biaya admin</span>
            </div>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-300">
              Rp {Number(invoice.total_amount).toLocaleString('id-ID')}
            </div>
          </div>

          {/* Bank Transfer Instructions */}
          {invoice.status !== 'sudah_bayar' && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Instruksi Pembayaran Transfer Bank
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <span>Bank BCA</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">Utama</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white tracking-wider my-1">
                    8831 290 890
                  </div>
                  <div className="text-xs text-slate-500">a.n. Yayasan Allia Kids Indonesia</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <span>Bank Mandiri</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white tracking-wider my-1">
                    137 00 2901 8890
                  </div>
                  <div className="text-xs text-slate-500">a.n. Yayasan Allia Kids Indonesia</div>
                </div>
              </div>

              {/* Upload Proof Form */}
              <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Konfirmasi / Unggah Bukti Transfer</h4>
                <form onSubmit={handleUploadProof} className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Pilih Bank Tujuan Transfer</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <option value="BCA">Bank BCA - 8831 290 890</option>
                      <option value="Mandiri">Bank Mandiri - 137 00 2901 8890</option>
                      <option value="Lainnya">Transfer Bank Lain / E-Wallet</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">File Gambar Bukti Transfer (JPG, PNG)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || !proofFile}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Mengunggah..." : "Kirim Bukti Pembayaran"}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>© {new Date().getFullYear()} Klinik Allia Kids. Seluruh Hak Cipta Dilindungi.</p>
          <p>Jika butuh bantuan, hubungi Customer Care Allia Kids via WhatsApp 0895-4293-32182.</p>
        </div>

      </div>
    </div>
  );
}
