import React, { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { apiFetch } from '@/lib/api'
import { ExternalLink, Plus, CheckCircle, Send, Receipt, Trash2, Calendar as CalendarIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Patient {
  id: string | number
  nama_lengkap: string
}

interface Appointment {
  id: string | number
  scheduled_at: string
}

interface LineItem {
  description: string
  amount: number
}

interface Invoice {
  id: string | number
  invoice_number?: string
  invoice_token?: string
  patient_id: string | number
  patient_name?: string
  appointment_id?: string | number
  due_date: string
  status: 'belum_bayar' | 'sudah_bayar' | 'jatuh_tempo' | 'menunggu_verifikasi'
  total: number
  line_items?: LineItem[]
  payment_proof?: string
}

const STATUS_COLORS: Record<string, string> = {
  belum_bayar: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  sudah_bayar: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  jatuh_tempo: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  menunggu_verifikasi: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200/50',
}

const STATUS_LABELS: Record<string, string> = {
  belum_bayar: 'Belum Bayar',
  sudah_bayar: 'Lunas',
  jatuh_tempo: 'Jatuh Tempo',
  menunggu_verifikasi: 'Menunggu Verifikasi',
}

function formatRp(amount: number) {
  return 'Rp ' + amount.toLocaleString('id-ID')
}

export default function InvoicesPage() {
  const { auth } = useAuthStore()
  const userRole = auth.user?.role?.[0] || 'user'
  const canManageInvoices = userRole === 'admin'

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    patient_id: '',
    appointment_id: '',
    due_date: '',
    line_items: [{ description: '', amount: 0 }] as LineItem[],
  })
  const [saving, setSaving] = useState(false)

  const [markingPaid, setMarkingPaid] = useState<string | number | null>(null)
  const [sendingWa, setSendingWa] = useState<string | number | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [invs, pts, appts] = await Promise.all([
        apiFetch<Invoice[]>('/admin/invoices'),
        apiFetch<Patient[]>('/admin/patients'),
        apiFetch<Appointment[]>('/admin/appointments'),
      ])
      setInvoices(invs)
      setPatients(pts)
      setAppointments(appts)
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch('/admin/invoices', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: Number(form.patient_id),
          appointment_id: form.appointment_id ? Number(form.appointment_id) : undefined,
          items: form.line_items.map((item) => ({
            description: item.description,
            amount: Number(item.amount),
          })),
          due_date: form.due_date,
        }),
      })
      setDialogOpen(false)
      fetchAll()
      toast.success('Invoice berhasil dibuat!')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal membuat invoice')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async (id: string | number) => {
    setMarkingPaid(id)
    try {
      await apiFetch(`/admin/invoices/${id}/mark-paid`, { method: 'PATCH' })
      fetchAll()
      toast.success('Invoice berhasil ditandai lunas!')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menandai lunas')
    } finally {
      setMarkingPaid(null)
    }
  }

  const handleSendWa = async (id: string | number) => {
    setSendingWa(id)
    try {
      await apiFetch(`/admin/invoices/${id}/send-whatsapp`, { method: 'POST' })
      toast.success('WhatsApp berhasil dikirim!')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mengirim WhatsApp')
    } finally {
      setSendingWa(null)
    }
  }

  const addLineItem = () => setForm((f) => ({ ...f, line_items: [...f.line_items, { description: '', amount: 0 }] }))
  const removeLineItem = (i: number) => setForm((f) => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }))
  const updateLineItem = (i: number, field: keyof LineItem, value: string | number) => {
    setForm((f) => {
      const items = [...f.line_items]
      items[i] = { ...items[i], [field]: value }
      return { ...f, line_items: items }
    })
  }

  const openDialog = () => {
    setForm({ patient_id: '', appointment_id: '', due_date: '', line_items: [{ description: '', amount: 0 }] })
    setDialogOpen(true)
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
            <h2 className="text-2xl font-bold tracking-tight">Invoice & Tagihan</h2>
            <p className="text-muted-foreground">Buat dan kelola tagihan sesi terapi.</p>
          </div>
          {canManageInvoices && (
            <button
              onClick={openDialog}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-semibold shadow-sm"
            >
              <Plus size={16} /> Buat Invoice
            </button>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 text-sm font-medium">{error}</div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase">
                  <th className="p-4">No. Invoice</th>
                  <th className="p-4">Pasien</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Jatuh Tempo</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="p-4"><div className="h-4 bg-muted animate-pulse rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-2"><Receipt size={32} className="opacity-30" />Belum ada data invoice</div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-mono text-xs font-bold text-foreground">
                        <div>{inv.invoice_number ?? `INV-${inv.id}`}</div>
                        {inv.payment_proof && (
                          <a
                            href={`http://localhost:3001${inv.payment_proof}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold mt-1.5"
                          >
                            <span>Lihat Bukti ↗</span>
                          </a>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-foreground">
                        {inv.patient_name ?? patients.find((p) => p.id === inv.patient_id)?.nama_lengkap ?? `#${inv.patient_id}`}
                      </td>
                      <td className="p-4 font-semibold text-foreground">{formatRp(inv.total ?? 0)}</td>
                      <td className="p-4 text-muted-foreground">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${STATUS_COLORS[inv.status] ?? ''}`}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex gap-2 items-center">
                          {inv.invoice_token && (
                            <a
                            href={`${import.meta.env.PROD ? 'https://alliakids.com' : 'http://localhost:9001'}/invoice/${inv.invoice_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors"
                            >
                              <ExternalLink size={11} /> Lihat
                            </a>
                          )}
                          {canManageInvoices && (
                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              disabled={inv.status === 'sudah_bayar' || markingPaid === inv.id}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all",
                                inv.status === 'menunggu_verifikasi'
                                  ? "bg-orange-500 hover:bg-orange-600 border-orange-600 text-white shadow-sm shadow-orange-500/10 font-bold"
                                  : "border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                              )}
                            >
                              <CheckCircle size={12} />
                              {markingPaid === inv.id 
                                ? '...' 
                                : inv.status === 'menunggu_verifikasi' 
                                ? 'Verifikasi Lunas' 
                                : 'Tandai Lunas'}
                            </button>
                          )}
                          <button
                            onClick={() => handleSendWa(inv.id)}
                            disabled={sendingWa === inv.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-muted-foreground text-xs font-semibold hover:bg-muted disabled:opacity-40 transition-colors"
                          >
                            <Send size={12} />
                            {sendingWa === inv.id ? '...' : 'Kirim WA'}
                          </button>
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

      {/* Create Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDialogOpen(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold">Buat Invoice Baru</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Isi detail tagihan sesi terapi.</p>
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
                  {patients.map((p) => <option key={p.id} value={String(p.id)}>{p.nama_lengkap}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Sesi (opsional)</label>
                <select
                  value={form.appointment_id}
                  onChange={(e) => setForm((f) => ({ ...f, appointment_id: e.target.value }))}
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">-- Tanpa Sesi --</option>
                  {appointments.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      Sesi #{a.id} — {a.scheduled_at ? new Date(a.scheduled_at).toLocaleDateString('id-ID') : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Jatuh Tempo</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal border-input bg-background h-10 px-3",
                        !form.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      {form.due_date ? format(new Date(form.due_date), "dd MMMM yyyy") : <span>Pilih tanggal jatuh tempo</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.due_date ? new Date(form.due_date) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Format to YYYY-MM-DD
                          const offset = date.getTimezoneOffset();
                          const localDate = new Date(date.getTime() - (offset * 60 * 1000));
                          setForm((f) => ({ ...f, due_date: localDate.toISOString().split('T')[0] }));
                        } else {
                          setForm((f) => ({ ...f, due_date: "" }));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Line Items */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Item Tagihan</label>
                {form.line_items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      value={item.description}
                      onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                      placeholder="Deskripsi layanan"
                      className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateLineItem(i, 'amount', Number(e.target.value))}
                      placeholder="Rp"
                      className="w-32 bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                    {form.line_items.length > 1 && (
                      <button onClick={() => removeLineItem(i)} className="text-destructive hover:text-destructive/80">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addLineItem}
                  className="text-xs font-semibold text-primary hover:text-primary/80 self-start mt-1"
                >
                  + Tambah Item
                </button>
                <div className="text-right text-sm font-bold text-foreground mt-1">
                  Total: {formatRp(form.line_items.reduce((s, i) => s + Number(i.amount), 0))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setDialogOpen(false)} className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.patient_id || !form.due_date}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
