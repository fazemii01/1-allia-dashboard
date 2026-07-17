import React, { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, AlertTriangle, Eye, EyeOff, Link as LinkIcon, Handshake, CheckCircle2, Layers, Images } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Partnership { id: number; name: string; slug: string; logo_url: string; sort_order: number; is_active: boolean }
interface WhyUsItem { id: number; title: string; description: string; sort_order: number; is_active: boolean }
interface CollabItem { id: number; title: string; description: string; images: string[]; sort_order: number; is_active: boolean }
interface MomentItem { id: number; title: string; img_url: string; sort_order: number; is_active: boolean }

// ─── Shared helpers ───────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:9000/api').replace('/api', '')
const UPLOAD_BASE = `${API_BASE}/api/admin`
const LANDING_BASE = import.meta.env.VITE_LANDING_URL ?? 'http://localhost:9001'

function resolveUrl(url: string): string {
  if (!url) return ''
  // Already an absolute URL (MinIO, CDN, etc)
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // Static landing-page assets — serve from the Next.js landing page
  if (url.startsWith('/assets/')) return `${LANDING_BASE}${url}`
  return `${API_BASE}${url}`
}

async function uploadImage(endpoint: string, file: File): Promise<string> {
  const token = localStorage.getItem('admin_token')
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(`${UPLOAD_BASE}/${endpoint}/upload`, {
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
        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50 mb-1">Hapus item ini?</h3>
        <p className="text-xs text-slate-500 mb-6 font-semibold px-2">Apakah Anda yakin ingin menghapus <strong>{title}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
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

// ─── Tab: Mitra Logos ────────────────────────────────────────────────────────

function PartnersTab() {
  const [items, setItems] = useState<Partnership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Partnership | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', logo_url: '', sort_order: 1, is_active: true })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Partnership | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.get<Partnership[]>('/admin/partnerships')) }
    catch (e: any) { setError(e.message ?? 'Gagal memuat data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openAdd = () => { setEditTarget(null); setForm({ name: '', slug: '', logo_url: '', sort_order: 1, is_active: true }); setDialogOpen(true) }
  const openEdit = (p: Partnership) => { setEditTarget(p); setForm({ name: p.name, slug: p.slug, logo_url: p.logo_url, sort_order: p.sort_order, is_active: p.is_active }); setDialogOpen(true) }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { const url = await uploadImage('partnerships', file); setForm(f => ({ ...f, logo_url: url })) }
    catch (e: any) { toast.error(e.message) } finally { setUploading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.slug || !form.logo_url) { toast.warning('Nama, Slug, dan Logo wajib diisi!'); return }
    setSaving(true)
    try {
      if (editTarget) await api.patch(`/admin/partnerships/${editTarget.id}`, form)
      else await api.post('/admin/partnerships', form)
      setDialogOpen(false); fetchItems()
    } catch (e: any) { toast.error(e.message ?? 'Gagal menyimpan') } finally { setSaving(false) }
  }

  const handleToggle = async (p: Partnership) => {
    try {
      const updated = await api.patch<Partnership>(`/admin/partnerships/${p.id}`, { is_active: !p.is_active })
      setItems(prev => prev.map(x => x.id === p.id ? updated : x))
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true)
    try { await api.delete(`/admin/partnerships/${deleteTarget.id}`); setDeleteTarget(null); fetchItems() }
    catch (e: any) { toast.error(e.message) } finally { setDeleting(false) }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <p className="text-xs text-slate-500 font-semibold">Logo mitra kolaborasi ditampilkan pada marquee di halaman kemitraan.</p>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-wellme-secondary-gradient hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border-none"><Plus size={15} />Tambah Mitra</button>
      </div>
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-3 mb-6 items-start">
        <AlertTriangle size={16} className="text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Gunakan logo <strong>PNG transparan</strong>. Tinggi minimal <strong>80px</strong>.</p>
      </div>
      {loading ? <div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wellme-primary" /></div>
        : error ? <p className="text-red-500 text-sm text-center py-8">{error}</p>
        : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map(p => (
            <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3 group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">#{p.id}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleToggle(p)} className={`p-1.5 rounded-lg border-none cursor-pointer ${p.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{p.is_active ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-blue-600 border-none cursor-pointer"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-red-500 border-none cursor-pointer"><Trash2 size={12} /></button>
                </div>
              </div>
              <div className="h-14 bg-slate-50 dark:bg-slate-950/40 rounded-xl flex items-center justify-center p-2 border border-slate-100 dark:border-slate-800">
                <img className="max-h-full max-w-full object-contain" src={resolveUrl(p.logo_url)} alt={p.name} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                <div className="flex items-center justify-between mt-1"><span className="text-[10px] text-slate-400">Order: {p.sort_order}</span><StatusBadge active={p.is_active} /></div>
              </div>
            </div>
          ))}
        </div>
      }

      {dialogOpen && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-5">{editTarget ? 'Edit Mitra' : 'Tambah Mitra Baru'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Mitra</label><input type="text" required placeholder="Bathaholic" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Slug</label><input type="text" required placeholder="bathaholic" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none" /></div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Logo</label>
                <div className="flex items-center gap-3">
                  {form.logo_url && (
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-center p-2 border border-slate-200 dark:border-slate-800 shrink-0">
                      <img className="max-h-full max-w-full object-contain" src={resolveUrl(form.logo_url)} alt="preview" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" id="logo-upload" />
                    <label htmlFor="logo-upload" className="block bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-3 py-2 rounded-xl text-xs text-center cursor-pointer">{uploading ? 'Mengunggah...' : 'Unggah Logo'}</label>
                    <input type="text" required placeholder="Atau masukkan URL logo..." value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-[10px] text-slate-800 dark:text-slate-100 font-medium focus:outline-none" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sort Order</label><input type="number" min="1" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 1 })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label><select value={form.is_active ? 'yes' : 'no'} onChange={e => setForm({ ...form, is_active: e.target.value === 'yes' })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none"><option value="yes">Aktif</option><option value="no">Nonaktif</option></select></div>
              </div>
              <div className="flex gap-3 pt-2 justify-end">
                <button type="button" onClick={() => setDialogOpen(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer border-none">Batal</button>
                <button type="submit" disabled={saving || uploading} className="bg-wellme-secondary-gradient hover:opacity-95 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md border-none cursor-pointer">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteTarget && <DeleteDialog title={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />}
    </div>
  )
}

// ─── Tab: Mengapa Kami (Why Us) ───────────────────────────────────────────────

function WhyUsTab() {
  const [items, setItems] = useState<WhyUsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WhyUsItem | null>(null)
  const [form, setForm] = useState({ title: '', description: '', sort_order: 1, is_active: true })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WhyUsItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.get<WhyUsItem[]>('/admin/partnership-why-us')) }
    catch (e: any) { setError(e.message ?? 'Gagal memuat data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openAdd = () => { setEditTarget(null); setForm({ title: '', description: '', sort_order: items.length + 1, is_active: true }); setDialogOpen(true) }
  const openEdit = (item: WhyUsItem) => { setEditTarget(item); setForm({ title: item.title, description: item.description, sort_order: item.sort_order, is_active: item.is_active }); setDialogOpen(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editTarget) await api.patch(`/admin/partnership-why-us/${editTarget.id}`, form)
      else await api.post('/admin/partnership-why-us', form)
      setDialogOpen(false); fetchItems()
    } catch (e: any) { toast.error(e.message ?? 'Gagal menyimpan') } finally { setSaving(false) }
  }

  const handleToggle = async (item: WhyUsItem) => {
    try {
      const updated = await api.patch<WhyUsItem>(`/admin/partnership-why-us/${item.id}`, { is_active: !item.is_active })
      setItems(prev => prev.map(x => x.id === item.id ? updated : x))
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true)
    try { await api.delete(`/admin/partnership-why-us/${deleteTarget.id}`); setDeleteTarget(null); fetchItems() }
    catch (e: any) { toast.error(e.message) } finally { setDeleting(false) }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <p className="text-xs text-slate-500 font-semibold">Kartu alasan bermitra ditampilkan di bagian "Mengapa Kami" pada halaman kemitraan.</p>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-wellme-secondary-gradient hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border-none"><Plus size={15} />Tambah Kartu</button>
      </div>
      {loading ? <div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wellme-primary" /></div>
        : error ? <p className="text-red-500 text-sm text-center py-8">{error}</p>
        : <div className="flex flex-col gap-3">
          {items.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-start gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full bg-wellme-primary/10 flex items-center justify-center text-wellme-primary font-bold text-xs">{item.sort_order}</div>
              <div className="flex-1">
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-1">{item.title}</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">{item.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusBadge active={item.is_active} />
                <button onClick={() => handleToggle(item)} className={`p-1.5 rounded-lg border-none cursor-pointer ${item.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{item.is_active ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-blue-600 border-none cursor-pointer"><Pencil size={13} /></button>
                <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-red-500 border-none cursor-pointer"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      }

      {dialogOpen && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-5">{editTarget ? 'Edit Kartu' : 'Tambah Kartu Baru'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Judul</label><input type="text" required placeholder="Contoh: Berpengalaman & Terpercaya" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Deskripsi</label><textarea required rows={3} placeholder="Uraikan alasan bermitra..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none resize-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sort Order</label><input type="number" min="1" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 1 })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label><select value={form.is_active ? 'yes' : 'no'} onChange={e => setForm({ ...form, is_active: e.target.value === 'yes' })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"><option value="yes">Aktif</option><option value="no">Nonaktif</option></select></div>
              </div>
              <div className="flex gap-3 pt-2 justify-end">
                <button type="button" onClick={() => setDialogOpen(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer border-none">Batal</button>
                <button type="submit" disabled={saving} className="bg-wellme-secondary-gradient hover:opacity-95 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md border-none cursor-pointer">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteTarget && <DeleteDialog title={deleteTarget.title} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />}
    </div>
  )
}

// ─── Tab: Kolaborasi ──────────────────────────────────────────────────────────

function CollaborationsTab() {
  const [items, setItems] = useState<CollabItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CollabItem | null>(null)
  const [form, setForm] = useState({ title: '', description: '', images: [] as string[], sort_order: 1, is_active: true })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CollabItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.get<CollabItem[]>('/admin/partnership-collaborations')) }
    catch (e: any) { setError(e.message ?? 'Gagal memuat data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openAdd = () => { setEditTarget(null); setForm({ title: '', description: '', images: [], sort_order: items.length + 1, is_active: true }); setDialogOpen(true) }
  const openEdit = (item: CollabItem) => { setEditTarget(item); setForm({ title: item.title, description: item.description, images: item.images ?? [], sort_order: item.sort_order, is_active: item.is_active }); setDialogOpen(true) }

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { const url = await uploadImage('partnership-collaborations', file); setForm(f => ({ ...f, images: [...f.images, url] })) }
    catch (e: any) { toast.error(e.message) } finally { setUploading(false) }
  }

  const removeImage = (idx: number) => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editTarget) await api.patch(`/admin/partnership-collaborations/${editTarget.id}`, form)
      else await api.post('/admin/partnership-collaborations', form)
      setDialogOpen(false); fetchItems()
    } catch (e: any) { toast.error(e.message ?? 'Gagal menyimpan') } finally { setSaving(false) }
  }

  const handleToggle = async (item: CollabItem) => {
    try {
      const updated = await api.patch<CollabItem>(`/admin/partnership-collaborations/${item.id}`, { is_active: !item.is_active })
      setItems(prev => prev.map(x => x.id === item.id ? updated : x))
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true)
    try { await api.delete(`/admin/partnership-collaborations/${deleteTarget.id}`); setDeleteTarget(null); fetchItems() }
    catch (e: any) { toast.error(e.message) } finally { setDeleting(false) }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <p className="text-xs text-slate-500 font-semibold">Tipe kolaborasi ditampilkan di bagian dropdown interaktif pada halaman kemitraan.</p>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-wellme-secondary-gradient hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border-none"><Plus size={15} />Tambah Kolaborasi</button>
      </div>
      {loading ? <div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wellme-primary" /></div>
        : error ? <p className="text-red-500 text-sm text-center py-8">{error}</p>
        : <div className="flex flex-col gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 shrink-0 rounded-full bg-wellme-primary/10 flex items-center justify-center text-wellme-primary font-bold text-xs">{item.sort_order}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{item.title}</h4>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge active={item.is_active} />
                      <button onClick={() => handleToggle(item)} className={`p-1.5 rounded-lg border-none cursor-pointer ${item.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{item.is_active ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-blue-600 border-none cursor-pointer"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-red-500 border-none cursor-pointer"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-3">{item.description}</p>
                  {(item.images ?? []).length > 0 && (
                    <div className="flex gap-2">
                      {(item.images ?? []).map((img, i) => (
                        <div key={i} className="w-20 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                          <img src={resolveUrl(img)} alt={`img-${i}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      }

      {dialogOpen && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-xl my-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-5">{editTarget ? 'Edit Kolaborasi' : 'Tambah Kolaborasi Baru'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Judul</label><input type="text" required placeholder="Contoh: Seminar & Edukasi Parenting" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Deskripsi</label><textarea required rows={3} placeholder="Jelaskan bentuk kolaborasinya..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none resize-none" /></div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Gambar Galeri (maks. 3)</label>
                <div className="flex gap-2 flex-wrap">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative w-20 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] border-none cursor-pointer font-bold">×</button>
                    </div>
                  ))}
                  {form.images.length < 3 && (
                    <>
                      <input type="file" accept="image/*" onChange={handleUploadImage} disabled={uploading} className="hidden" id="collab-img-upload" />
                      <label htmlFor="collab-img-upload" className="w-20 h-16 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 text-xs cursor-pointer hover:border-wellme-primary">
                        {uploading ? '...' : <Plus size={18} />}
                      </label>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sort Order</label><input type="number" min="1" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 1 })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label><select value={form.is_active ? 'yes' : 'no'} onChange={e => setForm({ ...form, is_active: e.target.value === 'yes' })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"><option value="yes">Aktif</option><option value="no">Nonaktif</option></select></div>
              </div>
              <div className="flex gap-3 pt-2 justify-end">
                <button type="button" onClick={() => setDialogOpen(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer border-none">Batal</button>
                <button type="submit" disabled={saving || uploading} className="bg-wellme-secondary-gradient hover:opacity-95 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md border-none cursor-pointer">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteTarget && <DeleteDialog title={deleteTarget.title} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />}
    </div>
  )
}

// ─── Tab: Momen ───────────────────────────────────────────────────────────────

function MomentsTab() {
  const [items, setItems] = useState<MomentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MomentItem | null>(null)
  const [form, setForm] = useState({ title: '', img_url: '', sort_order: 1, is_active: true })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MomentItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.get<MomentItem[]>('/admin/partnership-moments')) }
    catch (e: any) { setError(e.message ?? 'Gagal memuat data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openAdd = () => { setEditTarget(null); setForm({ title: '', img_url: '', sort_order: items.length + 1, is_active: true }); setDialogOpen(true) }
  const openEdit = (item: MomentItem) => { setEditTarget(item); setForm({ title: item.title, img_url: item.img_url, sort_order: item.sort_order, is_active: item.is_active }); setDialogOpen(true) }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { const url = await uploadImage('partnership-moments', file); setForm(f => ({ ...f, img_url: url })) }
    catch (e: any) { toast.error(e.message) } finally { setUploading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editTarget) await api.patch(`/admin/partnership-moments/${editTarget.id}`, form)
      else await api.post('/admin/partnership-moments', form)
      setDialogOpen(false); fetchItems()
    } catch (e: any) { toast.error(e.message ?? 'Gagal menyimpan') } finally { setSaving(false) }
  }

  const handleToggle = async (item: MomentItem) => {
    try {
      const updated = await api.patch<MomentItem>(`/admin/partnership-moments/${item.id}`, { is_active: !item.is_active })
      setItems(prev => prev.map(x => x.id === item.id ? updated : x))
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true)
    try { await api.delete(`/admin/partnership-moments/${deleteTarget.id}`); setDeleteTarget(null); fetchItems() }
    catch (e: any) { toast.error(e.message) } finally { setDeleting(false) }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <p className="text-xs text-slate-500 font-semibold">Foto-foto momen kolaborasi yang ditampilkan di galeri bawah halaman kemitraan.</p>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-wellme-secondary-gradient hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border-none"><Plus size={15} />Tambah Momen</button>
      </div>
      {loading ? <div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wellme-primary" /></div>
        : error ? <p className="text-red-500 text-sm text-center py-8">{error}</p>
        : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm group">
              <div className="relative aspect-video">
                <img src={resolveUrl(item.img_url)} alt={item.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-3 left-3 right-3 text-white text-xs font-bold leading-snug">{item.title}</p>
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold">Order: {item.sort_order}</span>
                  <StatusBadge active={item.is_active} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleToggle(item)} className={`p-1.5 rounded-lg border-none cursor-pointer ${item.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{item.is_active ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-blue-600 border-none cursor-pointer"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-red-500 border-none cursor-pointer"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      }

      {dialogOpen && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-5">{editTarget ? 'Edit Momen' : 'Tambah Momen Baru'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Judul Momen</label><input type="text" required placeholder="Contoh: Skrining Tumbuh Kembang di TK..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none" /></div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Foto</label>
                {form.img_url && <div className="rounded-xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-800"><img src={form.img_url.startsWith('http') ? form.img_url : `http://localhost:3001${form.img_url}`} alt="preview" className="w-full h-full object-cover" /></div>}
                <div className="flex gap-2">
                  <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" id="moment-img-upload" />
                  <label htmlFor="moment-img-upload" className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-3 py-2 rounded-xl text-xs text-center cursor-pointer">{uploading ? 'Mengunggah...' : 'Unggah Foto'}</label>
                </div>
                <input type="text" required placeholder="Atau masukkan URL foto..." value={form.img_url} onChange={e => setForm({ ...form, img_url: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-[10px] font-medium focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sort Order</label><input type="number" min="1" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 1 })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label><select value={form.is_active ? 'yes' : 'no'} onChange={e => setForm({ ...form, is_active: e.target.value === 'yes' })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"><option value="yes">Aktif</option><option value="no">Nonaktif</option></select></div>
              </div>
              <div className="flex gap-3 pt-2 justify-end">
                <button type="button" onClick={() => setDialogOpen(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer border-none">Batal</button>
                <button type="submit" disabled={saving || uploading} className="bg-wellme-secondary-gradient hover:opacity-95 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md border-none cursor-pointer">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteTarget && <DeleteDialog title={deleteTarget.title} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'partners', label: 'Mitra Logos', icon: Handshake },
  { key: 'why-us', label: 'Mengapa Kami', icon: CheckCircle2 },
  { key: 'collaborations', label: 'Kolaborasi', icon: Layers },
  { key: 'moments', label: 'Momen', icon: Images },
] as const

type TabKey = typeof TABS[number]['key']

export default function PartnershipsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('partners')

  return (
    <>
      <Header>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Manajemen Kemitraan</h1>
          <p className="text-xs text-slate-500 mt-1">Kelola seluruh konten halaman kemitraan — logo mitra, alasan bermitra, tipe kolaborasi, dan galeri momen.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto pb-px">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-none cursor-pointer transition-all rounded-t-xl border-b-2 ${
                  active
                    ? 'text-wellme-primary border-wellme-primary bg-wellme-primary/5 dark:bg-wellme-primary/10'
                    : 'text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300 bg-transparent'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'partners' && <PartnersTab />}
        {activeTab === 'why-us' && <WhyUsTab />}
        {activeTab === 'collaborations' && <CollaborationsTab />}
        {activeTab === 'moments' && <MomentsTab />}
      </Main>
    </>
  )
}
