import React, { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Star, Eye, EyeOff, MessagesSquare, Quote } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Testimonial {
  id: number
  name: string
  role: string
  message: string
  avatar_url: string | null
  rating: number
  sort_order: number
  is_active: boolean
  created_at: string
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:9000/api').replace('/api', '')
const UPLOAD_BASE = `${API_BASE}/api/admin`
const LANDING_BASE = import.meta.env.VITE_LANDING_URL ?? 'http://localhost:9001'

function resolveUrl(url: string | null): string {
  if (!url) return ''
  // Already an absolute URL (MinIO, Unsplash, CDN, etc)
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // Static landing-page assets — serve from the Next.js landing page
  if (url.startsWith('/assets/')) return `${LANDING_BASE}${url}`
  return `${API_BASE}${url}`
}

async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem('admin_token')
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(`${UPLOAD_BASE}/testimonials/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) throw new Error('Gagal mengunggah gambar')
  const data = await res.json()
  return data.url as string
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  )
}

function DeleteDialog({ title, onConfirm, onCancel, deleting }: { title: string; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  return (
    <div className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/65 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-xl text-center">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={22} /></div>
        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50 mb-1">Hapus testimoni ini?</h3>
        <p className="text-xs text-slate-500 mb-6 font-semibold px-2">Apakah Anda yakin ingin menghapus testimoni dari <strong>{title}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs border-none cursor-pointer">Batal</button>
          <button onClick={onConfirm} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md border-none cursor-pointer">
            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Testimonial | null>(null)
  const [form, setForm] = useState({ name: '', role: '', message: '', avatar_url: '', rating: 5, sort_order: 1, is_active: true })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await api.get<Testimonial[]>('/admin/testimonials')
      setItems(data)
    }
    catch (e: any) { setError(e.message ?? 'Gagal memuat data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openAdd = () => {
    setEditTarget(null)
    setForm({ name: '', role: '', message: '', avatar_url: '', rating: 5, sort_order: 1, is_active: true })
    setDialogOpen(true)
  }

  const openEdit = (t: Testimonial) => {
    setEditTarget(t)
    setForm({
      name: t.name,
      role: t.role,
      message: t.message,
      avatar_url: t.avatar_url ?? '',
      rating: t.rating,
      sort_order: t.sort_order,
      is_active: t.is_active
    })
    setDialogOpen(true)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm(f => ({ ...f, avatar_url: url }))
      toast.success('Foto profil berhasil diunggah')
    }
    catch (e: any) { toast.error(e.message) } finally { setUploading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.role || !form.message) {
      toast.warning('Nama, Peran/Role, dan Testimoni wajib diisi!')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        avatar_url: form.avatar_url || null
      }
      if (editTarget) {
        await api.patch(`/admin/testimonials/${editTarget.id}`, payload)
        toast.success('Testimoni berhasil diperbarui')
      } else {
        await api.post('/admin/testimonials', payload)
        toast.success('Testimoni baru berhasil ditambahkan')
      }
      setDialogOpen(false)
      fetchItems()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (t: Testimonial) => {
    try {
      const updated = await api.patch<Testimonial>(`/admin/testimonials/${t.id}`, { is_active: !t.is_active })
      setItems(prev => prev.map(x => x.id === t.id ? updated : x))
      toast.success(`Testimoni ${t.name} telah ${!t.is_active ? 'diaktifkan' : 'dinonaktifkan'}`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true)
    try {
      await api.delete(`/admin/testimonials/${deleteTarget.id}`)
      toast.success('Testimoni berhasil dihapus')
      setDeleteTarget(null)
      fetchItems()
    }
    catch (e: any) { toast.error(e.message) } finally { setDeleting(false) }
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
              <Quote size={24} className="text-wellme-primary" />
              Manajemen Testimoni
            </h1>
            <p className="text-xs text-slate-500 mt-1">Kelola review dan testimoni dari para orang tua untuk ditampilkan pada halaman landing utama.</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-wellme-secondary-gradient hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border-none self-start sm:self-center">
            <Plus size={15} />Tambah Testimoni
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
            Belum ada testimoni yang tersedia. Silakan tambahkan testimoni baru.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(t => (
              <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between group relative transition-all hover:shadow-md">
                
                {/* Rating & Actions Bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} fill={i < t.rating ? 'currentColor' : 'none'} className={i < t.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'} />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleToggle(t)} className={`p-1.5 rounded-lg border-none cursor-pointer transition-colors ${t.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                      {t.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-700 border-none cursor-pointer transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setDeleteTarget(t)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-red-500 hover:bg-red-100 dark:hover:bg-slate-700 border-none cursor-pointer transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Content Message */}
                <div className="flex-1 mb-6">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed line-clamp-4 relative">
                    &ldquo;{t.message}&rdquo;
                  </p>
                </div>

                {/* User Info Footer */}
                <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-800">
                    {t.avatar_url ? (
                      <img src={resolveUrl(t.avatar_url)} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-wellme-primary/10 text-wellme-primary font-bold text-sm uppercase">
                        {t.name.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-50 truncate">{t.name}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate">{t.role}</p>
                  </div>
                  <div className="ml-auto shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[9px] text-slate-400 font-bold">Order: {t.sort_order}</span>
                    <StatusBadge active={t.is_active} />
                  </div>
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
                {editTarget ? 'Edit Testimoni' : 'Tambah Testimoni Baru'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Orang Tua</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: Ibu Alifah" 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-wellme-primary" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Peran / Hubungan Anak</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: Orang Tua dari Alifah (3 Tahun)" 
                    value={form.role} 
                    onChange={e => setForm({ ...form, role: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-wellme-primary" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Isi Testimoni</label>
                  <textarea 
                    required 
                    rows={4}
                    placeholder="Tuliskan pengalaman positif orang tua..." 
                    value={form.message} 
                    onChange={e => setForm({ ...form, message: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-wellme-primary resize-none" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Foto Profil (Opsional)</label>
                  {form.avatar_url && (
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-250 dark:border-slate-800">
                      <img src={resolveUrl(form.avatar_url)} alt="avatar preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUpload} 
                      disabled={uploading} 
                      className="hidden" 
                      id="avatar-img-upload" 
                    />
                    <label 
                      htmlFor="avatar-img-upload" 
                      className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-3 py-2.5 rounded-xl text-xs text-center cursor-pointer block border border-transparent transition-colors"
                    >
                      {uploading ? 'Mengunggah...' : 'Unggah Foto'}
                    </label>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Atau masukkan URL foto avatar..." 
                    value={form.avatar_url} 
                    onChange={e => setForm({ ...form, avatar_url: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-[10px] font-medium focus:outline-none" 
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Rating (1-5)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="5"
                      value={form.rating} 
                      onChange={e => setForm({ ...form, rating: Math.max(1, Math.min(5, parseInt(e.target.value) || 5)) })} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sort Order</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={form.sort_order} 
                      onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 1 })} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
                    <select 
                      value={form.is_active ? 'yes' : 'no'} 
                      onChange={e => setForm({ ...form, is_active: e.target.value === 'yes' })} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"
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
            title={deleteTarget.name} 
            onConfirm={handleDelete} 
            onCancel={() => setDeleteTarget(null)} 
            deleting={deleting} 
          />
        )}
      </Main>
    </>
  )
}
