import React, { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";

export interface PatientPdfData {
  id: string | number;
  nama_lengkap: string;
  usia?: number | string;
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
  bookings?: any[];
  [key: string]: any;
}

interface PatientPdfBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientPdfData | null;
  selectedProgram?: string;
}

export const PatientPdfBuilder: React.FC<PatientPdfBuilderProps> = ({
  isOpen,
  onClose,
  patient,
  selectedProgram,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!patient) return null;

  // Resolve target booking based on selectedProgram or use first booking
  const bookingList = (patient.bookings && patient.bookings.length > 0)
    ? patient.bookings
    : [patient];

  const targetBooking = selectedProgram
    ? (bookingList.find((b: any) => (b.jenis_terapi || "").toLowerCase().includes(selectedProgram.toLowerCase())) || bookingList[0])
    : bookingList[0];

  const wicara = targetBooking?.formulir_wicara || patient.formulir_wicara || {};
  const hipo = targetBooking?.formulir_hipoterapi || patient.formulir_hipoterapi || {};

  const getVal = (...keys: string[]) => {
    const sources = [wicara, hipo, targetBooking, patient];
    for (const key of keys) {
      for (const src of sources) {
        if (src && src[key] !== undefined && src[key] !== null && src[key] !== "" && src[key] !== "-") {
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

  const formatBooleanOrText = (val: any) => {
    if (val === true || val === "ya" || val === "Ya" || val === "true" || val === 1 || val === "1") return "Ya";
    if (val === false || val === "tidak" || val === "Tidak" || val === "false" || val === 0 || val === "0") return "Tidak";
    if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "-";
    if (typeof val === "object" && val !== null) return JSON.stringify(val);
    if (!val || val === "") return "-";
    return val;
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
          <base href="${window.location.origin}/" />
          <title>Formulir Rekapitulasi Pasien - ${patient.nama_lengkap}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
            
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
              padding: 10px;
              background: #ffffff;
            }

            /* Header Kop Surat */
            .pdf-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-b: 3px double #0284c7;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }

            .pdf-brand {
              display: flex;
              align-items: center;
              gap: 14px;
            }

            .pdf-logo {
              height: 52px;
              width: auto;
              object-fit: contain;
            }

            .pdf-brand-text h1 {
              font-size: 18pt;
              font-weight: 800;
              color: #0369a1;
              letter-spacing: -0.5px;
            }

            .pdf-brand-text p {
              font-size: 9pt;
              color: #64748b;
              font-weight: 500;
            }

            .pdf-doc-info {
              text-align: right;
            }

            .pdf-doc-info .doc-title {
              font-size: 11pt;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
            }

            .pdf-doc-info .doc-meta {
              font-size: 9pt;
              color: #64748b;
            }

            /* Section Styling */
            .pdf-section {
              margin-bottom: 18px;
            }

            .pdf-section-header {
              background: #f0f9ff;
              border-left: 4px solid #0284c7;
              padding: 6px 12px;
              font-size: 10pt;
              font-weight: 800;
              color: #0369a1;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .pdf-grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 16px;
            }

            .pdf-field {
              display: flex;
              flex-direction: column;
              gap: 2px;
              background: #f8fafc;
              padding: 8px 12px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }

            .pdf-field-full {
              grid-column: span 2;
            }

            .pdf-label {
              font-size: 8pt;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .pdf-value {
              font-size: 10pt;
              font-weight: 600;
              color: #0f172a;
              word-break: break-word;
            }

            /* Footer & Signatures */
            .pdf-footer {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }

            .pdf-signature-box {
              text-align: center;
              width: 200px;
            }

            .pdf-signature-box p {
              font-size: 9pt;
              color: #64748b;
            }

            .pdf-signature-line {
              margin-top: 60px;
              border-top: 1.5px solid #0f172a;
              font-weight: 700;
              font-size: 10pt;
              padding-top: 4px;
            }

            .pdf-nb-box {
              margin-top: 24px;
              padding: 10px 14px;
              background: #f8fafc;
              border: 1px dashed #cbd5e1;
              border-radius: 6px;
              text-align: center;
              page-break-inside: avoid;
            }

            .pdf-nb-text {
              font-size: 8pt;
              color: #475569;
              font-weight: 600;
              font-style: italic;
            }

            /* Print Hide Controls */
            @media print {
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div className="pdf-container">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getTherapistName = () => {
    if (targetBooking.therapist?.name) return targetBooking.therapist.name;
    if (patient.therapist?.name) return patient.therapist.name;
    if (targetBooking.therapist_id) return `Terapis #${targetBooking.therapist_id}`;
    if (patient.therapist_id) return `Terapis #${patient.therapist_id}`;
    return "Belum Ditugaskan";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-900 border-slate-800">
        {/* Modal Action Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Pratinjau PDF Formulir - {patient.nama_lengkap} ({targetBooking.jenis_terapi || patient.jenis_terapi})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md"
            >
              <Download className="h-4 w-4" />
              Cetak / Simpan PDF
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-white border-slate-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Printable View Window */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-200 dark:bg-slate-950">
          <div
            ref={printRef}
            className="pdf-container bg-white p-8 rounded-lg shadow-xl mx-auto text-slate-900 font-sans max-w-[800px]"
          >
            {/* Header Kop Surat */}
            <div className="pdf-header">
              <div className="pdf-brand">
                <img
                  src="/images/alliakids2.png"
                  alt="Allia Kids Logo"
                  className="pdf-logo"
                />
                <div className="pdf-brand-text">
                  <h1>ALLIA KIDS</h1>
                  <p>Pusat Stimulasi & Terapi Tumbuh Kembang Anak Spesialis</p>
                </div>
              </div>
              <div className="pdf-doc-info">
                <div className="doc-title">Formulir Rekapitulasi Pasien</div>
                <div className="doc-meta">No. Reg: AK-P-{patient.id || "001"}</div>
                <div className="doc-meta">Tanggal: {new Date(targetBooking.created_at || patient.created_at || Date.now()).toLocaleDateString("id-ID")}</div>
              </div>
            </div>

            {/* Section A: Data Diri Pasien & Orang Tua */}
            <div className="pdf-section">
              <div className="pdf-section-header">
                <span>A. IDENTITAS ANAK & ORANG TUA</span>
              </div>
              <div className="pdf-grid-2">
                <div className="pdf-field">
                  <span className="pdf-label">Nama Lengkap Anak</span>
                  <span className="pdf-value">{patient.nama_lengkap}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Usia & Jenis Kelamin</span>
                  <span className="pdf-value">
                    {patient.usia ? `${patient.usia} Tahun` : "-"} • {patient.jenis_kelamin || "-"}
                  </span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Tempat, Tanggal Lahir</span>
                  <span className="pdf-value">
                    {patient.tempat_lahir || "-"}, {patient.tanggal_lahir || "-"}
                  </span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Program Terapi Didaftarkan</span>
                  <span className="pdf-value font-semibold text-blue-800">
                    {(selectedProgram || targetBooking.jenis_terapi || patient.jenis_terapi || "-").toUpperCase()}
                  </span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Nama Orang Tua (Ibu / Ayah)</span>
                  <span className="pdf-value">
                    Ibu: {patient.nama_ibu || "-"} | Ayah: {patient.nama_ayah || "-"}
                  </span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">No. Telepon / WhatsApp</span>
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
                  <span className="pdf-label">Pendidikan Anak saat Ini</span>
                  <span className="pdf-value">{getVal("pendidikan_anak")}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Relasi Sosial dengan Teman / Sebaya</span>
                  <span className="pdf-value">{getVal("relasi_sosial")}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Relasi Hubungan dengan Ibu</span>
                  <span className="pdf-value">{getVal("relasi_dengan_ibu")}</span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Relasi Hubungan dengan Saudara Kandung</span>
                  <span className="pdf-value">{getVal("relasi_dengan_saudara")}</span>
                </div>
              </div>
            </div>

            {/* Section C: Kuesioner Detail Terapi (Apply Form Submission) */}
            <div className="pdf-section">
              <div className="pdf-section-header">
                <span>C. REKAPITULASI KUESIONER PEMERIKSAAN AWAL ({targetBooking.jenis_terapi || patient.jenis_terapi})</span>
              </div>
              <div className="pdf-grid-2">
                <div className="pdf-field">
                  <span className="pdf-label">Program Detail Spesifik</span>
                  <span className="pdf-value">{getVal("program_spesifik", "program", "program_detail", "jenis_terapi")}</span>
                </div>

                <div className="pdf-field">
                  <span className="pdf-label">Keluhan Utama / Permasalahan Anak</span>
                  <span className="pdf-value">{formatBooleanOrText(getVal("masalah_bicara", "keluhan_utama", "keluhan_emosi", "gangguan_utama"))}</span>
                </div>

                <div className="pdf-field">
                  <span className="pdf-label">Penjelasan Singkat Permasalahan Anak</span>
                  <span className="pdf-value">{formatBooleanOrText(getVal("penjelasan_keluhan", "keluhan_lainnya", "detail_keterlambatan", "penjelasan_permasalahan"))}</span>
                </div>

                <div className="pdf-field">
                  <span className="pdf-label">Durasi / Sudah Berapa Lama Keluhan Ini?</span>
                  <span className="pdf-value">{getVal("sudah_berapa_lama_wicara", "sudah_berapa_lama_hipo", "sudah_berapa_lama")}</span>
                </div>

                <div className="pdf-field">
                  <span className="pdf-label">Pengurus Utama Anak Sehari-hari</span>
                  <span className="pdf-value">{formatBooleanOrText(getVal("pengurus_utama", "pengurus_utama_wicara", "pengurus_utama_hipo", "pengurus", "pengasuh_utama", "pengasuh"))}</span>
                </div>

                <div className="pdf-field">
                  <span className="pdf-label">Bahasa Sehari-hari Anak</span>
                  <span className="pdf-value">{getVal("bahasa_sehari_hari_wicara", "bahasa_sehari_hari_hipo", "bahasa_sehari_hari")}</span>
                </div>

                <div className="pdf-field">
                  <span className="pdf-label">Sedang / Pernah Dalam Penanganan Dokter / Psikolog</span>
                  <span className="pdf-value">
                    {formatBooleanOrText(getVal("dalam_penanganan_lain", "dalam_penanganan_dokter", "dalam_penanganan_psikolog"))}
                    {getVal("nama_penanganan_lain", "nama_dokter") !== "-" && ` (${getVal("nama_penanganan_lain", "nama_dokter")})`}
                  </span>
                </div>

                <div className="pdf-field">
                  <span className="pdf-label">Riwayat Masalah Kehamilan & Persalinan</span>
                  <span className="pdf-value">
                    {formatBooleanOrText(getVal("masalah_kehamilan_wicara", "masalah_kehamilan_hipo", "masalah_kehamilan"))}
                    {getVal("detail_masalah_kehamilan_wicara", "detail_masalah_kehamilan_hipo", "detail_masalah_kehamilan") !== "-" && ` - ${getVal("detail_masalah_kehamilan_wicara", "detail_masalah_kehamilan_hipo", "detail_masalah_kehamilan")}`}
                  </span>
                </div>

                <div className="pdf-field">
                  <span className="pdf-label">Riwayat Keterlambatan / Trauma Fisik & Emosional</span>
                  <span className="pdf-value">
                    {formatBooleanOrText(getVal("pernah_trauma_wicara", "pernah_trauma_hipo", "pernah_trauma", "riwayat_keterlambatan"))}
                    {getVal("detail_trauma_wicara", "detail_trauma_hipo", "detail_trauma", "detail_keterlambatan") !== "-" && ` - ${getVal("detail_trauma_wicara", "detail_trauma_hipo", "detail_trauma", "detail_keterlambatan")}`}
                  </span>
                </div>

                <div className="pdf-field">
                  <span className="pdf-label">Ada Ketakutan / Kekhawatiran Selama Terapi</span>
                  <span className="pdf-value">
                    {formatBooleanOrText(getVal("ada_kekhawatiran_terapi", "ada_ketakutan_terapi"))}
                    {getVal("detail_kekhawatiran", "detail_ketakutan") !== "-" && ` - ${getVal("detail_kekhawatiran", "detail_ketakutan")}`}
                  </span>
                </div>

                <div className="pdf-field">
                  <span className="pdf-label">Tempat Favorit Anak</span>
                  <span className="pdf-value">{getVal("tempat_favorit")}</span>
                </div>

                <div className="pdf-field">
                  <span className="pdf-label">Hobi / Kegiatan Favorit Anak</span>
                  <span className="pdf-value">{getVal("hobby", "kegiatan_favorit")}</span>
                </div>

                <div className="pdf-field pdf-field-full">
                  <span className="pdf-label">Harapan Orang Tua Setelah Terapi Dijalankan</span>
                  <span className="pdf-value">{getVal("harapan_terapi_wicara", "harapan_terapi_hipo", "harapan_terapi", "harapan_setelah_terapi")}</span>
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
                    {getTherapistName()}
                  </span>
                </div>
                <div className="pdf-field">
                  <span className="pdf-label">Status Pendaftaran Program</span>
                  <span className="pdf-value font-semibold text-blue-700">
                    {(targetBooking.status || patient.status || "baru").toUpperCase()}
                  </span>
                </div>
                <div className="pdf-field pdf-field-full">
                  <span className="pdf-label">Catatan Internal Tim Klinik / Terapis</span>
                  <span className="pdf-value">{targetBooking.catatan_internal || patient.catatan_internal || "Belum ada catatan internal."}</span>
                </div>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="pdf-footer">
              <div className="pdf-signature-box">
                <p>Orang Tua / Wali Pasien,</p>
                <div className="pdf-signature-line">
                  ( {patient.nama_ibu || patient.nama_ayah || "Orang Tua Pasien"} )
                </div>
              </div>
              <div className="pdf-signature-box">
                <p>Klinik Allia Kids,</p>
                <div className="pdf-signature-line">
                  ( Tim Terapis & Admin )
                </div>
              </div>
            </div>

            {/* NB Agreement Note Box */}
            <div className="pdf-nb-box mt-6 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center">
              <p className="pdf-nb-text text-[10px] italic text-slate-600 font-semibold">
                * NB: Dengan menandatangani formulir ini, Anda menyatakan setuju dengan seluruh Persyaratan & Ketentuan Layanan Klinik Allia Kids.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
