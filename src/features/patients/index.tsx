import React, { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { Search, Eye, Filter, RefreshCw, Download } from "lucide-react";
import { PatientPdfBuilder } from "./components/patient-pdf-builder";
import { PatientDetailModal } from "./components/patient-detail-modal";
import { SimplePagination } from "@/components/simple-pagination";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface TherapistItem {
  id: number;
  name: string;
  specialization?: string;
  phone?: string;
  is_active?: boolean;
}

export interface Patient {
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
  status: "baru" | "terjadwal" | "aktif" | "selesai" | "dibatalkan";
  therapist?: any;
  therapist_id?: number | null;
  catatan_internal?: string;
  created_at?: string;
  formulir_wicara?: Record<string, any>;
  formulir_hipoterapi?: Record<string, any>;
  bookings?: any[];
  [key: string]: any;
}

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<TherapistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTerapi, setFilterTerapi] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal & Patient Detail state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfPatient, setPdfPatient] = useState<Patient | null>(null);
  const [selectedPdfProgram, setSelectedPdfProgram] = useState<string | undefined>(undefined);
  
  const [patientLogs, setPatientLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchTherapists = async () => {
    try {
      const data = await api.get<TherapistItem[]>("/therapists");
      if (data && Array.isArray(data)) {
        setTherapists(data);
      } else {
        setTherapists([]);
      }
    } catch (err) {
      console.warn("Error fetching therapists list", err);
      setTherapists([]);
    }
  };

  const fetchPatients = async () => {
    setLoading(true);
    try {
      let data: Patient[] = [];
      try {
        data = await api.get<Patient[]>("/admin/patients");
      } catch {
        data = await api.get<Patient[]>("/patients");
      }

      const localApplies = JSON.parse(localStorage.getItem("pending_applies") || "[]");
      
      const formattedLocal: Patient[] = localApplies.map((app: any) => ({
        id: `local-${app.id}`,
        nama_lengkap: app.nama_lengkap,
        usia: app.usia,
        jenis_kelamin: app.jenis_kelamin,
        tempat_lahir: app.tempat_lahir,
        tanggal_lahir: app.tanggal_lahir,
        email_ortu: app.email_ortu,
        no_telepon: app.no_telepon,
        nama_ayah: app.nama_ayah,
        nama_ibu: app.nama_ibu,
        alamat: app.alamat,
        jenis_terapi: app.jenis_terapi,
        pendidikan_anak: app.pendidikan_anak,
        relasi_sosial: app.relasi_sosial,
        relasi_dengan_ibu: app.relasi_dengan_ibu,
        relasi_dengan_saudara: app.relasi_dengan_saudara,
        status: "baru",
        created_at: new Date().toISOString(),
        formulir_wicara: app.jenis_terapi?.toLowerCase().includes("wicara") ? {
          program_spesifik: app.program || app.program_detail,
          masalah_bicara: app.masalah_bicara,
          sudah_berapa_lama: app.sudah_berapa_lama_wicara,
          dalam_penanganan_lain: app.dalam_penanganan_lain,
          nama_penanganan_lain: app.nama_penanganan_lain,
          bahasa_sehari_hari: app.bahasa_sehari_hari_wicara,
          gangguan_utama: app.gangguan_utama,
          keluhan_lainnya: app.keluhan_lainnya,
          pengurus_utama: app.pengurus_utama_wicara,
          masalah_kehamilan: app.masalah_kehamilan_wicara,
          detail_masalah_kehamilan: app.detail_masalah_kehamilan_wicara,
          riwayat_keterlambatan: app.riwayat_keterlambatan,
          detail_keterlambatan: app.detail_keterlambatan,
          harapan_terapi: app.harapan_terapi_wicara,
          pernah_trauma: app.pernah_trauma_wicara,
          detail_trauma: app.detail_trauma_wicara,
          pernah_terapi_sebelumnya: app.pernah_terapi_sebelumnya,
          ada_kekhawatiran_terapi: app.ada_kekhawatiran_terapi,
          detail_kekhawatiran: app.detail_kekhawatiran,
        } : undefined,
        formulir_hipoterapi: !app.jenis_terapi?.toLowerCase().includes("wicara") ? {
          program_spesifik: app.program || app.program_detail,
          keluhan_utama: app.keluhan_utama,
          penjelasan_keluhan: app.penjelasan_keluhan,
          sudah_berapa_lama: app.sudah_berapa_lama_hipo,
          dalam_penanganan_dokter: app.dalam_penanganan_dokter,
          nama_dokter: app.nama_dokter,
          pengurus_utama: app.pengurus_utama_hipo,
          bahasa_sehari_hari: app.bahasa_sehari_hari_hipo,
          masalah_kehamilan: app.masalah_kehamilan_hipo,
          detail_masalah_kehamilan: app.detail_masalah_kehamilan_hipo,
          pernah_trauma: app.pernah_trauma_hipo,
          detail_trauma: app.detail_trauma_hipo,
          harapan_terapi: app.harapan_terapi_hipo,
          tempat_favorit: app.tempat_favorit,
          hobby: app.hobby,
          pernah_hipnoterapi: app.pernah_hipnoterapi,
          ada_ketakutan_terapi: app.ada_ketakutan_terapi,
          detail_ketakutan: app.detail_ketakutan,
        } : undefined,
      }));

      if (data && Array.isArray(data)) {
        setPatients([...data, ...formattedLocal]);
      } else {
        setPatients(formattedLocal);
      }
    } catch (err) {
      console.warn("Error fetching patients list from backend API", err);
      const localApplies = JSON.parse(localStorage.getItem("pending_applies") || "[]");
      const formattedLocal: Patient[] = localApplies.map((app: any) => ({
        id: `local-${app.id}`,
        nama_lengkap: app.nama_lengkap,
        usia: app.usia,
        jenis_kelamin: app.jenis_kelamin,
        tempat_lahir: app.tempat_lahir,
        tanggal_lahir: app.tanggal_lahir,
        email_ortu: app.email_ortu,
        no_telepon: app.no_telepon,
        nama_ayah: app.nama_ayah,
        nama_ibu: app.nama_ibu,
        alamat: app.alamat,
        jenis_terapi: app.jenis_terapi,
        status: "baru",
      }));
      setPatients(formattedLocal);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTherapists();
    fetchPatients();
  }, []);

  // Consolidate patients by normalized name & phone number so 1 row per unique patient is shown
  const consolidatedPatients = useMemo(() => {
    const map = new Map<string, Patient & { bookings: any[] }>();

    patients.forEach((p) => {
      const normName = (p.nama_lengkap || "").toLowerCase().trim();
      const normPhone = (p.no_telepon || p.email_ortu || "").trim();
      const key = `${normName}_${normPhone}`;

      if (!map.has(key)) {
        map.set(key, {
          ...p,
          bookings: [p],
        });
      } else {
        const existing = map.get(key)!;
        existing.bookings.push(p);
        if (!existing.email_ortu && p.email_ortu) existing.email_ortu = p.email_ortu;
        if (!existing.no_telepon && p.no_telepon) existing.no_telepon = p.no_telepon;
        if (!existing.therapist && p.therapist) existing.therapist = p.therapist;
        if (p.status === "aktif" || p.status === "terjadwal") existing.status = p.status;
      }
    });

    return Array.from(map.values());
  }, [patients]);

  const fetchLogsForPatient = async (patientId: string | number) => {
    setLoadingLogs(true);
    try {
      let data;
      try {
        data = await api.get<any[]>(`/admin/therapy-progress/patient/${patientId}`);
      } catch {
        data = await api.get<any[]>(`/therapy-progress/patient/${patientId}`);
      }
      if (Array.isArray(data)) {
        setPatientLogs(data);
      } else {
        setPatientLogs([]);
      }
    } catch {
      setPatientLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenDetailModal = (p: Patient) => {
    setSelectedPatient(p);
    setIsDetailModalOpen(true);
    fetchLogsForPatient(p.id);
  };

  const handleUpdateStatus = async (id: string | number, newStatus: Patient["status"]) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    if (selectedPatient) {
      setSelectedPatient((prev) => {
        if (!prev) return null;
        const updatedBookings = (prev.bookings || [prev]).map((b) =>
          b.id === id ? { ...b, status: newStatus } : b
        );
        return {
          ...prev,
          status: prev.id === id ? newStatus : prev.status,
          bookings: updatedBookings,
        };
      });
    }
    if (typeof id === "number" || (!String(id).startsWith("demo") && !String(id).startsWith("local"))) {
      try {
        await api.patch(`/admin/patients/${id}`, { status: newStatus });
      } catch {
        try {
          await api.patch(`/patients/${id}`, { status: newStatus });
        } catch (err) {
          console.error("Failed to update status on server", err);
        }
      }
    }
  };

  const handleAssignTherapist = async (id: string | number, therapistIdStr: string) => {
    const therapistId = therapistIdStr ? Number(therapistIdStr) : null;
    const selectedObj = therapists.find((t) => t.id === therapistId);

    const currentPatient = patients.find((p) => p.id === id);
    const shouldUpdateStatusToAktif = therapistId !== null && currentPatient?.status === "baru";

    setPatients((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              therapist_id: therapistId,
              therapist: selectedObj || therapistIdStr,
              ...(shouldUpdateStatusToAktif ? { status: "aktif" as const } : {}),
            }
          : p
      )
    );

    if (selectedPatient) {
      setSelectedPatient((prev) => {
        if (!prev) return null;
        const updatedBookings = (prev.bookings || [prev]).map((b) =>
          b.id === id
            ? {
                ...b,
                therapist_id: therapistId,
                therapist: selectedObj || therapistIdStr,
                ...(shouldUpdateStatusToAktif ? { status: "aktif" as const } : {}),
              }
            : b
        );
        return {
          ...prev,
          therapist_id: prev.id === id ? therapistId : prev.therapist_id,
          therapist: prev.id === id ? (selectedObj || therapistIdStr) : prev.therapist,
          status: prev.id === id && shouldUpdateStatusToAktif ? "aktif" : prev.status,
          bookings: updatedBookings,
        };
      });
    }

    if (typeof id === "number" || (!String(id).startsWith("demo") && !String(id).startsWith("local"))) {
      const payload: any = { therapist_id: therapistId };
      if (shouldUpdateStatusToAktif) {
        payload.status = "aktif";
      }
      try {
        await api.patch(`/admin/patients/${id}`, payload);
      } catch {
        try {
          await api.patch(`/patients/${id}`, payload);
        } catch (err) {
          console.error("Failed to assign therapist on server", err);
        }
      }
    }
  };

  const handleUpdateNotes = async (id: string | number, catatan_internal: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, catatan_internal } : p))
    );
    if (selectedPatient) {
      setSelectedPatient((prev) => {
        if (!prev) return null;
        const updatedBookings = (prev.bookings || [prev]).map((b) =>
          b.id === id ? { ...b, catatan_internal } : b
        );
        return {
          ...prev,
          catatan_internal: prev.id === id ? catatan_internal : prev.catatan_internal,
          bookings: updatedBookings,
        };
      });
    }
    if (typeof id === "number" || (!String(id).startsWith("demo") && !String(id).startsWith("local"))) {
      try {
        await api.patch(`/admin/patients/${id}`, { catatan_internal });
      } catch {
        try {
          await api.patch(`/patients/${id}`, { catatan_internal });
        } catch (err) {
          console.error("Failed to update notes on server", err);
        }
      }
    }
  };

  const handleSaveLogForModal = async (formData: any) => {
    if (!selectedPatient) return;
    const payload = {
      ...formData,
      patient_id: Number(selectedPatient.id),
    };
    try {
      await api.post("/admin/therapy-progress", payload);
    } catch {
      await api.post("/therapy-progress", payload);
    }
    fetchLogsForPatient(selectedPatient.id);
  };

  const handleUpdateLogForModal = async (logId: number, formData: any) => {
    try {
      try {
        await api.patch(`/admin/therapy-progress/${logId}`, formData);
      } catch {
        await api.patch(`/therapy-progress/${logId}`, formData);
      }
      if (selectedPatient) fetchLogsForPatient(selectedPatient.id);
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui log perkembangan");
      throw err;
    }
  };

  const handleDeleteLogForModal = async (logId: number) => {
    try {
      try {
        await api.delete(`/admin/therapy-progress/${logId}`);
      } catch {
        await api.delete(`/therapy-progress/${logId}`);
      }
      if (selectedPatient) fetchLogsForPatient(selectedPatient.id);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus log perkembangan");
      throw err;
    }
  };

  const handleOpenPdfFromModal = (p: Patient, selectedProgram?: string) => {
    setPdfPatient(p);
    setSelectedPdfProgram(selectedProgram);
    setIsPdfModalOpen(true);
  };

  const filteredPatients = consolidatedPatients.filter((p) => {
    const matchesSearch =
      (p.nama_lengkap || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.nama_ibu || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.no_telepon || "").includes(searchQuery);
    const matchesTerapi = filterTerapi
      ? (p.bookings || []).some((b: any) => (b.jenis_terapi || "").toLowerCase().includes(filterTerapi.toLowerCase()))
      : true;
    const matchesStatus = filterStatus ? p.status === filterStatus : true;
    return matchesSearch && matchesTerapi && matchesStatus;
  });

  const getStatusBadge = (status: Patient["status"]) => {
    const styles = {
      baru: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200",
      terjadwal: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-200",
      aktif: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200",
      selesai: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200",
      dibatalkan: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200",
    };
    return styles[status] || "bg-slate-100 text-slate-800";
  };

  const getProgramTerapiLabel = (jenis?: string) => {
    if (!jenis) return "Program Terapi";
    const lower = jenis.toLowerCase();
    if (lower.includes("wicara")) return "Terapi Wicara";
    if (lower.includes("hipo")) return "Hipoterapi & Sensori";
    if (lower.includes("konsultasi")) return "Konsultasi Tumbuh Kembang";
    if (lower.includes("skrining")) return "Skrining Tumbuh Kembang";
    if (lower.includes("bakat") || lower.includes("sidik")) return "Analisa Sidik Jari Bakat";
    return jenis;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header fixed>
        <div className="flex items-center gap-2 border border-input bg-background rounded-md px-3 py-1.5 w-64 max-w-sm text-sm">
          <Search size={16} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari pasien / orang tua..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full"
          />
        </div>
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className="flex flex-1 flex-col gap-4 sm:gap-6 pt-20 pb-12">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pendaftaran & Data Pasien</h2>
            <p className="text-muted-foreground text-sm">
              Kelola data lengkap pendaftaran pasien, inspeksi program yang diambil, dan atur penugasan terapis.
            </p>
          </div>
          <button
            onClick={() => { fetchTherapists(); fetchPatients(); }}
            className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-bold px-3 py-2 rounded-md transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
          </button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter:</span>
          </div>

          <select
            value={filterTerapi}
            onChange={(e) => setFilterTerapi(e.target.value)}
            className="bg-background border border-input rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">Semua Program Terapi</option>
            <option value="wicara">Terapi Wicara</option>
            <option value="hipo">Hipoterapi & Sensori</option>
            <option value="konsultasi">Konsultasi Tumbuh Kembang</option>
            <option value="bakat">Analisa Sidik Jari Bakat</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-background border border-input rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">Semua Status</option>
            <option value="baru">Baru</option>
            <option value="terjadwal">Terjadwal</option>
            <option value="aktif">Aktif</option>
            <option value="selesai">Selesai</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
        </div>

        {/* Patients Main Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-xs font-bold text-muted-foreground uppercase">
                  <th className="p-4">Anak</th>
                  <th className="p-4">Orang Tua & Kontak</th>
                  <th className="p-4">Program Didaftarkan</th>
                  <th className="p-4">Status Pasien</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground font-semibold">
                      Tidak ada data pendaftaran pasien ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredPatients
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((p) => {
                    const bookings = p.bookings || [p];
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-extrabold text-foreground text-sm">{p.nama_lengkap}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {p.usia ? `${p.usia} Thn` : ''} {p.jenis_kelamin ? `• ${p.jenis_kelamin}` : ''}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-semibold text-foreground">{p.nama_ibu || p.nama_ayah || "-"}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{p.no_telepon || "-"}</div>
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            {bookings.map((b: any, bIdx: number) => (
                              <span
                                key={b.id || bIdx}
                                className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs"
                              >
                                {getProgramTerapiLabel(b.jenis_terapi)}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${getStatusBadge(p.status)}`}>
                            {p.status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(p)}
                              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                            >
                              <Eye size={13} /> Detail Pasien
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <SimplePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredPatients.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Main>

      {/* Patient Multi-Tab Detail Modal */}
      <PatientDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        patient={selectedPatient}
        therapists={therapists}
        patientLogs={patientLogs}
        loadingLogs={loadingLogs}
        onUpdateStatus={handleUpdateStatus}
        onAssignTherapist={handleAssignTherapist}
        onUpdateNotes={handleUpdateNotes}
        onSaveLog={handleSaveLogForModal}
        onUpdateLog={handleUpdateLogForModal}
        onDeleteLog={handleDeleteLogForModal}
        onOpenPdf={handleOpenPdfFromModal}
      />

      {/* Patient PDF Builder Modal */}
      <PatientPdfBuilder
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        patient={pdfPatient}
        selectedProgram={selectedPdfProgram}
      />
    </div>
  );
}
