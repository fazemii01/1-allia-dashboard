import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, FileText, CheckCircle2, ShieldCheck, User, Calendar, MapPin, Phone, Mail } from "lucide-react";

export interface PatientPdfData {
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
  status: string;
  therapist?: any;
  therapist_id?: number | null;
  catatan_internal?: string;
  created_at?: string;

  formulir_wicara?: Record<string, any>;
  formulir_hipoterapi?: Record<string, any>;

  // Fallback props
  [key: string]: any;
}

interface PatientPdfBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientPdfData | null;
}

export const PatientPdfBuilder: React.FC<PatientPdfBuilderProps> = ({
  isOpen,
  onClose,
  patient,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!patient) return null;

  const wicara = patient.formulir_wicara || {};
  const hipo = patient.formulir_hipoterapi || {};

  const getValue = (key: string, fallbackKey?: string) => {
    if (wicara[key] !== undefined && wicara[key] !== null && wicara[key] !== '') return wicara[key];
    if (hipo[key] !== undefined && hipo[key] !== null && hipo[key] !== '') return hipo[key];
    if (patient[key] !== undefined && patient[key] !== null && patient[key] !== '') return patient[key];
    if (fallbackKey && patient[fallbackKey] !== undefined && patient[fallbackKey] !== null && patient[fallbackKey] !== '') return patient[fallbackKey];
    return "-";
  };

  const formatBooleanOrText = (val: any) => {
    if (val === true || val === "ya" || val === "Ya" || val === "true") return "Ya";
    if (val === false || val === "tidak" || val === "Tidak" || val === "false") return "Tidak";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object" && val !== null) return JSON.stringify(val);
    return val || "-";
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Pastikan pop-up diizinkan oleh browser.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Formulir Rekapitulasi Pasien - ${patient.nama_lengkap}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
            
            @page {
              size: A4 portrait;
              margin: 12mm 15mm 15mm 15mm;
            }

            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            body {
              font-family: 'Plus Jakarta Sans', Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              font-size: 11pt;
              line-height: 1.5;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .pdf-container {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              padding: 0;
            }

            .pdf-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }

            .pdf-logo-brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .pdf-logo-icon {
              width: 44px;
              height: 44px;
              background: #1e3a8a;
              color: #ffffff;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 20px;
            }

            .pdf-title-block h1 {
              font-size: 16pt;
              font-weight: 700;
              color: #1e3a8a;
              letter-spacing: -0.3px;
            }

            .pdf-title-block p {
              font-size: 9pt;
              color: #475569;
              font-weight: 500;
            }

            .pdf-doc-meta {
              text-align: right;
              font-size: 9pt;
              color: #334155;
            }

            .pdf-doc-meta .badge {
              display: inline-block;
              padding: 3px 8px;
              background: #eff6ff;
              color: #1d4ed8;
              border: 1px solid #bfdbfe;
              border-radius: 4px;
              font-weight: 600;
              font-size: 8pt;
              margin-top: 4px;
            }

            .pdf-section {
              margin-bottom: 16px;
              page-break-inside: avoid;
            }

            .pdf-section-header {
              background: #f1f5f9;
              border-left: 4px solid #1e3a8a;
              padding: 6px 10px;
              font-size: 10.5pt;
              font-weight: 700;
              color: #1e3a8a;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }

            .pdf-grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 16px;
            }

            .pdf-field {
              display: flex;
              flex-direction: column;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 4px;
            }

            .pdf-field-full {
              grid-column: span 2;
            }

            .pdf-label {
              font-size: 8.5pt;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }

            .pdf-value {
              font-size: 10pt;
              font-weight: 500;
              color: #0f172a;
              margin-top: 1px;
            }

            .pdf-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              font-size: 9.5pt;
            }

            .pdf-table th, .pdf-table td {
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              text-align: left;
            }

            .pdf-table th {
              background: #f8fafc;
              color: #1e293b;
              font-weight: 600;
            }

            .pdf-notes-box {
              background: #fffbeb;
              border: 1px solid #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 10px;
              border-radius: 4px;
              font-size: 9.5pt;
              color: #78350f;
            }

            .pdf-footer {
              margin-top: 24px;
              padding-top: 12px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              page-break-inside: avoid;
            }

            .pdf-sig-box {
              text-align: center;
              width: 200px;
            }

            .pdf-sig-line {
              margin-top: 50px;
              border-bottom: 1.5px dashed #475569;
            }

            .pdf-sig-name {
              font-weight: 600;
              font-size: 9.5pt;
              margin-top: 4px;
            }

            .pdf-watermark {
              font-size: 8pt;
              color: #94a3b8;
              text-align: center;
              margin-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const regNo = `ALK-REG-${String(patient.id).padStart(5, "0")}`;
  const isWicara = (patient.jenis_terapi || "").toLowerCase().includes("wicara");
  const isHipo = (patient.jenis_terapi || "").toLowerCase().includes("hipo");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Formulir Rekapitulasi Pasien (PDF Builder)
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Pratinjau resmi dokumen pendaftaran & kuesioner pasien Alliakids
              </p>
            </div>
          </div>

          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Printer className="h-4 w-4" />
            Cetak / Simpan PDF
          </Button>
        </DialogHeader>

        {/* PDF Document Preview Box */}
        <div className="bg-white text-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 my-4 space-y-6">
          <div ref={printRef} className="pdf-container">
            {/* Header / Kop Surat */}
            <div className="pdf-header">
              <div className="pdf-logo-brand">
                <div className="pdf-logo-icon">A</div>
                <div className="pdf-title-block">
                  <h1>KLINIK ALLIAKIDS</h1>
                  <p>Layanan Terapi Anak, Terapi Wicara, Hipoterapi & Tumbuh Kembang</p>
                </div>
              </div>
              <div className="pdf-doc-meta">
                <div><strong>No. Registrasi:</strong> {regNo}</div>
                <div><strong>Tanggal Dibuat:</strong> {patient.created_at ? new Date(patient.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID')}</div>
                <div className="badge">STATUS: {(patient.status || 'baru').toUpperCase()}</div>
              </div>
            </div>

            {/* Section A: Identitas Anak & Orang Tua */}
            <div className="pdf-section">
              <div className="pdf-section-header">
                <span>A. IDENTITAS PASIEN & ORANG TUA</span>
                <User className="h-4 w-4 inline" />
              </div>
              <div className="pdf-grid-2">
                <div className="pdf-field">
                  <span className="pdf-label">Nama Lengkap Anak</span>
                  <span className="pdf-value">{patient.nama_lengkap || "-"}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Jenis Kelamin</span>
                  <span className="pdf-value">{patient.jenis_kelamin || "-"}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Tempat & Tanggal Lahir</span>
                  <span className="pdf-value">
                    {patient.tempat_lahir || "-"}, {patient.tanggal_lahir || "-"}
                  </span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Usia Pasien</span>
                  <span className="pdf-value">{patient.usia ? `${patient.usia} Tahun` : "-"}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Pendidikan Anak</span>
                  <span className="pdf-value">{getValue("pendidikan_anak")}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Program Terapi Didaftarkan</span>
                  <span className="pdf-value font-semibold text-blue-800">
                    {patient.jenis_terapi ? patient.jenis_terapi.replace('_', ' ').toUpperCase() : "-"}
                  </span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Nama Ayah</span>
                  <span className="pdf-value">{patient.nama_ayah || "-"}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Nama Ibu</span>
                  <span className="pdf-value">{patient.nama_ibu || "-"}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">No. Telepon / WhatsApp Orang Tua</span>
                  <span className="pdf-value">{patient.no_telepon || "-"}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Email Orang Tua</span>
                  <span className="pdf-value">{patient.email_ortu || "-"}</span>
                </div>
                <div className="pdf-field pdf-field-full">
                  <span className="pdf-label">Alamat Lengkap Tempat Tinggal</span>
                  <span className="pdf-value">{patient.alamat || "-"}</span>
                </div>
              </div>
            </div>

            {/* Section B: Perkembangan & Relasi Sosial */}
            <div className="pdf-section">
              <div className="pdf-section-header">
                <span>B. LINGKUNGAN & RELASI SOSIAL ANAK</span>
              </div>
              <div className="pdf-grid-2">
                <div className="pdf-field">
                  <span className="pdf-label">Relasi Sosial Anak</span>
                  <span className="pdf-value">{getValue("relasi_sosial")}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Relasi Hubungan dengan Ibu</span>
                  <span className="pdf-value">{getValue("relasi_dengan_ibu")}</span>
                </div>
                <div className="pdf-field pdf-field-full">
                  <span className="pdf-label">Relasi Hubungan dengan Saudara Kandung</span>
                  <span className="pdf-value">{getValue("relasi_dengan_saudara")}</span>
                </div>
              </div>
            </div>

            {/* Section C: Kuesioner Detail Terapi (Apply Form Submission) */}
            <div className="pdf-section">
              <div className="pdf-section-header">
                <span>C. REKAPITULASI KUESIONER PEMERIKSAAN AWAL</span>
              </div>
              <div className="pdf-grid-2">
                {/* Specific Wicara Questions */}
                <div className="pdf-field">
                  <span className="pdf-label">Keluhan / Masalah Bicara Utama</span>
                  <span className="pdf-value">{formatBooleanOrText(getValue("masalah_bicara", "keluhan_utama"))}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Durasi / Berapa Lama Terjadi</span>
                  <span className="pdf-value">{getValue("sudah_berapa_lama_wicara", "sudah_berapa_lama_hipo")}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Gangguan Utama yang Dialami</span>
                  <span className="pdf-value">{formatBooleanOrText(getValue("gangguan_utama"))}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Pengurus Utama Anak Sehari-hari</span>
                  <span className="pdf-value">{formatBooleanOrText(getValue("pengurus_utama_wicara", "pengurus_utama_hipo"))}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Bahasa Pengantar Sehari-hari</span>
                  <span className="pdf-value">{getValue("bahasa_sehari_hari_wicara", "bahasa_sehari_hari_hipo")}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Sedang/Pernah Dalam Penanganan Lain</span>
                  <span className="pdf-value">
                    {formatBooleanOrText(getValue("dalam_penanganan_lain", "dalam_penanganan_dokter"))}
                    {getValue("nama_penanganan_lain", "nama_dokter") !== "-" && ` (${getValue("nama_penanganan_lain", "nama_dokter")})`}
                  </span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Riwayat Masalah Kehamilan & Persalinan</span>
                  <span className="pdf-value">
                    {formatBooleanOrText(getValue("masalah_kehamilan_wicara", "masalah_kehamilan_hipo"))}
                    {getValue("detail_masalah_kehamilan_wicara", "detail_masalah_kehamilan_hipo") !== "-" && ` - ${getValue("detail_masalah_kehamilan_wicara", "detail_masalah_kehamilan_hipo")}`}
                  </span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Riwayat Keterlambatan Perkembangan</span>
                  <span className="pdf-value">
                    {formatBooleanOrText(getValue("riwayat_keterlambatan"))}
                    {getValue("detail_keterlambatan") !== "-" && ` - ${getValue("detail_keterlambatan")}`}
                  </span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Riwayat Trauma Fisik / Emosi</span>
                  <span className="pdf-value">
                    {formatBooleanOrText(getValue("pernah_trauma_wicara", "pernah_trauma_hipo"))}
                    {getValue("detail_trauma_wicara", "detail_trauma_hipo") !== "-" && ` - ${getValue("detail_trauma_wicara", "detail_trauma_hipo")}`}
                  </span>
                </div>
                <div className="pdf-field pdf-field-full">
                  <span className="pdf-label">Harapan Orang Tua Terhadap Hasil Terapi</span>
                  <span className="pdf-value">{getValue("harapan_terapi_wicara", "harapan_terapi_hipo")}</span>
                </div>
              </div>
            </div>

            {/* Section D: Internal Notes & Therapist Assignment */}
            <div className="pdf-section">
              <div className="pdf-section-header">
                <span>D. VERIFIKASI KLINIK & PENUGASAN TERAPIS</span>
              </div>
              <div className="pdf-grid-2">
                <div className="pdf-field">
                  <span className="pdf-label">Terapis Penanggung Jawab</span>
                  <span className="pdf-value">
                    {patient.therapist ? patient.therapist.name : (patient.therapist_id ? `Terapis #${patient.therapist_id}` : "Belum Ditugaskan")}
                  </span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Status Pendaftaran</span>
                  <span className="pdf-value font-semibold text-blue-700">
                    {(patient.status || "baru").toUpperCase()}
                  </span>
                </div>
                <div className="pdf-field pdf-field-full">
                  <span className="pdf-label">Catatan Internal Tim Klinik / Terapis</span>
                  <span className="pdf-value">{patient.catatan_internal || "Belum ada catatan internal."}</span>
                </div>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="pdf-footer">
              <div className="pdf-sig-box">
                <div>Orang Tua / Wali Pasien,</div>
                <div className="pdf-sig-line"></div>
                <div className="pdf-sig-name">({patient.nama_ibu || patient.nama_ayah || "Orang Tua Pasien"})</div>
              </div>
              <div className="pdf-sig-box">
                <div>Admin / Verifikator Klinik,</div>
                <div className="pdf-sig-line"></div>
                <div className="pdf-sig-name">( Tim Alliakids )</div>
              </div>
            </div>

            <div className="pdf-watermark">
              Dokumen ini dicetak secara otomatis melalui Sistem Manajemen Klinik Alliakids pada {new Date().toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Printer className="h-4 w-4" />
            Cetak / Simpan sebagai PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
