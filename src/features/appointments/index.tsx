import React, { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  XCircle,
  CalendarDays,
  Filter,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Lock,
  Sparkles,
  Layers,
  Clock,
  User,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Trash2,
  Info,
  CalendarCheck,
  ArrowRight,
  Check,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { SimplePagination } from '@/components/simple-pagination'

interface Patient {
  id: string | number
  nama_lengkap: string
  no_telepon?: string
  jenis_terapi?: string
}

interface Therapist {
  id: string | number
  name: string
  specialization?: string
}

interface Appointment {
  id: string | number
  patient_id: string | number
  therapist_id: string | number
  patient?: Patient
  therapist?: Therapist
  patient_name?: string
  therapist_name?: string
  scheduled_at: string
  duration_minutes: number
  session_type?: 'priority' | 'general' | string
  batch_id?: string | null
  status: 'dijadwalkan' | 'selesai' | 'dibatalkan'
  notes?: string
}

interface BatchSessionItem {
  session_number: number
  scheduled_at: string // YYYY-MM-DDTHH:mm
  date: string // YYYY-MM-DD
  time: string // HH:mm
  duration_minutes: number
  notes: string
  hasConflict?: boolean
  conflictDetails?: string
}

const TIME_SLOTS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
]

const DAYS_OF_WEEK = [
  { index: 1, name: 'Senin' },
  { index: 2, name: 'Selasa' },
  { index: 3, name: 'Rabu' },
  { index: 4, name: 'Kamis' },
  { index: 5, name: 'Jumat' },
  { index: 6, name: 'Sabtu' },
]

// Helper to get Monday of a given date
function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)

  // View Mode: 'calendar' | 'table'
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar')

  // Calendar State: start of current visible week (Monday)
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => getMonday(new Date()))

  // Filters
  const [filterTherapist, setFilterTherapist] = useState('')
  const [filterSessionType, setFilterSessionType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchPatient, setSearchPatient] = useState('')

  // Table pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Single Appointment Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Appointment | null>(null)
  const [singleForm, setSingleForm] = useState({
    patient_id: '',
    therapist_id: '',
    date: '',
    time: '09:00',
    duration_minutes: 60,
    session_type: 'general' as 'priority' | 'general',
    notes: '',
  })
  const [savingSingle, setSavingSingle] = useState(false)

  // Selected Detail Modal
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [updatingSessionType, setUpdatingSessionType] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)

  // Cancellation Dialog
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [forceCancelChecked, setForceCancelChecked] = useState(false)

  // -------------------------------------------------------------
  // BATCH WIZARD STATE
  // -------------------------------------------------------------
  const [batchWizardOpen, setBatchWizardOpen] = useState(false)
  const [batchStep, setBatchStep] = useState<1 | 2 | 3>(1)
  const [batchConfig, setBatchConfig] = useState({
    patient_id: '',
    therapist_id: '',
    session_type: 'priority' as 'priority' | 'general',
    total_sessions: 8,
    duration_minutes: 60,
    // Routine pattern helper
    patternDays: [] as number[], // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    patternTime: '09:00',
    startDate: new Date().toISOString().split('T')[0],
  })
  const [batchSessions, setBatchSessions] = useState<BatchSessionItem[]>([])
  const [submittingBatch, setSubmittingBatch] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
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
      toast.error(e.message ?? 'Gagal memuat data jadwal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  // -------------------------------------------------------------
  // CALENDAR DAYS (Mon - Sat, 6 days)
  // -------------------------------------------------------------
  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(currentWeekMonday)
      d.setDate(currentWeekMonday.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentWeekMonday])

  const prevWeek = () => {
    const prev = new Date(currentWeekMonday)
    prev.setDate(prev.getDate() - 7)
    setCurrentWeekMonday(prev)
  }

  const nextWeek = () => {
    const next = new Date(currentWeekMonday)
    next.setDate(next.getDate() + 7)
    setCurrentWeekMonday(next)
  }

  const goToToday = () => {
    setCurrentWeekMonday(getMonday(new Date()))
  }

  // Conflict Checker for a given therapist, date (YYYY-MM-DD), and time (HH:mm)
  const checkSlotConflict = (therapistId: number | string, dateStr: string, timeStr: string, durationMin = 60, excludeId?: number | string) => {
    if (!therapistId || !dateStr || !timeStr) return null
    const [hours, minutes] = timeStr.split(':').map(Number)
    const startTime = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`).getTime()
    const endTime = startTime + durationMin * 60 * 1000

    const conflict = appointments.find((a) => {
      if (excludeId && String(a.id) === String(excludeId)) return false
      if (String(a.therapist_id) !== String(therapistId)) return false
      if (a.status === 'dibatalkan') return false

      const apptStart = new Date(a.scheduled_at).getTime()
      const apptEnd = apptStart + (a.duration_minutes || 60) * 60 * 1000

      return apptStart < endTime && apptEnd > startTime
    })

    return conflict || null
  }

  // -------------------------------------------------------------
  // SINGLE SESSION ACTIONS
  // -------------------------------------------------------------
  const openAddSingle = (initialDate?: string, initialTime?: string) => {
    setEditTarget(null)
    setSingleForm({
      patient_id: '',
      therapist_id: filterTherapist || (therapists[0] ? String(therapists[0].id) : ''),
      date: initialDate || new Date().toISOString().split('T')[0],
      time: initialTime || '09:00',
      duration_minutes: 60,
      session_type: 'general',
      notes: '',
    })
    setDialogOpen(true)
  }

  const openEditSingle = (a: Appointment) => {
    setEditTarget(a)
    const dt = new Date(a.scheduled_at)
    const year = dt.getFullYear()
    const month = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    const hours = String(dt.getHours()).padStart(2, '0')
    const minutes = String(dt.getMinutes()).padStart(2, '0')

    setSingleForm({
      patient_id: String(a.patient_id),
      therapist_id: String(a.therapist_id),
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
      duration_minutes: a.duration_minutes || 60,
      session_type: (a.session_type as any) || 'general',
      notes: a.notes || '',
    })
    setDialogOpen(true)
  }

  const handleSaveSingle = async () => {
    if (!singleForm.patient_id || !singleForm.therapist_id || !singleForm.date || !singleForm.time) {
      toast.error('Mohon lengkapi semua field wajib (Pasien, Terapis, Tanggal & Jam)')
      return
    }

    setSavingSingle(true)
    try {
      const scheduled_at = `${singleForm.date}T${singleForm.time}:00`
      const payload = {
        patient_id: Number(singleForm.patient_id),
        therapist_id: Number(singleForm.therapist_id),
        scheduled_at,
        duration_minutes: Number(singleForm.duration_minutes) || 60,
        session_type: singleForm.session_type,
        notes: singleForm.notes || undefined,
      }

      if (editTarget) {
        await apiFetch(`/admin/appointments/${editTarget.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        toast.success('Jadwal sesi berhasil diperbarui!')
      } else {
        await apiFetch('/admin/appointments', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Jadwal sesi berhasil dibuat!')
      }

      setDialogOpen(false)
      if (selectedAppointment && editTarget && String(selectedAppointment.id) === String(editTarget.id)) {
        setSelectedAppointment(null)
      }
      await fetchAll()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menyimpan jadwal')
    } finally {
      setSavingSingle(false)
    }
  }

  const handleToggleSessionType = async (appt: Appointment) => {
    const newType = appt.session_type === 'priority' ? 'general' : 'priority'
    setUpdatingSessionType(true)
    try {
      await apiFetch(`/admin/appointments/${appt.id}/session-type`, {
        method: 'PATCH',
        body: JSON.stringify({ session_type: newType }),
      })
      toast.success(
        newType === 'priority'
          ? 'Sesi berhasil diubah menjadi Prioritas (Terkunci)!'
          : 'Sesi berhasil diubah menjadi Reguler / Umum.'
      )
      await fetchAll()
      if (selectedAppointment && String(selectedAppointment.id) === String(appt.id)) {
        setSelectedAppointment({ ...selectedAppointment, session_type: newType })
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mengubah tipe sesi')
    } finally {
      setUpdatingSessionType(false)
    }
  }

  const handleSendReminder = async (apptId: string | number) => {
    setSendingReminder(true)
    try {
      const res = await apiFetch<any>(`/admin/appointments/${apptId}/send-reminder`, {
        method: 'POST',
      })
      if (res.whatsapp?.sent) {
        toast.success('Pesan pengingat sesi berhasil dikirim ke WhatsApp pasien!')
      } else {
        toast.info(res.whatsapp?.error || 'Pengingat diproses server.')
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mengirim pengingat WhatsApp')
    } finally {
      setSendingReminder(false)
    }
  }

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      const isPriority = cancelTarget.session_type === 'priority'
      const forceParam = isPriority && forceCancelChecked ? '?force=true' : ''
      await apiFetch(`/admin/appointments/${cancelTarget.id}${forceParam}`, {
        method: 'DELETE',
      })
      toast.success('Jadwal sesi berhasil dibatalkan.')
      setCancelTarget(null)
      setForceCancelChecked(false)
      if (selectedAppointment && String(selectedAppointment.id) === String(cancelTarget.id)) {
        setSelectedAppointment(null)
      }
      await fetchAll()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal membatalkan jadwal sesi')
    } finally {
      setCancelling(false)
    }
  }

  // -------------------------------------------------------------
  // BATCH WIZARD LOGIC
  // -------------------------------------------------------------
  const openBatchWizard = () => {
    const defaultTherapist = therapists[0] ? String(therapists[0].id) : ''
    setBatchConfig({
      patient_id: '',
      therapist_id: defaultTherapist,
      session_type: 'priority',
      total_sessions: 8,
      duration_minutes: 60,
      patternDays: [1, 4], // Mon & Thu default
      patternTime: '10:00',
      startDate: new Date().toISOString().split('T')[0],
    })
    setBatchStep(1)
    setBatchSessions([])
    setBatchWizardOpen(true)
  }

  const generateBatchSessionsFromConfig = () => {
    const { total_sessions, duration_minutes, patternDays, patternTime, startDate, therapist_id } = batchConfig
    const count = Number(total_sessions) || 8
    const daysArr = patternDays.length > 0 ? patternDays : [1] // default to Monday if none
    const items: BatchSessionItem[] = []

    let checkDate = new Date(startDate)
    checkDate.setHours(0, 0, 0, 0)

    while (items.length < count) {
      const dayOfWeek = checkDate.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
      // Skip Sunday (0)
      if (dayOfWeek !== 0 && daysArr.includes(dayOfWeek)) {
        const year = checkDate.getFullYear()
        const month = String(checkDate.getMonth() + 1).padStart(2, '0')
        const day = String(checkDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        const timeStr = patternTime || '09:00'
        const scheduled_at = `${dateStr}T${timeStr}`

        const conflict = checkSlotConflict(therapist_id, dateStr, timeStr, duration_minutes)

        items.push({
          session_number: items.length + 1,
          scheduled_at,
          date: dateStr,
          time: timeStr,
          duration_minutes: duration_minutes || 60,
          notes: '',
          hasConflict: !!conflict,
          conflictDetails: conflict ? `Bentrok: ${conflict.patient?.nama_lengkap || 'Pasien lain'}` : undefined,
        })
      }
      checkDate.setDate(checkDate.getDate() + 1)
    }

    setBatchSessions(items)
    setBatchStep(2)
  }

  const handleUpdateBatchSessionItem = (index: number, field: 'date' | 'time' | 'notes', value: string) => {
    setBatchSessions((prev) => {
      const next = [...prev]
      const curr = { ...next[index] }

      if (field === 'date') curr.date = value
      if (field === 'time') curr.time = value
      if (field === 'notes') curr.notes = value

      curr.scheduled_at = `${curr.date}T${curr.time}`

      // Check conflict
      const conflict = checkSlotConflict(batchConfig.therapist_id, curr.date, curr.time, curr.duration_minutes)
      curr.hasConflict = !!conflict
      curr.conflictDetails = conflict ? `Bentrok: ${conflict.patient?.nama_lengkap || 'Pasien lain'}` : undefined

      next[index] = curr
      return next
    })
  }

  const handleSubmitBatch = async () => {
    // Check if any session still has conflict
    const hasAnyConflict = batchSessions.some((s) => s.hasConflict)
    if (hasAnyConflict) {
      toast.error('Masih ada sesi yang bentrok jadwal. Mohon sesuaikan tanggal/jam sesi yang ditandai merah.')
      return
    }

    setSubmittingBatch(true)
    try {
      const payload = {
        patient_id: Number(batchConfig.patient_id),
        therapist_id: Number(batchConfig.therapist_id),
        session_type: batchConfig.session_type,
        sessions: batchSessions.map((s) => ({
          scheduled_at: `${s.date}T${s.time}:00`,
          duration_minutes: s.duration_minutes,
          notes: s.notes || undefined,
          session_type: batchConfig.session_type,
        })),
      }

      const res = await apiFetch<any>('/admin/appointments/batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      toast.success(`Berhasil membuat batch ${res.count || batchSessions.length} jadwal sesi!`)
      setBatchWizardOpen(false)
      await fetchAll()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal membuat batch sesi')
    } finally {
      setSubmittingBatch(false)
    }
  }

  // -------------------------------------------------------------
  // FILTERED DATA
  // -------------------------------------------------------------
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (filterTherapist && String(a.therapist_id) !== filterTherapist) return false
      if (filterSessionType && (a.session_type || 'general') !== filterSessionType) return false
      if (filterStatus && a.status !== filterStatus) return false
      if (searchPatient.trim()) {
        const q = searchPatient.toLowerCase()
        const matchPName = (a.patient?.nama_lengkap || a.patient_name || '').toLowerCase().includes(q)
        const matchTName = (a.therapist?.name || a.therapist_name || '').toLowerCase().includes(q)
        const matchNotes = (a.notes || '').toLowerCase().includes(q)
        if (!matchPName && !matchTName && !matchNotes) return false
      }
      return true
    })
  }, [appointments, filterTherapist, filterSessionType, filterStatus, searchPatient])

  // Count metrics
  const totalCount = appointments.length
  const priorityCount = appointments.filter((a) => a.session_type === 'priority').length
  const generalCount = appointments.filter((a) => (a.session_type || 'general') === 'general').length
  const scheduledCount = appointments.filter((a) => a.status === 'dijadwalkan').length

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header fixed>
        <div className="flex flex-1 items-center gap-2" />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className="flex flex-1 flex-col gap-5 sm:gap-6 pt-20 px-4 sm:px-8 pb-16 max-w-7xl mx-auto w-full">
        {/* Top Header & Action Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">Jadwal Sesi & Alokasi Terapi</h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Atur kalender mingguan, alokasi Batch Sesi pasien (Senin - Sabtu), dan kelola sesi Prioritas / Reguler.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Toggle Button Group */}
            <div className="inline-flex p-1 bg-muted rounded-xl border border-border">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Kalender Mingguan
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Tabel Data
              </button>
            </div>

            <Button
              onClick={() => openAddSingle()}
              variant="outline"
              className="text-xs font-bold gap-1.5 rounded-xl border-input hover:bg-muted cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Sesi Tunggal
            </Button>

            <Button
              onClick={openBatchWizard}
              className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold gap-2 rounded-xl shadow-sm px-4 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              Alokasi Batch Sesi (8x)
            </Button>
          </div>
        </div>

        {/* Metrics Counter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Sesi Aktif</span>
            <div className="text-xl font-black text-foreground mt-0.5">{scheduledCount}</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Prioritas (Terkunci)
            </span>
            <div className="text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5">{priorityCount}</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Reguler / Umum
            </span>
            <div className="text-xl font-black text-blue-900 dark:text-blue-200 mt-0.5">{generalCount}</div>
          </div>
          <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Jumlah Pasien Terdaftar</span>
            <div className="text-xl font-black text-foreground mt-0.5">{patients.length}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-muted-foreground mr-1">
              <Filter className="h-3.5 w-3.5 text-primary" /> Filter:
            </div>

            <select
              value={filterTherapist}
              onChange={(e) => setFilterTherapist(e.target.value)}
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Semua Terapis ({therapists.length})</option>
              {therapists.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name} {t.specialization ? `(${t.specialization})` : ''}
                </option>
              ))}
            </select>

            <select
              value={filterSessionType}
              onChange={(e) => setFilterSessionType(e.target.value)}
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Semua Tipe Sesi</option>
              <option value="priority">Prioritas Saja (Terkunci)</option>
              <option value="general">Reguler / Umum Saja</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Semua Status</option>
              <option value="dijadwalkan">Dijadwalkan</option>
              <option value="selesai">Selesai</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>

            {(filterTherapist || filterSessionType || filterStatus || searchPatient) && (
              <button
                onClick={() => {
                  setFilterTherapist('')
                  setFilterSessionType('')
                  setFilterStatus('')
                  setSearchPatient('')
                }}
                className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari pasien / catatan..."
              value={searchPatient}
              onChange={(e) => setSearchPatient(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* VIEW 1: WEEKLY BIG CALENDAR (Senin - Sabtu) */}
        {/* ----------------------------------------------------------------- */}
        {viewMode === 'calendar' && (
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            {/* Week Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <Button
                  onClick={prevWeek}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  title="Minggu Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  onClick={nextWeek}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  title="Minggu Berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  onClick={goToToday}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs font-bold rounded-lg cursor-pointer ml-1"
                >
                  Hari Ini
                </Button>

                <div className="ml-2">
                  <span className="text-sm font-black text-foreground">
                    {format(weekDays[0], 'd MMM yyyy')} — {format(weekDays[5], 'd MMM yyyy')}
                  </span>
                  <span className="text-[11px] text-muted-foreground block font-medium">
                    (Senin s/d Sabtu • Jam 07:00 - 18:00 WIB)
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block border border-amber-600" />
                  <span className="text-muted-foreground text-[11px]">Prioritas (Terkunci)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-blue-500/80 inline-block border border-blue-600" />
                  <span className="text-muted-foreground text-[11px]">Reguler / Umum</span>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[840px]">
                {/* Day Headers (6 columns Mon-Sat) */}
                <div className="grid grid-cols-7 border-b border-border text-center font-bold text-xs bg-muted/30 rounded-t-xl">
                  <div className="p-3 text-muted-foreground border-r border-border/70 flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 mr-1" /> Jam
                  </div>
                  {weekDays.map((day, idx) => {
                    const isToday = new Date().toDateString() === day.toDateString()
                    const dayStr = day.toISOString().split('T')[0]
                    const daySessionsCount = filteredAppointments.filter(
                      (a) => a.scheduled_at?.startsWith(dayStr) && a.status !== 'dibatalkan'
                    ).length

                    return (
                      <div
                        key={idx}
                        className={`p-3 border-r border-border/70 last:border-r-0 ${
                          isToday ? 'bg-primary/10 text-primary' : 'text-foreground'
                        }`}
                      >
                        <div className="text-[13px] font-black uppercase tracking-wider">
                          {DAYS_OF_WEEK[idx].name}
                        </div>
                        <div className="text-xs font-normal text-muted-foreground mt-0.5">
                          {format(day, 'd MMM')}
                        </div>
                        {daySessionsCount > 0 && (
                          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
                            {daySessionsCount} Sesi
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Time Rows */}
                <div className="divide-y divide-border/60">
                  {TIME_SLOTS.map((timeSlot) => (
                    <div key={timeSlot} className="grid grid-cols-7 min-h-[85px]">
                      {/* Time Column */}
                      <div className="p-2.5 text-xs font-extrabold text-muted-foreground border-r border-border/70 flex flex-col justify-start items-center bg-muted/10">
                        <span>{timeSlot}</span>
                        <span className="text-[10px] text-muted-foreground/60 font-normal">WIB</span>
                      </div>

                      {/* 6 Day Cells */}
                      {weekDays.map((day, dIdx) => {
                        const dateStr = day.toISOString().split('T')[0]
                        const isToday = new Date().toDateString() === day.toDateString()

                        // Find appointments that match this day and hour
                        const matchingAppts = filteredAppointments.filter((a) => {
                          if (!a.scheduled_at?.startsWith(dateStr)) return false
                          const apptHour = new Date(a.scheduled_at).getHours()
                          const slotHour = parseInt(timeSlot.split(':')[0], 10)
                          return apptHour === slotHour
                        })

                        return (
                          <div
                            key={dIdx}
                            className={`p-1.5 border-r border-border/70 last:border-r-0 relative group transition-colors ${
                              isToday ? 'bg-primary/[0.02]' : ''
                            } hover:bg-muted/20`}
                          >
                            {/* Sessions inside this slot */}
                            <div className="flex flex-col gap-1.5 h-full">
                              {matchingAppts.map((appt) => {
                                const isPriority = appt.session_type === 'priority'
                                const isCancelled = appt.status === 'dibatalkan'
                                const isDone = appt.status === 'selesai'
                                const patientName = appt.patient?.nama_lengkap || appt.patient_name || 'Pasien'
                                const therapistName = appt.therapist?.name || appt.therapist_name || 'Terapis'

                                return (
                                  <div
                                    key={appt.id}
                                    onClick={() => setSelectedAppointment(appt)}
                                    className={`p-2 rounded-xl border text-xs cursor-pointer transition-all shadow-xs hover:shadow-md hover:scale-[1.02] ${
                                      isCancelled
                                        ? 'bg-muted text-muted-foreground border-border/80 opacity-60 line-through'
                                        : isPriority
                                        ? 'bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100'
                                        : 'bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="font-extrabold text-[11px] flex items-center gap-1 truncate">
                                        {isPriority && <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />}
                                        {!isPriority && <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />}
                                        {patientName}
                                      </span>
                                      {isDone && <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />}
                                    </div>

                                    <div className="text-[10px] text-muted-foreground dark:text-slate-400 flex items-center justify-between">
                                      <span className="truncate">{therapistName}</span>
                                      <span className="font-mono text-[9px] font-bold">
                                        {new Date(appt.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}

                              {/* Quick add button on hover */}
                              {matchingAppts.length === 0 && (
                                <button
                                  onClick={() => openAddSingle(dateStr, timeSlot)}
                                  className="w-full h-full min-h-[40px] rounded-lg border border-dashed border-border/40 hover:border-primary/50 text-muted-foreground/40 hover:text-primary flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all cursor-pointer font-bold gap-1"
                                >
                                  <Plus className="h-3 w-3" /> Tambah
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* VIEW 2: TABLE VIEW */}
        {/* ----------------------------------------------------------------- */}
        {viewMode === 'table' && (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-extrabold text-[11px]">
                  <tr>
                    <th className="p-4">Pasien</th>
                    <th className="p-4">Terapis</th>
                    <th className="p-4">Tanggal & Jam</th>
                    <th className="p-4">Durasi</th>
                    <th className="p-4">Tipe Sesi</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="font-bold">Tidak ada jadwal sesi ditemukan.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((appt) => {
                        const isPriority = appt.session_type === 'priority'
                        const isCancelled = appt.status === 'dibatalkan'
                        const isDone = appt.status === 'selesai'

                        return (
                          <tr key={appt.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className="font-extrabold text-foreground">{appt.patient?.nama_lengkap || appt.patient_name || '—'}</div>
                              {appt.patient?.no_telepon && (
                                <div className="text-[11px] text-muted-foreground font-mono">{appt.patient.no_telepon}</div>
                              )}
                            </td>
                            <td className="p-4 font-semibold text-foreground">
                              {appt.therapist?.name || appt.therapist_name || '—'}
                            </td>
                            <td className="p-4 font-medium text-foreground">
                              <div>
                                {new Date(appt.scheduled_at).toLocaleDateString('id-ID', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="font-mono text-muted-foreground text-[11px]">
                                {new Date(appt.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                              </div>
                            </td>
                            <td className="p-4 text-muted-foreground">{appt.duration_minutes || 60} Menit</td>
                            <td className="p-4">
                              {isPriority ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  <Lock className="h-3 w-3" /> Prioritas
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                  <Sparkles className="h-3 w-3" /> Reguler
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              {isDone && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30">
                                  Selesai
                                </span>
                              )}
                              {isCancelled && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                                  Dibatalkan
                                </span>
                              )}
                              {!isDone && !isCancelled && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                  Dijadwalkan
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  onClick={() => setSelectedAppointment(appt)}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs font-bold px-2 rounded-lg cursor-pointer"
                                >
                                  Detail
                                </Button>
                                <Button
                                  onClick={() => openEditSingle(appt)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Edit Sesi"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  onClick={() => {
                                    setCancelTarget(appt)
                                    setForceCancelChecked(false)
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                  title="Batalkan Sesi"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-border">
              <SimplePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredAppointments.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: DETAIL SESI APPOINTMENT */}
        {/* ------------------------------------------------------------- */}
        <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
          <DialogContent className="sm:max-w-md p-6">
            {selectedAppointment && (
              <div className="space-y-4">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      Detail Jadwal Sesi
                    </DialogTitle>
                    {selectedAppointment.session_type === 'priority' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        <Lock className="h-3 w-3" /> Prioritas (Terkunci)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                        <Sparkles className="h-3 w-3" /> Reguler / Umum
                      </span>
                    )}
                  </div>
                </DialogHeader>

                <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-border/60 pb-2">
                    <span className="text-muted-foreground font-bold">Nama Pasien:</span>
                    <span className="font-extrabold text-foreground text-sm">
                      {selectedAppointment.patient?.nama_lengkap || selectedAppointment.patient_name || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-border/60 pb-2">
                    <span className="text-muted-foreground font-bold">Terapis Bertugas:</span>
                    <span className="font-bold text-foreground">
                      {selectedAppointment.therapist?.name || selectedAppointment.therapist_name || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-border/60 pb-2">
                    <span className="text-muted-foreground font-bold">Tanggal & Waktu:</span>
                    <span className="font-bold text-foreground">
                      {new Date(selectedAppointment.scheduled_at).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}{' '}
                      •{' '}
                      {new Date(selectedAppointment.scheduled_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-border/60 pb-2">
                    <span className="text-muted-foreground font-bold">Durasi:</span>
                    <span className="font-bold text-foreground">{selectedAppointment.duration_minutes || 60} Menit</span>
                  </div>

                  {selectedAppointment.batch_id && (
                    <div className="flex justify-between items-center border-b border-border/60 pb-2">
                      <span className="text-muted-foreground font-bold">Batch ID:</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{selectedAppointment.batch_id}</span>
                    </div>
                  )}

                  {selectedAppointment.notes && (
                    <div className="space-y-1 pt-1">
                      <span className="text-muted-foreground font-bold">Catatan Sesi:</span>
                      <p className="text-foreground bg-background p-2.5 rounded-lg border border-border font-medium leading-relaxed">
                        {selectedAppointment.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Priority Protection Notice */}
                {selectedAppointment.session_type === 'priority' && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold">Slot Sesi Prioritas Terkunci</p>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Jadwal ini dialokasikan khusus untuk pasien paket tetap dan dilindungi dari pergeseran tanpa izin.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons inside Detail */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleToggleSessionType(selectedAppointment)}
                      disabled={updatingSessionType}
                      variant="outline"
                      size="sm"
                      className="text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      {selectedAppointment.session_type === 'priority' ? 'Ubah ke Reguler' : 'Ubah ke Prioritas'}
                    </Button>

                    <Button
                      onClick={() => handleSendReminder(selectedAppointment.id)}
                      disabled={sendingReminder}
                      variant="outline"
                      size="sm"
                      className="text-xs font-bold gap-1.5 rounded-xl text-primary border-primary/40 hover:bg-primary/10 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {sendingReminder ? 'Mengirim...' : 'Kirim WA Reminder'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                    <Button
                      onClick={() => {
                        setCancelTarget(selectedAppointment)
                        setForceCancelChecked(false)
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer gap-1"
                    >
                      <XCircle className="h-4 w-4" /> Batalkan Sesi
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          openEditSingle(selectedAppointment)
                        }}
                        variant="secondary"
                        size="sm"
                        className="text-xs font-bold gap-1 rounded-xl cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ------------------------------------------------------------- */}
        {/* MODAL: SINGLE APPOINTMENT ADD / EDIT */}
        {/* ------------------------------------------------------------- */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                {editTarget ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                {editTarget ? 'Edit Jadwal Sesi' : 'Buat Jadwal Sesi Baru'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground uppercase tracking-wide">Pilih Pasien *</label>
                <select
                  value={singleForm.patient_id}
                  onChange={(e) => setSingleForm((f) => ({ ...f, patient_id: e.target.value }))}
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">-- Pilih Pasien Terdaftar --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.nama_lengkap} {p.no_telepon ? `(${p.no_telepon})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground uppercase tracking-wide">Pilih Terapis Bertugas *</label>
                <select
                  value={singleForm.therapist_id}
                  onChange={(e) => setSingleForm((f) => ({ ...f, therapist_id: e.target.value }))}
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">-- Pilih Terapis --</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name} {t.specialization ? `(${t.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipe Jadwal */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground uppercase tracking-wide">Tipe Jadwal Sesi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSingleForm((f) => ({ ...f, session_type: 'priority' }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      singleForm.session_type === 'priority'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-200 shadow-xs'
                        : 'bg-background border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="font-black text-xs flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                      Prioritas (Terkunci)
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Pasien tetap / slot prioritas dilindungi.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSingleForm((f) => ({ ...f, session_type: 'general' }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      singleForm.session_type === 'general'
                        ? 'bg-blue-500/15 border-blue-500 text-blue-950 dark:text-blue-200 shadow-xs'
                        : 'bg-background border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="font-black text-xs flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      Reguler / Umum
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Jadwal reguler yang dapat diatur fleksibel.
                    </div>
                  </button>
                </div>
              </div>

              {/* Tanggal, Jam, Durasi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground uppercase tracking-wide">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={singleForm.date}
                    onChange={(e) => setSingleForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground uppercase tracking-wide">Jam Sesi *</label>
                  <input
                    type="time"
                    required
                    value={singleForm.time}
                    onChange={(e) => setSingleForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground uppercase tracking-wide">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={singleForm.duration_minutes}
                    onChange={(e) => setSingleForm((f) => ({ ...f, duration_minutes: Number(e.target.value) || 60 }))}
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground uppercase tracking-wide">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Sesi evaluasi wicara ke-1..."
                  value={singleForm.notes}
                  onChange={(e) => setSingleForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button onClick={() => setDialogOpen(false)} variant="outline" size="sm" className="rounded-xl cursor-pointer">
                Batal
              </Button>
              <Button
                onClick={handleSaveSingle}
                disabled={savingSingle}
                size="sm"
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 cursor-pointer"
              >
                {savingSingle ? 'Menyimpan...' : editTarget ? 'Simpan Perubahan' : 'Terbitkan Jadwal'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ------------------------------------------------------------- */}
        {/* MODAL: BATCH JADWAL SESI WIZARD */}
        {/* ------------------------------------------------------------- */}
        <Dialog open={batchWizardOpen} onOpenChange={setBatchWizardOpen}>
          <DialogContent className="sm:max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Alokasi Batch Jadwal Sesi Terapi
                </DialogTitle>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  Langkah {batchStep} dari 3
                </span>
              </div>
            </DialogHeader>

            {/* Step Indicators */}
            <div className="grid grid-cols-3 gap-2 border-b border-border pb-3 text-center text-xs font-bold">
              <div className={`p-1.5 rounded-lg ${batchStep === 1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                1. Konfigurasi Pasien
              </div>
              <div className={`p-1.5 rounded-lg ${batchStep === 2 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                2. Tanggal & Jam Sesi
              </div>
              <div className={`p-1.5 rounded-lg ${batchStep === 3 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                3. Ringkasan & Terbitkan
              </div>
            </div>

            {/* STEP 1: CONFIG */}
            {batchStep === 1 && (
              <div className="space-y-4 text-xs pt-2">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground uppercase tracking-wide">Pilih Pasien Terdaftar *</label>
                  <select
                    value={batchConfig.patient_id}
                    onChange={(e) => setBatchConfig((c) => ({ ...c, patient_id: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Pilih Pasien --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.nama_lengkap} {p.jenis_terapi ? `(${p.jenis_terapi})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground uppercase tracking-wide">Pilih Terapis Penanggung Jawab *</label>
                  <select
                    value={batchConfig.therapist_id}
                    onChange={(e) => setBatchConfig((c) => ({ ...c, therapist_id: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Pilih Terapis --</option>
                    {therapists.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name} {t.specialization ? `(${t.specialization})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipe Sesi */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground uppercase tracking-wide">Tipe Jadwal Sesi Batch</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBatchConfig((c) => ({ ...c, session_type: 'priority' }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        batchConfig.session_type === 'priority'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-200 shadow-xs'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <div className="font-black text-xs flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-600" />
                        Prioritas (Slot Terkunci)
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Direkomendasikan untuk paket terapi rutin 8 sesi agar jadwal tidak tergeser.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBatchConfig((c) => ({ ...c, session_type: 'general' }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        batchConfig.session_type === 'general'
                          ? 'bg-blue-500/15 border-blue-500 text-blue-950 dark:text-blue-200 shadow-xs'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <div className="font-black text-xs flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        Reguler / Umum
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Jadwal umum fleksibel yang dapat diubah sewaktu-waktu.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Total Sesi & Durasi */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground uppercase tracking-wide">Jumlah Total Sesi</label>
                    <input
                      type="number"
                      min={1}
                      max={32}
                      value={batchConfig.total_sessions}
                      onChange={(e) => setBatchConfig((c) => ({ ...c, total_sessions: parseInt(e.target.value) || 8 }))}
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                    />
                    <span className="text-[10px] text-muted-foreground">Bisa diisi 4, 8, 12, atau sesuai kebutuhan paket.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground uppercase tracking-wide">Durasi Tiap Sesi (Menit)</label>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={batchConfig.duration_minutes}
                      onChange={(e) => setBatchConfig((c) => ({ ...c, duration_minutes: parseInt(e.target.value) || 60 }))}
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Routine Pattern Generator Helper */}
                <div className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-3">
                  <div className="font-extrabold text-foreground flex items-center gap-1.5">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    Pola Hari Rutin Mingguan (Senin - Sabtu):
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = batchConfig.patternDays.includes(d.index)
                      return (
                        <button
                          key={d.index}
                          type="button"
                          onClick={() => {
                            setBatchConfig((c) => {
                              const exists = c.patternDays.includes(d.index)
                              const nextDays = exists ? c.patternDays.filter((x) => x !== d.index) : [...c.patternDays, d.index]
                              return { ...c, patternDays: nextDays }
                            })
                          }}
                          className={`p-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-background text-muted-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {d.name}
                        </button>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Mulai Dari Tanggal:</label>
                      <input
                        type="date"
                        value={batchConfig.startDate}
                        onChange={(e) => setBatchConfig((c) => ({ ...c, startDate: e.target.value }))}
                        className="w-full bg-background border border-input rounded-lg p-2 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Jam Rutin Sesi:</label>
                      <input
                        type="time"
                        value={batchConfig.patternTime}
                        onChange={(e) => setBatchConfig((c) => ({ ...c, patternTime: e.target.value }))}
                        className="w-full bg-background border border-input rounded-lg p-2 text-xs text-foreground"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SESSION LIST CUSTOMIZATION */}
            {batchStep === 2 && (
              <div className="space-y-4 text-xs pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    Periksa dan sesuaikan tanggal & jam masing-masing sesi secara individual. Sesi yang bentrok ditandai merah:
                  </p>
                  <span className="font-extrabold text-foreground">{batchSessions.length} Sesi Terjadwal</span>
                </div>

                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {batchSessions.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all ${
                        item.hasConflict
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800'
                          : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-black text-xs flex items-center gap-1.5">
                          <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black">
                            {idx + 1}
                          </span>
                          Sesi Ke-{idx + 1}
                        </span>

                        {item.hasConflict ? (
                          <span className="text-[10px] font-extrabold text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="h-3 w-3" /> {item.conflictDetails}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-md">
                            <Check className="h-3 w-3" /> Slot Tersedia
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">Tanggal Sesi:</label>
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => handleUpdateBatchSessionItem(idx, 'date', e.target.value)}
                            className="w-full bg-background border border-input rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">Jam Sesi:</label>
                          <input
                            type="time"
                            value={item.time}
                            onChange={(e) => handleUpdateBatchSessionItem(idx, 'time', e.target.value)}
                            className="w-full bg-background border border-input rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: SUMMARY */}
            {batchStep === 3 && (
              <div className="space-y-4 text-xs pt-2">
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-muted-foreground">Pasien:</span>
                    <span className="text-foreground text-sm font-black">
                      {patients.find((p) => String(p.id) === String(batchConfig.patient_id))?.nama_lengkap || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-muted-foreground">Terapis:</span>
                    <span className="text-foreground font-black">
                      {therapists.find((t) => String(t.id) === String(batchConfig.therapist_id))?.name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-muted-foreground">Tipe Sesi:</span>
                    <span className="font-extrabold uppercase text-primary">
                      {batchConfig.session_type === 'priority' ? 'Prioritas (Terkunci)' : 'Reguler / Umum'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-muted-foreground">Total Sesi:</span>
                    <span className="text-foreground font-black">{batchSessions.length} Sesi Terjadwal</span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Rincian Alokasi Tanggal:
                  </span>
                  {batchSessions.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/70 text-xs">
                      <span className="font-extrabold">Sesi #{s.session_number}</span>
                      <span className="font-medium text-foreground">
                        {new Date(s.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="font-mono font-bold text-primary">{s.time} WIB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-3 border-t border-border">
              {batchStep > 1 && (
                <Button
                  onClick={() => setBatchStep((s) => (s - 1) as any)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl cursor-pointer"
                >
                  Kembali
                </Button>
              )}

              {batchStep === 1 && (
                <Button
                  onClick={() => {
                    if (!batchConfig.patient_id || !batchConfig.therapist_id) {
                      toast.error('Mohon pilih Pasien dan Terapis terlebih dahulu.')
                      return
                    }
                    generateBatchSessionsFromConfig()
                  }}
                  size="sm"
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-4 cursor-pointer gap-1.5"
                >
                  Lanjut ke Jadwal Individual <ArrowRight className="h-4 w-4" />
                </Button>
              )}

              {batchStep === 2 && (
                <Button
                  onClick={() => setBatchStep(3)}
                  size="sm"
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-4 cursor-pointer gap-1.5"
                >
                  Review Ringkasan <ArrowRight className="h-4 w-4" />
                </Button>
              )}

              {batchStep === 3 && (
                <Button
                  onClick={handleSubmitBatch}
                  disabled={submittingBatch}
                  size="sm"
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-black rounded-xl px-6 cursor-pointer shadow-sm"
                >
                  {submittingBatch ? 'Menerbitkan Batch...' : `Terbitkan ${batchSessions.length} Jadwal Sesi Sekaligus`}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ------------------------------------------------------------- */}
        {/* MODAL: CANCELLATION CONFIRMATION */}
        {/* ------------------------------------------------------------- */}
        <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
          <DialogContent className="sm:max-w-md p-6">
            {cancelTarget && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Konfirmasi Pembatalan Sesi
                  </DialogTitle>
                </DialogHeader>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Apakah Anda yakin ingin membatalkan jadwal sesi untuk{' '}
                  <strong className="text-foreground">{cancelTarget.patient?.nama_lengkap || cancelTarget.patient_name}</strong>{' '}
                  pada tanggal{' '}
                  <strong className="text-foreground">
                    {new Date(cancelTarget.scheduled_at).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </strong>{' '}
                  pukul{' '}
                  <strong className="text-foreground">
                    {new Date(cancelTarget.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </strong>
                  ?
                </p>

                {cancelTarget.session_type === 'priority' && (
                  <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl p-3.5 text-xs space-y-2 text-red-900 dark:text-red-200">
                    <p className="font-extrabold flex items-center gap-1.5 text-red-700 dark:text-red-400">
                      <Lock className="h-4 w-4" /> PERINGATAN: Sesi Berstatus Prioritas!
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      Ini adalah sesi prioritas pasien paket tetap. Membatalkan sesi ini akan melepaskan slot tetap pasien.
                    </p>
                    <label className="flex items-center gap-2 pt-1 font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={forceCancelChecked}
                        onChange={(e) => setForceCancelChecked(e.target.checked)}
                        className="rounded border-red-300 text-red-600 focus:ring-red-500"
                      />
                      <span>Saya memahami dan tetap ingin membatalkan sesi prioritas ini</span>
                    </label>
                  </div>
                )}

                <DialogFooter className="gap-2 pt-2">
                  <Button onClick={() => setCancelTarget(null)} variant="outline" size="sm" className="rounded-xl cursor-pointer">
                    Batal
                  </Button>
                  <Button
                    onClick={handleCancelAppointment}
                    disabled={cancelling || (cancelTarget.session_type === 'priority' && !forceCancelChecked)}
                    variant="destructive"
                    size="sm"
                    className="font-bold rounded-xl cursor-pointer"
                  >
                    {cancelling ? 'Membatalkan...' : 'Ya, Batalkan Jadwal Sesi'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Main>
    </div>
  )
}
