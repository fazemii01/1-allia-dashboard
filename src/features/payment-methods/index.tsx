import React, { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Eye, EyeOff, CreditCard, Building2, Copy, Check } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id: number
  bank_name: string
  account_number: string
  account_name: string
  instructions: string | null
  icon_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:9000/api').replace('/api', '')
const UPLOAD_BASE = `${API_BASE}/api/admin`
const LANDING_BASE = import.meta.env.VITE_LANDING_URL ?? 'http://localhost:9001'

function resolveUrl(url: string | null): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/assets/')) return `${LANDING_BASE}${url}`
  return `${API_BASE}${url}`
}

async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem('admin_token')
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(`${UPLOAD_BASE}/payment-methods/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) throw new Error('Gagal mengunggah ikon/QRIS')
  const data = await res.json()
  return data.url as string
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
        active
          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
      }`}
    >
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  )
}

function DeleteDialog({
  title,
  onConfirm,
  onCancel,
  deleting,
}: {
  title: string
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/65 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-xl text-center">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} />
        </div>
        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50 mb-1">
          Hapus metode pembayaran ini?
        </h3>
        <p className="text-xs text-slate-500 mb-6 font-semibold px-2">
          Apakah Anda yakin ingin menghapus <strong>{title}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs border-none cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md border-none cursor-pointer"
          >
            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentMethodsPage() {
  const [items, setItems] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PaymentMethod | null>(null)
  const [form, setForm] = useState({
    bank_name: '',
    account_number: '',
    account_name: '',
    instructions: '',
    icon_url: '',
    is_active: true,
    sort_order: 1,
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<PaymentMethod[]>('/admin/payment-methods')
      setItems(data)
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data metode pembayaran')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const openAdd = () => {
    setEditTarget(null)
    setForm({
      bank_name: '',
      account_number: '',
      account_name: 'Klinik Allia Kids',
      instructions: '',
      icon_url: '',
      is_active: true,
      sort_order: items.length + 1,
    })
    setDialogOpen(true)
  }

  const openEdit = (pm: PaymentMethod) => {
    setEditTarget(pm)
    setForm({
      bank_name: pm.bank_name,
      account_number: pm.account_number,
      account_name: pm.account_name,
      instructions: pm.instructions ?? '',
      icon_url: pm.icon_url ?? '',
      is_active: pm.is_active,
      sort_order: pm.sort_order,
    })
    setDialogOpen(true)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm((f) => ({ ...f, icon_url: url }))
      toast.success('Gambar / Ikon berhasil diunggah')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.bank_name || !form.account_number || !form.account_name) {
      toast.warning('Nama Bank / Metode, Nomor Rekening, dan Atas Nama wajib diisi!')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        instructions: form.instructions || null,
        icon_url: form.icon_url || null,
      }
      if (editTarget) {
        await api.patch(`/admin/payment-methods/${editTarget.id}`, payload)
        toast.success('Metode pembayaran berhasil diperbarui')
      } else {
        await api.post('/admin/payment-methods', payload)
        toast.success('Metode pembayaran baru berhasil ditambahkan')
      }
      setDialogOpen(false)
      fetchItems()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (pm: PaymentMethod) => {
    try {
      const updated = await api.patch<PaymentMethod>(`/admin/payment-methods/${pm.id}`, {
        is_active: !pm.is_active,
      })
      setItems((prev) => prev.map((x) => (x.id === pm.id ? updated : x)))
      toast.success(
        `Metode pembayaran ${pm.bank_name} telah ${!pm.is_active ? 'diaktifkan' : 'dinonaktifkan'}`,
      )
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/admin/payment-methods/${deleteTarget.id}`)
      toast.success('Metode pembayaran berhasil dihapus')
      setDeleteTarget(null)
      fetchItems()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.info(`Nomor rekening ${text} berhasil disalin!`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <>
      <Header>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <CreditCard size={24} className="text-wellme-primary" />
              Manajemen Metode Pembayaran
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Kelola daftar rekening bank, E-Wallet, dan QRIS untuk pembayaran tagihan pasien.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-wellme-secondary-gradient hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border-none self-start sm:self-center"
          >
            <Plus size={15} /> Tambah Metode Pembayaran
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center h-48 items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wellme-primary" />
          </div>
        ) : error ? (
          <p className="text-red-500 text-sm text-center py-8">{error}</p>
        ) : items.length === 0 ? (
          <div className="text-center text-slate-400 py-12 font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            Belum ada metode pembayaran yang tersedia. Silakan tambahkan baru.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((pm) => (
              <div
                key={pm.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between group relative transition-all hover:shadow-md"
              >
                {/* Bank Header & Status */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shrink-0">
                        {pm.icon_url ? (
                          <img
                            src={resolveUrl(pm.icon_url)}
                            alt={pm.bank_name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Building2 className="text-wellme-primary w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-50 leading-snug">
                          {pm.bank_name}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                          a.n. {pm.account_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(pm)}
                        className={`p-1.5 rounded-lg border-none cursor-pointer transition-colors ${
                          pm.is_active
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        }`}
                        title={pm.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {pm.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button
                        onClick={() => openEdit(pm)}
                        className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-700 border-none cursor-pointer transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(pm)}
                        className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-red-500 hover:bg-red-100 dark:hover:bg-slate-700 border-none cursor-pointer transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Account Number Box */}
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-2 mb-4">
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        No. Rekening / ID Pembayaran
                      </span>
                      <span className="text-sm font-extrabold font-mono text-wellme-primary dark:text-wellme-secondary truncate block">
                        {pm.account_number}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(pm.id, pm.account_number)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-wellme-primary border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 transition-colors"
                      title="Salin Nomor Rekening"
                    >
                      {copiedId === pm.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>

                  {/* Instructions */}
                  {pm.instructions && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4 line-clamp-3">
                      {pm.instructions}
                    </p>
                  )}
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-[10px] text-slate-400 font-semibold">
                  <span>Urutan: {pm.sort_order}</span>
                  <StatusBadge active={pm.is_active} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Dialog Form */}
        {dialogOpen && (
          <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-xl my-8">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50 mb-5">
                {editTarget ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran Baru'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nama Bank / Metode *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bank Central Asia (BCA) / QRIS Allia Kids"
                    value={form.bank_name}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-wellme-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nomor Rekening / ID *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 829-0182-991"
                      value={form.account_number}
                      onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold font-mono focus:outline-none focus:border-wellme-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Atas Nama (a.n) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Klinik Allia Kids"
                      value={form.account_name}
                      onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-wellme-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Instruksi Pembayaran (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Transfer nominal pas hingga 3 digit terakhir..."
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-wellme-primary resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ikon Bank / QRIS Image (Opsional)
                  </label>
                  {form.icon_url && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-950">
                      <img
                        src={resolveUrl(form.icon_url)}
                        alt="preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={uploading}
                      className="hidden"
                      id="pm-icon-upload"
                    />
                    <label
                      htmlFor="pm-icon-upload"
                      className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-3 py-2.5 rounded-xl text-xs text-center cursor-pointer block transition-colors"
                    >
                      {uploading ? 'Mengunggah...' : 'Unggah Ikon / QRIS'}
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Atau masukkan URL gambar logo..."
                    value={form.icon_url}
                    onChange={(e) => setForm({ ...form, icon_url: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[10px] font-medium focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Urutan (Sort Order)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.sort_order}
                      onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
                    <select
                      value={form.is_active ? 'yes' : 'no'}
                      onChange={(e) => setForm({ ...form, is_active: e.target.value === 'yes' })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"
                    >
                      <option value="yes">Aktif</option>
                      <option value="no">Nonaktif</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 justify-end border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setDialogOpen(false)}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer border-none transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="bg-wellme-secondary-gradient hover:opacity-95 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md border-none cursor-pointer transition-opacity"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteTarget && (
          <DeleteDialog
            title={deleteTarget.bank_name}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            deleting={deleting}
          />
        )}
      </Main>
    </>
  )
}
