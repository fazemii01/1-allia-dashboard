import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { Search, Eye, Filter, CheckCircle2, AlertCircle, RefreshCw, UserCheck, MessageSquare } from "lucide-react";

interface Patient {
  id: string | number;
  nama_lengkap: string;
  usia: string | number;
  jenis_kelamin: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  email_ortu: string;
  no_telepon: string;
  nama_ayah: string;
  nama_ibu: string;
  alamat: string;
  jenis_terapi: string;
  status: "baru" | "terjadwal" | "aktif" | "selesai" | "dibatalkan";
  therapist?: string;
  catatan_internal?: string;
  // Wicara
  masalah_bicara?: string;
  sudah_berapa_lama_wicara?: string;
  dalam_penanganan_lain?: string;
  nama_penanganan_lain?: string;
  bahasa_sehari_hari_wicara?: string;
  gangguan_utama?: string[];
  pengurus_utama_wicara?: string[];
  harapan_terapi_wicara?: string;
  // Hipoterapi
  keluhan_utama?: string[];
  penjelasan_keluhan?: string;
  sudah_berapa_lama_hipo?: string;
  dalam_penanganan_dokter?: string;
  nama_dokter?: string;
  pengurus_utama_hipo?: string[];
  bahasa_sehari_hari_hipo?: string;
  harapan_terapi_hipo?: string;
  tempat_favorit?: string[];
  hobby?: string[];
}

const mockPatients: Patient[] = [
  {
    id: "1",
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
    status: "baru",
    masalah_bicara: "Belum lancar mengucapkan kata berdua, kosakata kurang dari 10 kata",
    sudah_berapa_lama_wicara: "6 bulan",
    bahasa_sehari_hari_wicara: "Bahasa Indonesia",
    gangguan_utama: ["Kosa kata terbatas", "Artikulasi tidak jelas"],
    pengurus_utama_wicara: ["Ibu", "Nenek"],
    harapan_terapi_wicara: "Semoga bisa lancar berbicara dan siap masuk sekolah TK",
  },
  {
    id: "2",
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
    status: "aktif",
    therapist: "Faza S.Psi",
    keluhan_utama: ["Marah", "Tidak Bisa Fokus"],
    penjelasan_keluhan: "Anak gampang tantrum hebat kalau keinginannya tidak dituruti, susah ditenangkan",
    sudah_berapa_lama_hipo: "3 bulan",
    bahasa_sehari_hari_hipo: "Bahasa Indonesia",
    pengurus_utama_hipo: ["Ibu"],
    harapan_terapi_hipo: "Emosi anak lebih stabil dan patuh arahan orang tua",
    tempat_favorit: ["Taman", "Rumah"],
    hobby: ["Menggambar", "Bermain HP/Gadget"],
  }
];

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTerapi, setFilterTerapi] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    // Load local storage submissions & combine with mock
    const localApplies = JSON.parse(localStorage.getItem("pending_applies") || "[]");
    const formattedLocal: Patient[] = localApplies.map((app: any) => ({
      id: app.id,
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
      // Wicara
      masalah_bicara: app.masalah_bicara,
      sudah_berapa_lama_wicara: app.sudah_berapa_lama_wicara,
      dalam_penanganan_lain: app.dalam_penanganan_lain,
      nama_penanganan_lain: app.nama_penanganan_lain,
      bahasa_sehari_hari_wicara: app.bahasa_sehari_hari_wicara,
      gangguan_utama: app.gangguan_utama,
      pengurus_utama_wicara: app.pengurus_utama_wicara,
      harapan_terapi_wicara: app.harapan_terapi_wicara,
      // Hipo
      keluhan_utama: app.keluhan_utama,
      penjelasan_keluhan: app.penjelasan_keluhan,
      sudah_berapa_lama_hipo: app.sudah_berapa_lama_hipo,
      dalam_penanganan_dokter: app.dalam_penanganan_dokter,
      nama_dokter: app.nama_dokter,
      pengurus_utama_hipo: app.pengurus_utama_hipo,
      bahasa_sehari_hari_hipo: app.bahasa_sehari_hari_hipo,
      harapan_terapi_hipo: app.harapan_terapi_hipo,
      tempat_favorit: app.tempat_favorit,
      hobby: app.hobby,
    }));

    setPatients([...mockPatients, ...formattedLocal]);
  }, []);

  const handleUpdateStatus = (id: string | number, newStatus: Patient["status"]) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    if (selectedPatient && selectedPatient.id === id) {
      setSelectedPatient((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleAssignTherapist = (id: string | number, therapist: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, therapist } : p))
    );
    if (selectedPatient && selectedPatient.id === id) {
      setSelectedPatient((prev) => prev ? { ...prev, therapist } : null);
    }
  };

  const handleUpdateNotes = (id: string | number, catatan_internal: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, catatan_internal } : p))
    );
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch = p.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nama_ibu.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTerapi = filterTerapi ? p.jenis_terapi === filterTerapi : true;
    const matchesStatus = filterStatus ? p.status === filterStatus : true;
    return matchesSearch && matchesTerapi && matchesStatus;
  });

  const getStatusBadge = (status: Patient["status"]) => {
    const styles = {
      baru: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      terjadwal: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      aktif: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      selesai: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      dibatalkan: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
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

      <Main className="flex flex-1 flex-col gap-4 sm:gap-6 pt-20">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pendaftaran & Data Pasien</h2>
          <p className="text-muted-foreground">
            Kelola pendaftaran masuk, ubah status, dan jadwalkan terapis.
          </p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 bg-muted/40 p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter:</span>
          </div>

          <select
            value={filterTerapi}
            onChange={(e) => setFilterTerapi(e.target.value)}
            className="bg-background border border-input rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">Semua Terapi</option>
            <option value="terapi_wicara">🗣️ Terapi Wicara</option>
            <option value="hipoterapi">🧠 Hipoterapi</option>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Table / List Column */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase">
                    <th className="p-4">Anak</th>
                    <th className="p-4">Orang Tua</th>
                    <th className="p-4">Jenis Terapi</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground font-semibold">
                        Tidak ada data pasien ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-foreground">{p.nama_lengkap}</div>
                          <div className="text-xs text-muted-foreground">{p.usia} Tahun • {p.jenis_kelamin}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-foreground">{p.nama_ibu}</div>
                          <div className="text-xs text-muted-foreground">{p.no_telepon}</div>
                        </td>
                        <td className="p-4 font-semibold capitalize text-foreground">
                          {p.jenis_terapi === "terapi_wicara" ? "🗣️ Wicara" : "🧠 Hipoterapi"}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${getStatusBadge(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedPatient(p)}
                            className="inline-flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold px-3 py-1.5 rounded-md cursor-pointer shadow-sm"
                          >
                            <Eye size={12} /> Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Detail / Editor Panel */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {selectedPatient ? (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col gap-5">
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{selectedPatient.nama_lengkap}</h3>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mt-1">
                      {selectedPatient.jenis_terapi === "terapi_wicara" ? "🗣️ Terapi Wicara" : "🧠 Hipoterapi"}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${getStatusBadge(selectedPatient.status)}`}>
                    {selectedPatient.status}
                  </span>
                </div>

                {/* Patient Admin Configs */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Pilih Terapis</label>
                    <select
                      value={selectedPatient.therapist || ""}
                      onChange={(e) => handleAssignTherapist(selectedPatient.id, e.target.value)}
                      className="bg-background border border-input rounded-md px-3 py-1.5 text-sm w-full"
                    >
                      <option value="">— Belum Ditugaskan —</option>
                      <option value="Faza S.Psi">Faza S.Psi</option>
                      <option value="Amanda S.Psi">Amanda S.Psi</option>
                      <option value="Terapis Hendri">Terapis Hendri</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Status Pendaftaran</label>
                    <div className="flex flex-wrap gap-1.5">
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

                <hr className="border-border" />

                {/* Patient Info Blocks */}
                <div className="flex flex-col gap-4 text-xs font-medium text-muted-foreground">
                  <div>
                    <span className="font-bold text-[10px] uppercase text-muted-foreground/60">Usia & Lahir</span>
                    <p className="text-foreground font-semibold mt-0.5">{selectedPatient.usia} Tahun ({selectedPatient.tempat_lahir}, {selectedPatient.tanggal_lahir})</p>
                  </div>

                  <div>
                    <span className="font-bold text-[10px] uppercase text-muted-foreground/60">Orang Tua (Ayah / Ibu)</span>
                    <p className="text-foreground font-semibold mt-0.5">{selectedPatient.nama_ayah} / {selectedPatient.nama_ibu}</p>
                  </div>

                  <div>
                    <span className="font-bold text-[10px] uppercase text-muted-foreground/60">Kontak WhatsApp</span>
                    <p className="text-foreground font-bold mt-0.5 flex items-center gap-1.5">
                      {selectedPatient.no_telepon}
                      <a
                        href={`https://wa.me/${selectedPatient.no_telepon.replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <MessageSquare size={12} />
                      </a>
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-[10px] uppercase text-muted-foreground/60">Alamat</span>
                    <p className="text-foreground font-semibold mt-0.5 leading-relaxed">{selectedPatient.alamat}</p>
                  </div>

                  <hr className="border-border" />

                  {/* Wicara Specific Details */}
                  {selectedPatient.jenis_terapi === "terapi_wicara" && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <span className="font-bold text-[10px] uppercase text-muted-foreground/60">Keluhan Utama Wicara</span>
                        <p className="text-foreground font-semibold mt-0.5 italic">{selectedPatient.masalah_bicara}</p>
                      </div>
                      {selectedPatient.gangguan_utama && (
                        <div>
                          <span className="font-bold text-[10px] uppercase text-muted-foreground/60">Gejala Terdeteksi</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedPatient.gangguan_utama.map((g) => (
                              <span key={g} className="bg-muted px-2 py-0.5 rounded text-[10px] text-foreground font-bold">{g}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hipoterapi Specific Details */}
                  {selectedPatient.jenis_terapi === "hipoterapi" && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <span className="font-bold text-[10px] uppercase text-muted-foreground/60">Keluhan Emosi</span>
                        <p className="text-foreground font-semibold mt-0.5 italic">{selectedPatient.penjelasan_keluhan}</p>
                      </div>
                      {selectedPatient.keluhan_utama && (
                        <div>
                          <span className="font-bold text-[10px] uppercase text-muted-foreground/60">Keluhan Utama</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedPatient.keluhan_utama.map((g) => (
                              <span key={g} className="bg-muted px-2 py-0.5 rounded text-[10px] text-foreground font-bold">{g}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <hr className="border-border" />

                  {/* Catatan Internal */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Catatan Terapis / Admin</label>
                    <textarea
                      placeholder="Masukkan catatan evaluasi atau jadwal konsultasi..."
                      value={selectedPatient.catatan_internal || ""}
                      onChange={(e) => handleUpdateNotes(selectedPatient.id, e.target.value)}
                      rows={3}
                      className="bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary resize-none w-full"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground font-semibold flex flex-col items-center justify-center h-48 gap-2">
                <AlertCircle size={24} />
                Pilih pasien untuk melihat detail formulir
              </div>
            )}
          </div>

        </div>
      </Main>
    </div>
  );
}
