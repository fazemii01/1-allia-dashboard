import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { Search, Eye, Filter, AlertCircle, MessageSquare, RefreshCw, X, FileText, User, HeartHandshake } from "lucide-react";
import { api } from "@/lib/api";

interface TherapistItem {
  id: number;
  name: string;
  specialization?: string;
  phone?: string;
  is_active?: boolean;
}

interface Patient {
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
  
  // Extended questionnaire objects / top-level props
  formulir_wicara?: Record<string, any>;
  formulir_hipoterapi?: Record<string, any>;

  // Legacy / top-level fallback fields
  masalah_bicara?: string;
  sudah_berapa_lama_wicara?: string;
  dalam_penanganan_lain?: any;
  nama_penanganan_lain?: string;
  bahasa_sehari_hari_wicara?: string;
  gangguan_utama?: string[];
  keluhan_lainnya?: string;
  pengurus_utama_wicara?: string[];
  masalah_kehamilan_wicara?: any;
  detail_masalah_kehamilan_wicara?: string;
  riwayat_keterlambatan?: any;
  detail_keterlambatan?: string;
  harapan_terapi_wicara?: string;
  pernah_trauma_wicara?: any;
  detail_trauma_wicara?: string;
  pernah_terapi_sebelumnya?: any;
  ada_kekhawatiran_terapi?: any;
  detail_kekhawatiran?: string;

  keluhan_utama?: string[];
  penjelasan_keluhan?: string;
  sudah_berapa_lama_hipo?: string;
  dalam_penanganan_dokter?: any;
  nama_dokter?: string;
  pengurus_utama_hipo?: string[];
  bahasa_sehari_hari_hipo?: string;
  masalah_kehamilan_hipo?: any;
  detail_masalah_kehamilan_hipo?: string;
  pernah_trauma_hipo?: any;
  detail_trauma_hipo?: string;
  harapan_terapi_hipo?: string;
  tempat_favorit?: string[];
  hobby?: string[];
  pernah_hipnoterapi?: any;
  ada_ketakutan_terapi?: any;
  detail_ketakutan?: string;
}

const mockPatients: Patient[] = [
  {
    id: "demo-1",
    nama_lengkap: "Arfan Wijaya",
    usia: 3,
    jenis_kelamin: "laki-laki",
    tempat_lahir: "Lumajang",
    tanggal_lahir: "2023-04-12",
    email_ortu: "arfan.parent@gmail.com",
    no_telepon: "081915237935",
    nama_ayah: "Budi Wijaya",
    nama_ibu: "Siti Aminah",
    alamat: "Jl. Diponegoro No. 45, Lumajang",
    jenis_terapi: "terapi_wicara",
    pendidikan_anak: "PAUD",
    relasi_sosial: "lumayan",
    relasi_dengan_ibu: "baik",
    relasi_dengan_saudara: "baik",
    status: "baru",
    formulir_wicara: {
      masalah_bicara: "Belum lancar mengucapkan kata berdua, kosakata kurang dari 10 kata",
      sudah_berapa_lama: "6 bulan",
      bahasa_sehari_hari: "Bahasa Indonesia",
      gangguan_utama: ["Kosa kata terbatas", "Artikulasi tidak jelas"],
      pengurus_utama: ["Ibu", "Nenek"],
      harapan_terapi: "Semoga bisa lancar berbicara dan siap masuk sekolah TK",
      riwayat_keterlambatan: true,
      detail_keterlambatan: "Mulai merangkai 1 kata pada usia 2 tahun 6 bulan",
      pernah_trauma: false,
    }
  },
  {
    id: "demo-2",
    nama_lengkap: "Rania Amanda",
    usia: 5,
    jenis_kelamin: "perempuan",
    tempat_lahir: "Surabaya",
    tanggal_lahir: "2021-08-19",
    email_ortu: "rania.moms@gmail.com",
    no_telepon: "082244866770",
    nama_ayah: "Adi Saputra",
    nama_ibu: "Rina Amalia",
    alamat: "Perum Gading Fajar Blok C-10, Sidoarjo",
    jenis_terapi: "hipoterapi",
    pendidikan_anak: "TK",
    relasi_sosial: "buruk",
    relasi_dengan_ibu: "lumayan",
    relasi_dengan_saudara: "buruk",
    status: "aktif",
    therapist: { id: 1, name: "Faza S.Psi" },
    formulir_hipoterapi: {
      keluhan_utama: ["Marah", "Tidak Bisa Fokus", "Takut Nasi"],
      penjelasan_keluhan: "Anak gampang tantrum hebat kalau keinginannya tidak dituruti, fobia nasi putih",
      sudah_berapa_lama: "3 bulan",
      bahasa_sehari_hari: "Bahasa Indonesia",
      pengurus_utama: ["Ibu"],
      harapan_terapi: "Emosi anak lebih stabil, berani makan nasi dan patuh arahan orang tua",
      tempat_favorit: ["Taman", "Rumah"],
      hobby: ["Menggambar", "Bermain HP/Gadget"],
      pernah_trauma: true,
      detail_trauma: "Pernah tersedak makanan padat saat usia 2 tahun",
    }
  }
];

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<TherapistItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTerapi, setFilterTerapi] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [patientLogs, setPatientLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [logForm, setLogForm] = useState({
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
      sosialisasi: 80,
    },
    catatan_terapis: "",
    rekomendasi_ortu: "",
    status_pencapaian: "sesuai_target",
  });

  const fetchPatientLogs = async (patientId: string | number) => {
    setLoadingLogs(true);
    try {
      if (typeof patientId === "number" || (!String(patientId).startsWith("demo") && !String(patientId).startsWith("local"))) {
        const logs = await api.get<any[]>(`/admin/therapy-progress/patient/${patientId}`);
        setPatientLogs(logs || []);
        if (logs && logs.length > 0) {
          const maxSesi = Math.max(...logs.map((l: any) => l.session_number || 0));
          setLogForm((f) => ({ ...f, session_number: maxSesi + 1 }));
        }
      } else {
        const localKey = `progress_logs_${patientId}`;
        const localLogs = JSON.parse(localStorage.getItem(localKey) || "[]");
        setPatientLogs(localLogs);
        if (localLogs.length > 0) {
          const maxSesi = Math.max(...localLogs.map((l: any) => l.session_number || 0));
          setLogForm((f) => ({ ...f, session_number: maxSesi + 1 }));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch therapy progress logs", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSaveLog = async () => {
    if (!selectedPatient) return;
    setSavingLog(true);
    try {
      const payload = {
        patient_id: typeof selectedPatient.id === "number" ? selectedPatient.id : 1,
        therapist_id: selectedPatient.therapist_id || undefined,
        program_name: selectedPatient.jenis_terapi || "Program Terapi Wicara & Perilaku",
        ...logForm,
      };

      if (typeof selectedPatient.id === "number" || (!String(selectedPatient.id).startsWith("demo") && !String(selectedPatient.id).startsWith("local"))) {
        await api.post("/admin/therapy-progress", payload);
      } else {
        const localKey = `progress_logs_${selectedPatient.id}`;
        const localLogs = JSON.parse(localStorage.getItem(localKey) || "[]");
        localLogs.push({ ...payload, id: Date.now(), created_at: new Date().toISOString() });
        localStorage.setItem(localKey, JSON.stringify(localLogs));
      }
      alert("Log perkembangan sesi berhasil disimpan!");
      fetchPatientLogs(selectedPatient.id);
    } catch (err: any) {
      console.error(err);
      alert("Gagal menyimpan progress: " + (err.message || err));
    } finally {
      setSavingLog(false);
    }
  };

  const fetchTherapists = async () => {
    try {
      const data = await api.get<TherapistItem[]>("/therapists");
      if (data && Array.isArray(data) && data.length > 0) {
        setTherapists(data);
      } else {
        setTherapists([
          { id: 1, name: "Faza S.Psi", specialization: "Terapi Perilaku" },
          { id: 2, name: "Amanda S.Psi", specialization: "Terapi Wicara" },
          { id: 3, name: "Terapis Hendri", specialization: "Hipoterapi" },
        ]);
      }
    } catch (err) {
      console.warn("Using fallback therapists list", err);
      setTherapists([
        { id: 1, name: "Faza S.Psi", specialization: "Terapi Perilaku" },
        { id: 2, name: "Amanda S.Psi", specialization: "Terapi Wicara" },
        { id: 3, name: "Terapis Hendri", specialization: "Hipoterapi" },
      ]);
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
        formulir_wicara: app.jenis_terapi?.toLowerCase().includes("wicara") ? {
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
        pendidikan_anak: app.pendidikan_anak,
        relasi_sosial: app.relasi_sosial,
        relasi_dengan_ibu: app.relasi_dengan_ibu,
        relasi_dengan_saudara: app.relasi_dengan_saudara,
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

  const handleUpdateStatus = async (id: string | number, newStatus: Patient["status"]) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    if (selectedPatient && selectedPatient.id === id) {
      setSelectedPatient((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    if (typeof id === "number" || (!String(id).startsWith("demo") && !String(id).startsWith("local"))) {
      try {
        await api.patch(`/patients/${id}`, { status: newStatus });
      } catch (err) {
        console.error("Failed to update status on server", err);
      }
    }
  };

  const handleAssignTherapist = async (id: string | number, therapistIdStr: string) => {
    const therapistId = therapistIdStr ? Number(therapistIdStr) : null;
    const selectedObj = therapists.find((t) => t.id === therapistId);

    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, therapist_id: therapistId, therapist: selectedObj || therapistIdStr } : p))
    );

    if (selectedPatient && selectedPatient.id === id) {
      setSelectedPatient((prev) => (prev ? { ...prev, therapist_id: therapistId, therapist: selectedObj || therapistIdStr } : null));
    }

    if (typeof id === "number" || (!String(id).startsWith("demo") && !String(id).startsWith("local"))) {
      try {
        await api.patch(`/patients/${id}`, { therapist_id: therapistId });
      } catch (err) {
        console.error("Failed to assign therapist on server", err);
      }
    }
  };

  const handleUpdateNotes = async (id: string | number, catatan_internal: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, catatan_internal } : p))
    );
    if (typeof id === "number" || (!String(id).startsWith("demo") && !String(id).startsWith("local"))) {
      try {
        await api.patch(`/patients/${id}`, { catatan_internal });
      } catch (err) {
        console.error("Failed to update notes on server", err);
      }
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      (p.nama_lengkap || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.nama_ibu || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.no_telepon || "").includes(searchQuery);
    const matchesTerapi = filterTerapi ? (p.jenis_terapi || "").includes(filterTerapi) : true;
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
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const formatBoolean = (val: any) => {
    if (val === true || val === "1" || val === 1 || val === "true") return "Ya";
    if (val === false || val === "0" || val === 0 || val === "false") return "Tidak";
    return val || "-";
  };

  const renderChips = (items?: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) return <span className="text-muted-foreground">-</span>;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((item, i) => (
          <span key={i} className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[11px] font-bold">
            {item}
          </span>
        ))}
      </div>
    );
  };

  const getCurrentTherapistValue = (patient: Patient) => {
    if (patient.therapist_id) return String(patient.therapist_id);
    if (typeof patient.therapist === 'object' && patient.therapist?.id) return String(patient.therapist.id);
    if (typeof patient.therapist === 'string') {
      const match = therapists.find((t) => t.name === patient.therapist);
      if (match) return String(match.id);
    }
    return "";
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
              Kelola data lengkap formulir apply, ubah status, dan jadwalkan terapis.
            </p>
          </div>
          <button
            onClick={() => { fetchTherapists(); fetchPatients(); }}
            className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-bold px-3 py-2 rounded-md transition-all cursor-pointer"
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
            <option value="wicara">🗣️ Terapi Wicara</option>
            <option value="hipo">🧠 Hipoterapi</option>
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

        {/* Patients Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Patients Table Column */}
          <div className={`${selectedPatient ? "lg:col-span-6" : "lg:col-span-12"} transition-all duration-300`}>
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border text-xs font-bold text-muted-foreground uppercase">
                      <th className="p-3.5">Anak</th>
                      <th className="p-3.5">Orang Tua</th>
                      <th className="p-3.5">Program Terapi</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground font-semibold">
                          Tidak ada data pendaftaran ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.map((p) => {
                        const isWicara = (p.jenis_terapi || "").toLowerCase().includes("wicara");
                        const isSelected = selectedPatient?.id === p.id;
                        return (
                          <tr key={p.id} className={`hover:bg-muted/40 transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                            <td className="p-3.5">
                              <div className="font-bold text-foreground">{p.nama_lengkap}</div>
                              <div className="text-xs text-muted-foreground">
                                {p.usia ? `${p.usia} Thn` : ''} {p.jenis_kelamin ? `• ${p.jenis_kelamin}` : ''}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-foreground">{p.nama_ibu || p.nama_ayah || "-"}</div>
                              <div className="text-xs text-muted-foreground">{p.no_telepon || "-"}</div>
                            </td>
                            <td className="p-3.5 font-semibold text-foreground text-xs">
                              {isWicara ? "🗣️ Terapi Wicara" : "🧠 Hipoterapi"}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${getStatusBadge(p.status)}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => setSelectedPatient(p)}
                                className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md cursor-pointer transition-all shadow-sm ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                                }`}
                              >
                                <Eye size={13} /> {isSelected ? "Melihat" : "Detail"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Full Detail & Form Inspector Column */}
          {selectedPatient && (
            <div className="lg:col-span-6 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col gap-6 max-h-[85vh] overflow-y-auto relative">
              <div className="flex justify-between items-start border-b border-border -mt-6 -mx-6 p-6 mb-2 sticky top-0 bg-card z-20 rounded-t-xl shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-xl text-foreground">{selectedPatient.nama_lengkap}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${getStatusBadge(selectedPatient.status)}`}>
                      {selectedPatient.status}
                    </span>
                  </div>
                  <p className="text-xs text-primary font-bold uppercase tracking-wider mt-1">
                    {(selectedPatient.jenis_terapi || "").toLowerCase().includes("wicara") ? "🗣️ Terapi Wicara" : "🧠 Hipoterapi"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      fetchPatientLogs(selectedPatient.id);
                      setProgressModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground hover:brightness-110 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition-all cursor-pointer"
                  >
                    📊 Progress & Milestone Sesi
                  </button>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Status & Dynamic Therapist Admin Assignment Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Assign Terapis (dari Database)</label>
                  <select
                    value={getCurrentTherapistValue(selectedPatient)}
                    onChange={(e) => handleAssignTherapist(selectedPatient.id, e.target.value)}
                    className="bg-background border border-input rounded-md px-3 py-1.5 text-xs font-semibold w-full"
                  >
                    <option value="">— Belum Ditugaskan —</option>
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.specialization ? `(${t.specialization})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Ubah Status</label>
                  <div className="flex flex-wrap gap-1">
                    {(["baru", "terjadwal", "aktif", "selesai", "dibatalkan"] as Patient["status"][]).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(selectedPatient.id, st)}
                        className={`px-2 py-1 text-[10px] font-bold uppercase rounded border transition-all ${
                          selectedPatient.status === st
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-background border-input text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 1: Identitas & Kontak */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
                  <User size={14} /> 1. Identitas Anak & Orang Tua
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Usia</span>
                    <span className="font-bold text-foreground">{selectedPatient.usia || "-"} Tahun</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Jenis Kelamin</span>
                    <span className="font-bold text-foreground capitalize">{selectedPatient.jenis_kelamin || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Tempat, Tgl Lahir</span>
                    <span className="font-bold text-foreground">{selectedPatient.tempat_lahir || "-"}, {selectedPatient.tanggal_lahir || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Nama Ayah</span>
                    <span className="font-bold text-foreground">{selectedPatient.nama_ayah || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Nama Ibu</span>
                    <span className="font-bold text-foreground">{selectedPatient.nama_ibu || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Email Ortu</span>
                    <span className="font-bold text-foreground truncate block">{selectedPatient.email_ortu || "-"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">No. WhatsApp</span>
                    <span className="font-bold text-foreground flex items-center gap-2">
                      {selectedPatient.no_telepon || "-"}
                      {selectedPatient.no_telepon && (
                        <a
                          href={`https://wa.me/${selectedPatient.no_telepon.replace(/^0/, "62")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200 hover:bg-green-100"
                        >
                          <MessageSquare size={11} /> Chat WhatsApp
                        </a>
                      )}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Alamat Lengkap</span>
                    <span className="font-bold text-foreground leading-relaxed block mt-0.5">{selectedPatient.alamat || "-"}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Evaluasi Keadaan & Relasi */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
                  <HeartHandshake size={14} /> 2. Evaluasi Keadaan & Relasi Anak
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Pendidikan Anak</span>
                    <span className="font-bold text-foreground">{selectedPatient.pendidikan_anak || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Relasi Sosial</span>
                    <span className="font-bold text-foreground capitalize">{selectedPatient.relasi_sosial || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Relasi dg Ibu</span>
                    <span className="font-bold text-foreground capitalize">{selectedPatient.relasi_dengan_ibu || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Relasi dg Saudara</span>
                    <span className="font-bold text-foreground capitalize">{selectedPatient.relasi_dengan_saudara || "-"}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Detail Formulir Terapi */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
                  <FileText size={14} /> 3. Detail Formulir Apply Program Terapi
                </h4>

                {/* Render Wicara Form Data */}
                {((selectedPatient.jenis_terapi || "").toLowerCase().includes("wicara") || selectedPatient.formulir_wicara) && (
                  <div className="flex flex-col gap-3 text-xs bg-muted/20 p-4 rounded-xl border border-border">
                    <div className="font-bold text-xs text-primary">Detail Formulir Terapi Wicara</div>

                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Masalah Bicara / Komunikasi Utama</span>
                      <p className="font-bold text-foreground italic mt-0.5">
                        {selectedPatient.formulir_wicara?.masalah_bicara || selectedPatient.masalah_bicara || "-"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Durasi Keluhan</span>
                        <span className="font-bold text-foreground">
                          {selectedPatient.formulir_wicara?.sudah_berapa_lama || selectedPatient.sudah_berapa_lama_wicara || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Bahasa Sehari-hari</span>
                        <span className="font-bold text-foreground">
                          {selectedPatient.formulir_wicara?.bahasa_sehari_hari || selectedPatient.bahasa_sehari_hari_wicara || "-"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Gangguan / Gejala Utama</span>
                      {renderChips(selectedPatient.formulir_wicara?.gangguan_utama || selectedPatient.gangguan_utama)}
                    </div>

                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Pengurus Utama Anak</span>
                      {renderChips(selectedPatient.formulir_wicara?.pengurus_utama || selectedPatient.pengurus_utama_wicara)}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Penanganan Dokter/Terapis Lain?</span>
                        <span className="font-bold text-foreground">
                          {formatBoolean(selectedPatient.formulir_wicara?.dalam_penanganan_lain ?? selectedPatient.dalam_penanganan_lain)}
                        </span>
                        {(selectedPatient.formulir_wicara?.nama_penanganan_lain || selectedPatient.nama_penanganan_lain) && (
                          <div className="text-[11px] text-muted-foreground">({selectedPatient.formulir_wicara?.nama_penanganan_lain || selectedPatient.nama_penanganan_lain})</div>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Masalah Kehamilan / Persalinan?</span>
                        <span className="font-bold text-foreground">
                          {formatBoolean(selectedPatient.formulir_wicara?.masalah_kehamilan ?? selectedPatient.masalah_kehamilan_wicara)}
                        </span>
                        {(selectedPatient.formulir_wicara?.detail_masalah_kehamilan || selectedPatient.detail_masalah_kehamilan_wicara) && (
                          <div className="text-[11px] text-muted-foreground">({selectedPatient.formulir_wicara?.detail_masalah_kehamilan || selectedPatient.detail_masalah_kehamilan_wicara})</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Riwayat Keterlambatan Bicara?</span>
                        <span className="font-bold text-foreground">
                          {formatBoolean(selectedPatient.formulir_wicara?.riwayat_keterlambatan ?? selectedPatient.riwayat_keterlambatan)}
                        </span>
                        {(selectedPatient.formulir_wicara?.detail_keterlambatan || selectedPatient.detail_keterlambatan) && (
                          <div className="text-[11px] text-muted-foreground">({selectedPatient.formulir_wicara?.detail_keterlambatan || selectedPatient.detail_keterlambatan})</div>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Pernah Mengalami Trauma?</span>
                        <span className="font-bold text-foreground">
                          {formatBoolean(selectedPatient.formulir_wicara?.pernah_trauma ?? selectedPatient.pernah_trauma_wicara)}
                        </span>
                        {(selectedPatient.formulir_wicara?.detail_trauma || selectedPatient.detail_trauma_wicara) && (
                          <div className="text-[11px] text-muted-foreground">({selectedPatient.formulir_wicara?.detail_trauma || selectedPatient.detail_trauma_wicara})</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Harapan Setelah Terapi</span>
                      <p className="font-bold text-foreground mt-0.5">
                        {selectedPatient.formulir_wicara?.harapan_terapi || selectedPatient.harapan_terapi_wicara || "-"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Render Hipoterapi Form Data */}
                {(!((selectedPatient.jenis_terapi || "").toLowerCase().includes("wicara")) || selectedPatient.formulir_hipoterapi) && (
                  <div className="flex flex-col gap-3 text-xs bg-muted/20 p-4 rounded-xl border border-border">
                    <div className="font-bold text-xs text-primary">Detail Formulir Hipoterapi</div>

                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Keluhan Utama Emosi / Perilaku</span>
                      {renderChips(selectedPatient.formulir_hipoterapi?.keluhan_utama || selectedPatient.keluhan_utama)}
                    </div>

                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Penjelasan Detail Keluhan</span>
                      <p className="font-bold text-foreground italic mt-0.5">
                        {selectedPatient.formulir_hipoterapi?.penjelasan_keluhan || selectedPatient.penjelasan_keluhan || "-"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Durasi Keluhan</span>
                        <span className="font-bold text-foreground">
                          {selectedPatient.formulir_hipoterapi?.sudah_berapa_lama || selectedPatient.sudah_berapa_lama_hipo || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Bahasa Sehari-hari</span>
                        <span className="font-bold text-foreground">
                          {selectedPatient.formulir_hipoterapi?.bahasa_sehari_hari || selectedPatient.bahasa_sehari_hari_hipo || "-"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Pengurus Utama Anak</span>
                      {renderChips(selectedPatient.formulir_hipoterapi?.pengurus_utama || selectedPatient.pengurus_utama_hipo)}
                    </div>

                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Tempat Favorit Anak</span>
                      {renderChips(selectedPatient.formulir_hipoterapi?.tempat_favorit || selectedPatient.tempat_favorit)}
                    </div>

                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Kegiatan / Hobi Anak</span>
                      {renderChips(selectedPatient.formulir_hipoterapi?.hobby || selectedPatient.hobby)}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Penanganan Dokter / Psikolog?</span>
                        <span className="font-bold text-foreground">
                          {formatBoolean(selectedPatient.formulir_hipoterapi?.dalam_penanganan_dokter ?? selectedPatient.dalam_penanganan_dokter)}
                        </span>
                        {(selectedPatient.formulir_hipoterapi?.nama_dokter || selectedPatient.nama_dokter) && (
                          <div className="text-[11px] text-muted-foreground">({selectedPatient.formulir_hipoterapi?.nama_dokter || selectedPatient.nama_dokter})</div>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Pengalaman Negatif / Trauma?</span>
                        <span className="font-bold text-foreground">
                          {formatBoolean(selectedPatient.formulir_hipoterapi?.pernah_trauma ?? selectedPatient.pernah_trauma_hipo)}
                        </span>
                        {(selectedPatient.formulir_hipoterapi?.detail_trauma || selectedPatient.detail_trauma_hipo) && (
                          <div className="text-[11px] text-muted-foreground">({selectedPatient.formulir_hipoterapi?.detail_trauma || selectedPatient.detail_trauma_hipo})</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Harapan Setelah Terapi</span>
                      <p className="font-bold text-foreground mt-0.5">
                        {selectedPatient.formulir_hipoterapi?.harapan_terapi || selectedPatient.harapan_terapi_hipo || "-"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: Catatan Internal Admin */}
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Catatan Terapis / Admin Internal</label>
                <textarea
                  placeholder="Masukkan catatan evaluasi atau instruksi tambahan..."
                  value={selectedPatient.catatan_internal || ""}
                  onChange={(e) => handleUpdateNotes(selectedPatient.id, e.target.value)}
                  rows={3}
                  className="bg-background border border-input rounded-md p-3 text-xs text-foreground focus:outline-none focus:border-primary resize-none w-full"
                />
              </div>
            </div>
          )}

        </div>
      </Main>

      {/* ================= Progress & Milestone Modal ================= */}
      {progressModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-6 relative">
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Progress Tracking System</span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">
                  Record Sesi & Milestone: {selectedPatient.nama_lengkap}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Input evaluasi perkembangan per sesi agar orang tua dapat memantau grafik milestone anak di Patient Portal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProgressModalOpen(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground"
              >
                <X size={20} />
              </button>
            </div>

            {/* Existing Recorded Sessions */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                📋 Riwayat Sesi Terdaftar ({patientLogs.length} Sesi Recorded)
              </h4>
              {loadingLogs ? (
                <div className="text-xs text-muted-foreground italic p-3">Memuat riwayat sesi...</div>
              ) : patientLogs.length === 0 ? (
                <div className="text-xs text-muted-foreground italic bg-muted/40 p-4 rounded-xl text-center">
                  Belum ada log sesi tercatat. Silakan input sesi pertama di bawah ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {patientLogs.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="bg-muted/40 border border-border rounded-xl p-3.5 flex flex-col gap-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-primary">Sesi #{log.session_number} dari {log.total_sessions}</span>
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                          Score: {log.progress_score}%
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold">Tanggal: {log.session_date || '—'}</span>
                      <p className="font-bold text-foreground line-clamp-1">🎯 {log.fokus_latihan || 'Latihan Stimulasi'}</p>
                      {log.catatan_terapis && <p className="text-muted-foreground italic text-[11px] line-clamp-2">💬 "{log.catatan_terapis}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input Form for New Session */}
            <div className="border-t border-border pt-4 flex flex-col gap-4 bg-muted/20 p-5 rounded-xl border">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                ✏️ Form Input Progress Sesi Baru
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Sesi Ke-</label>
                  <input
                    type="number"
                    value={logForm.session_number}
                    onChange={(e) => setLogForm((f) => ({ ...f, session_number: Number(e.target.value) }))}
                    className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Total Sesi Paket</label>
                  <input
                    type="number"
                    value={logForm.total_sessions}
                    onChange={(e) => setLogForm((f) => ({ ...f, total_sessions: Number(e.target.value) }))}
                    className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Tanggal Sesi</label>
                  <input
                    type="date"
                    value={logForm.session_date}
                    onChange={(e) => setLogForm((f) => ({ ...f, session_date: e.target.value }))}
                    className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Fokus Latihan / Pembelajaran Sesi Ini</label>
                <input
                  type="text"
                  placeholder="Contoh: Stimulasi Kontak Mata & Artikulasi Kata Huruf R"
                  value={logForm.fokus_latihan}
                  onChange={(e) => setLogForm((f) => ({ ...f, fokus_latihan: e.target.value }))}
                  className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-xs font-semibold mt-1"
                />
              </div>

              {/* Overall Progress Score */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Skor Evaluasi Sesi Overall ({logForm.progress_score}%)</label>
                  <span className="text-xs font-black text-primary">{logForm.progress_score}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={logForm.progress_score}
                  onChange={(e) => setLogForm((f) => ({ ...f, progress_score: Number(e.target.value) }))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Aspect Scores Breakdown */}
              <div className="flex flex-col gap-2 bg-background p-3 rounded-lg border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Breakdown Skor Aspek Tumbuh Kembang (0-100%):</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex justify-between">
                      <span>👁️ Atensi & Fokus:</span>
                      <span className="font-bold">{logForm.aspect_scores.atensi_fokus}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100}
                      value={logForm.aspect_scores.atensi_fokus}
                      onChange={(e) => setLogForm((f) => ({ ...f, aspect_scores: { ...f.aspect_scores, atensi_fokus: Number(e.target.value) } }))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <span>🗣️ Artikulasi & Wicara:</span>
                      <span className="font-bold">{logForm.aspect_scores.artikulasi_wicara}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100}
                      value={logForm.aspect_scores.artikulasi_wicara}
                      onChange={(e) => setLogForm((f) => ({ ...f, aspect_scores: { ...f.aspect_scores, artikulasi_wicara: Number(e.target.value) } }))}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <span>💖 Regulasi Emosi:</span>
                      <span className="font-bold">{logForm.aspect_scores.regulasi_emosi}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100}
                      value={logForm.aspect_scores.regulasi_emosi}
                      onChange={(e) => setLogForm((f) => ({ ...f, aspect_scores: { ...f.aspect_scores, regulasi_emosi: Number(e.target.value) } }))}
                      className="w-full accent-purple-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <span>📝 Kepatuhan Instruksi:</span>
                      <span className="font-bold">{logForm.aspect_scores.kepatuhan_instruksi}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100}
                      value={logForm.aspect_scores.kepatuhan_instruksi}
                      onChange={(e) => setLogForm((f) => ({ ...f, aspect_scores: { ...f.aspect_scores, kepatuhan_instruksi: Number(e.target.value) } }))}
                      className="w-full accent-amber-600"
                    />
                  </div>
                </div>
              </div>

              {/* Text Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Catatan Evaluasi Terapis</label>
                  <textarea
                    rows={3}
                    placeholder="Evaluasi lengkap hasil stimulasi terapis selama sesi berlangsung..."
                    value={logForm.catatan_terapis}
                    onChange={(e) => setLogForm((f) => ({ ...f, catatan_terapis: e.target.value }))}
                    className="w-full bg-background border border-input rounded-md p-2.5 text-xs focus:outline-none focus:border-primary resize-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Rekomendasi Latihan di Rumah (PR Ortu)</label>
                  <textarea
                    rows={3}
                    placeholder="Instruksi latihan atau kegiatan yang perlu dilakukan orang tua di rumah..."
                    value={logForm.rekomendasi_ortu}
                    onChange={(e) => setLogForm((f) => ({ ...f, rekomendasi_ortu: e.target.value }))}
                    className="w-full bg-background border border-input rounded-md p-2.5 text-xs focus:outline-none focus:border-primary resize-none mt-1"
                  />
                </div>
              </div>

              {/* Status Milestone */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Status Pencapaian Milestone</label>
                <div className="flex gap-2 mt-1">
                  {[
                    { key: "sesuai_target", label: "✅ Sesuai Target" },
                    { key: "melampaui_target", label: "🌟 Melampaui Target" },
                    { key: "perlu_pembiasaan", label: "🔄 Perlu Pembiasaan" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setLogForm((f) => ({ ...f, status_pencapaian: item.key }))}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                        logForm.status_pencapaian === item.key
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background border-input text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={handleSaveLog}
                disabled={savingLog}
                className="mt-2 bg-primary hover:brightness-110 text-primary-foreground font-bold py-2.5 px-4 rounded-xl text-xs shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingLog ? "Memproses Simpan..." : "💾 Simpan Progress Sesi Terapi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
