import React, { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Pencil, XCircle, CalendarDays, Filter, Calendar as CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Patient {
  id: string | number
  nama_lengkap: string
}

interface Therapist {
  id: string | number
  name: string
}

interface Appointment {
  id: string | number
  patient_id: string | number
  therapist_id: string | number
  patient_name?: string
  therapist_name?: string
  scheduled_at: string
  duration_minutes: number
  status: 'dijadwalkan' | 'selesai' | 'dibatalkan'
  notes?: string
}

const emptyForm = {
  patient_id: '',
  therapist_id: '',
  scheduled_at: '',
  duration_minutes: 60,
  notes: '',
}

const STATUS_COLORS: Record<string, string> = {
  dijadwalkan: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  selesai: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  dibatalkan: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  dijadwalkan: 'Dijadwalkan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterDate, setFilterDate] = useState('')
  const [filterTherapist, setFilterTherapist] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Appointment | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Separated date and time state for custom calendar
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState('09:00')

  // Cancel confirm
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [appts, pts, thrs] = await Promise.all([
        apiFetch<Appointment[]>('/admin/appointments'),
        apiFetch<Patient[]>('/admin/patients'),
        apiFetch<Therapist[]>('/admin/therapists'),
      ])
      setAppointments(appts)
      setPatients(pts)
      setTherapists(thrs)
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      setForm((f) => ({ ...f, scheduled_at: `${year}-${month}-${day}T${selectedTime}` }))
    } else {
      setForm((f) => ({ ...f, scheduled_at: '' }))
    }
  }

  const handleTimeChange = (time: string) => {
    setSelectedTime(time)
    if (selectedDate) {
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      setForm((f) => ({ ...f, scheduled_at: `${year}-${month}-${day}T${time}` }))
    }
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setSelectedDate(undefined)
    setSelectedTime('09:00')
    setDialogOpen(true)
  }

  const openEdit = (a: Appointment) => {
    setEditTarget(a)
    setForm({
      patient_id: String(a.patient_id),
      therapist_id: String(a.therapist_id),
      scheduled_at: a.scheduled_at?.slice(0, 16) ?? '',
      duration_minutes: a.duration_minutes,
      notes: a.notes ?? '',
    })
    if (a.scheduled_at) {
      const d = new Date(a.scheduled_at)
      setSelectedDate(d)
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      setSelectedTime(`${hours}:${minutes}`)
    } else {
      setSelectedDate(undefined)
      setSelectedTime('09:00')
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        patient_id: Number(form.patient_id),
        therapist_id: Number(form.therapist_id),
      }
      if (editTarget) {
        await apiFetch(`/admin/appointments/${editTarget.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/admin/appointments', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      setDialogOpen(false)
      fetchAll()
      toast.success(editTarget ? 'Janji temu berhasil diperbarui!' : 'Janji temu berhasil dibuat!')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await apiFetch(`/admin/appointments/${cancelTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'dibatalkan' }),
      })
      setCancelTarget(null)
      fetchAll()
    } catch (e: any) {
      toast.success('Janji temu berhasil dibatalkan!')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal membatalkan')
    } finally {
      setCancelling(false)
    }
  }

  const filtered = appointments.filter((a) => {
    const matchDate = filterDate ? a.scheduled_at?.startsWith(filterDate) : true
    const matchTherapist = filterTherapist ? String(a.therapist_id) === filterTherapist : true
    const matchStatus = filterStatus ? a.status === filterStatus : true
    return matchDate && matchTherapist && matchStatus
  })

  const formatDateTime = (dt: string) => {
    if (!dt) return '—'
    const d = new Date(dt)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header fixed>
        <div className="flex flex-1 items-center gap-2" />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className="flex flex-1 flex-col gap-4 sm:gap-6 pt-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Jadwal Sesi</h2>
            <p className="text-muted-foreground">Kelola jadwal sesi terapi pasien.</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-semibold shadow-sm"
          >
            <Plus size={16} /> Buat Jadwal
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-muted/40 p-4 rounded-xl border border-border">
          <Filter size={14} className="text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal border-input bg-background h-9 px-3 text-xs",
                  !filterDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {filterDate ? format(new Date(filterDate), "dd MMM yyyy") : <span>Semua Tanggal</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterDate ? new Date(filterDate) : undefined}
                onSelect={(date) => {
                  if (date) {
                    const offset = date.getTimezoneOffset();
                    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
                    setFilterDate(localDate.toISOString().split('T')[0]);
                  } else {
                    setFilterDate('');
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {filterDate && (
            <Button
              variant="ghost"
              onClick={() => setFilterDate('')}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
          <select
            value={filterTherapist}
            onChange={(e) => setFilterTherapist(e.target.value)}
            className="bg-background border border-input rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">Semua Terapis</option>
            {therapists.map((t) => (
              <option key={t.id} value={String(t.id)}>{t.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-background border border-input rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">Semua Status</option>
            <option value="dijadwalkan">Dijadwalkan</option>
            <option value="selesai">Selesai</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase">
                  <th className="p-4">Pasien</th>
                  <th className="p-4">Terapis</th>
                  <th className="p-4">Tanggal & Jam</th>
                  <th className="p-4">Durasi</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Catatan</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="p-4">
                          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-2">
                        <CalendarDays size={32} className="opacity-30" />
                        Belum ada data jadwal sesi
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-semibold text-foreground">
                        {a.patient_name ?? patients.find((p) => p.id === a.patient_id)?.nama_lengkap ?? `#${a.patient_id}`}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {a.therapist_name ?? therapists.find((t) => t.id === a.therapist_id)?.name ?? `#${a.therapist_id}`}
                      </td>
                      <td className="p-4 text-muted-foreground">{formatDateTime(a.scheduled_at)}</td>
                      <td className="p-4 text-muted-foreground">{a.duration_minutes} menit</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${STATUS_COLORS[a.status] ?? ''}`}>
                          {STATUS_LABELS[a.status] ?? a.status}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground max-w-[150px] truncate">{a.notes || '—'}</td>
                      <td className="p-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => openEdit(a)}
                            className="p-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          {a.status !== 'dibatalkan' && (
                            <button
                              onClick={() => setCancelTarget(a)}
                              className="p-1.5 rounded-md border border-destructive/30 hover:bg-destructive/10 text-destructive transition-colors"
                              title="Batalkan"
                            >
                              <XCircle size={14} />
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
        </div>
      </Main>

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDialogOpen(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold">{editTarget ? 'Edit Jadwal' : 'Buat Jadwal Baru'}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Isi detail sesi terapi.</p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Pasien</label>
                <select
                  value={form.patient_id}
                  onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">-- Pilih Pasien --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.nama_lengkap}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Terapis</label>
                <select
                  value={form.therapist_id}
                  onChange={(e) => setForm((f) => ({ ...f, therapist_id: e.target.value }))}
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">-- Pilih Terapis --</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Tanggal & Jam</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "flex-1 justify-start text-left font-normal border-input bg-background h-10 px-3",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        {selectedDate ? format(selectedDate, "dd MMMM yyyy") : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-28 bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary text-center font-semibold"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Durasi (menit)</label>
                <input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                  min={15}
                  step={15}
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Catatan opsional..."
                  rows={2}
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setDialogOpen(false)} className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.patient_id || !form.therapist_id || !form.scheduled_at}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCancelTarget(null)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold">Batalkan Jadwal?</h3>
            <p className="text-sm text-muted-foreground">
              Jadwal sesi ini akan ditandai sebagai <span className="font-semibold text-destructive">dibatalkan</span>.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setCancelTarget(null)} className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted">Kembali</button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 disabled:opacity-50"
              >
                {cancelling ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
