import React, { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LayananCategory {
  id: string | number
  name: string
  slug: string
  icon?: string
  sort_order: number
}

interface Layanan {
  id: string | number
  title: string
  slug: string
  description?: string
  kategori_id?: string | number
  kategori_name?: string
  image_url?: string
  is_active: boolean
  stats?: {
    durasi_sesi?: string
    format_layanan?: string
    mulai_dari?: string
  }
  mengapa_memilih?: string[]
  isu_permasalahan?: string[]
  programs?: any
}

// ─── Slug Helper ──────────────────────────────────────────────────────────────

function toSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── Empty Forms ──────────────────────────────────────────────────────────────

const emptyCatForm = { name: '', slug: '', icon: '', sort_order: 0 }
const emptyLayananForm = {
  title: '',
  slug: '',
  description: '',
  kategori_id: '',
  image_url: '',
  is_active: true,
  stats: { durasi_sesi: '', format_layanan: '', mulai_dari: '' },
  mengapa_memilih: [] as string[],
  isu_permasalahan: [] as string[],
  programs_json: '[]',
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LayananPage() {
  const [tab, setTab] = useState<'kategori' | 'layanan'>('kategori')

  // Kategori state
  const [categories, setCategories] = useState<LayananCategory[]>([])
  const [catLoading, setCatLoading] = useState(true)
  const [catError, setCatError] = useState<string | null>(null)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [catEditTarget, setCatEditTarget] = useState<LayananCategory | null>(null)
  const [catForm, setCatForm] = useState(emptyCatForm)
  const [catSaving, setCatSaving] = useState(false)
  const [catDeleteTarget, setCatDeleteTarget] = useState<LayananCategory | null>(null)

  // Layanan state
  const [layanan, setLayanan] = useState<Layanan[]>([])
  const [layLoading, setLayLoading] = useState(true)
  const [layError, setLayError] = useState<string | null>(null)
  const [layDialogOpen, setLayDialogOpen] = useState(false)
  const [layEditTarget, setLayEditTarget] = useState<Layanan | null>(null)
  const [layForm, setLayForm] = useState(emptyLayananForm)
  const [laySaving, setLaySaving] = useState(false)
  const [layDeleteTarget, setLayDeleteTarget] = useState<Layanan | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchCategories = async () => {
    setCatLoading(true); setCatError(null)
    try { setCategories(await apiFetch<LayananCategory[]>('/admin/layanan-categories')) }
    catch (e: any) { setCatError(e.message) }
    finally { setCatLoading(false) }
  }

  const fetchLayanan = async () => {
    setLayLoading(true); setLayError(null)
    try { setLayanan(await apiFetch<Layanan[]>('/admin/layanan')) }
    catch (e: any) { setLayError(e.message) }
    finally { setLayLoading(false) }
  }

  useEffect(() => { fetchCategories(); fetchLayanan() }, [])

  // ── Kategori CRUD ──────────────────────────────────────────────────────────

  const openCatAdd = () => { setCatEditTarget(null); setCatForm(emptyCatForm); setCatDialogOpen(true) }
  const openCatEdit = (c: LayananCategory) => {
    setCatEditTarget(c)
    setCatForm({ name: c.name, slug: c.slug, icon: c.icon ?? '', sort_order: c.sort_order })
    setCatDialogOpen(true)
  }
  const handleCatSave = async () => {
    setCatSaving(true)
    try {
      if (catEditTarget) {
        await apiFetch(`/admin/layanan-categories/${catEditTarget.id}`, { method: 'PATCH', body: JSON.stringify(catForm) })
      } else {
        await apiFetch('/admin/layanan-categories', { method: 'POST', body: JSON.stringify(catForm) })
      }
      setCatDialogOpen(false); fetchCategories()
    } catch (e: any) { toast.error(e.message) }
    finally { setCatSaving(false) }
  }
  const handleCatDelete = async () => {
    if (!catDeleteTarget) return
    try { await apiFetch(`/admin/layanan-categories/${catDeleteTarget.id}`, { method: 'DELETE' }); setCatDeleteTarget(null); fetchCategories() }
    catch (e: any) { toast.error(e.message) }
  }

  // ── Layanan CRUD ───────────────────────────────────────────────────────────

  const openLayAdd = () => { setLayEditTarget(null); setLayForm(emptyLayananForm); setLayDialogOpen(true) }
  const openLayEdit = (l: Layanan) => {
    setLayEditTarget(l)
    setLayForm({
      title: l.title,
      slug: l.slug,
      description: l.description ?? '',
      kategori_id: l.kategori_id ? String(l.kategori_id) : '',
      image_url: l.image_url ?? '',
      is_active: l.is_active,
      stats: { durasi_sesi: l.stats?.durasi_sesi ?? '', format_layanan: l.stats?.format_layanan ?? '', mulai_dari: l.stats?.mulai_dari ?? '' },
      mengapa_memilih: l.mengapa_memilih ?? [],
      isu_permasalahan: l.isu_permasalahan ?? [],
      programs_json: JSON.stringify(l.programs ?? [], null, 2),
    })
    setLayDialogOpen(true)
  }
  const handleLaySave = async () => {
    setLaySaving(true)
    try {
      const payload = {
        ...layForm,
        programs: (() => { try { return JSON.parse(layForm.programs_json) } catch { return [] } })(),
      }
      if (layEditTarget) {
        await apiFetch(`/admin/layanan/${layEditTarget.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await apiFetch('/admin/layanan', { method: 'POST', body: JSON.stringify(payload) })
      }
      setLayDialogOpen(false); fetchLayanan()
    } catch (e: any) { toast.error(e.message) }
    finally { setLaySaving(false) }
  }
  const handleLayDelete = async () => {
    if (!layDeleteTarget) return
    try { await apiFetch(`/admin/layanan/${layDeleteTarget.id}`, { method: 'DELETE' }); setLayDeleteTarget(null); fetchLayanan() }
    catch (e: any) { toast.error(e.message) }
  }
  const toggleLayananActive = async (l: Layanan) => {
    try {
      await apiFetch(`/admin/layanan/${l.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !l.is_active }) })
      fetchLayanan()
    } catch (e: any) { toast.error(e.message) }
  }

  // ── Dynamic list helpers ───────────────────────────────────────────────────

  const addMengapa = () => setLayForm((f) => ({ ...f, mengapa_memilih: [...f.mengapa_memilih, ''] }))
  const updateMengapa = (i: number, v: string) => setLayForm((f) => { const a = [...f.mengapa_memilih]; a[i] = v; return { ...f, mengapa_memilih: a } })
  const removeMengapa = (i: number) => setLayForm((f) => ({ ...f, mengapa_memilih: f.mengapa_memilih.filter((_, idx) => idx !== i) }))
  const addIsu = () => setLayForm((f) => ({ ...f, isu_permasalahan: [...f.isu_permasalahan, ''] }))
  const updateIsu = (i: number, v: string) => setLayForm((f) => { const a = [...f.isu_permasalahan]; a[i] = v; return { ...f, isu_permasalahan: a } })
  const removeIsu = (i: number) => setLayForm((f) => ({ ...f, isu_permasalahan: f.isu_permasalahan.filter((_, idx) => idx !== i) }))

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header fixed>
        <div className="flex flex-1 items-center gap-2" />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className="flex flex-1 flex-col gap-4 sm:gap-6 pt-20">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Layanan & Kategori</h2>
          <p className="text-muted-foreground">Kelola kategori dan halaman layanan Allia Kids.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(['kategori', 'layanan'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'kategori' ? 'Kategori' : 'Layanan'}
            </button>
          ))}
        </div>

        {/* ── KATEGORI TAB ── */}
        {tab === 'kategori' && (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{categories.length} kategori tersedia</p>
              <button onClick={openCatAdd} className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-semibold shadow-sm">
                <Plus size={16} /> Tambah Kategori
              </button>
            </div>
            {catError && <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 text-sm">{catError}</div>}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase">
                  <th className="p-4">Nama</th><th className="p-4">Slug</th><th className="p-4">Icon</th><th className="p-4">Sort</th><th className="p-4 text-right">Aksi</th>
                </tr></thead>
                <tbody className="divide-y divide-border text-sm">
                  {catLoading ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="p-4"><div className="h-4 bg-muted animate-pulse rounded w-3/4" /></td>)}</tr>
                  )) : categories.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-muted-foreground font-semibold">Belum ada data</td></tr>
                  ) : categories.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-semibold text-foreground">{c.name}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">{c.slug}</td>
                      <td className="p-4 text-muted-foreground">{c.icon || '—'}</td>
                      <td className="p-4 text-muted-foreground">{c.sort_order}</td>
                      <td className="p-4 text-right">
                        <div className="inline-flex gap-2">
                          <button onClick={() => openCatEdit(c)} className="p-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground"><Pencil size={14} /></button>
                          <button onClick={() => setCatDeleteTarget(c)} className="p-1.5 rounded-md border border-destructive/30 hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── LAYANAN TAB ── */}
        {tab === 'layanan' && (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{layanan.length} layanan tersedia</p>
              <button onClick={openLayAdd} className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-semibold shadow-sm">
                <Plus size={16} /> Tambah Layanan
              </button>
            </div>
            {layError && <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 text-sm">{layError}</div>}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase">
                  <th className="p-4">Judul</th><th className="p-4">Kategori</th><th className="p-4">Slug</th><th className="p-4">Aktif</th><th className="p-4 text-right">Aksi</th>
                </tr></thead>
                <tbody className="divide-y divide-border text-sm">
                  {layLoading ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="p-4"><div className="h-4 bg-muted animate-pulse rounded w-3/4" /></td>)}</tr>
                  )) : layanan.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-2"><Package size={32} className="opacity-30" />Belum ada data layanan</div>
                    </td></tr>
                  ) : layanan.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-semibold text-foreground">{l.title}</td>
                      <td className="p-4">
                        {(l.kategori_name ?? categories.find((c) => c.id === l.kategori_id)?.name) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                            {l.kategori_name ?? categories.find((c) => c.id === l.kategori_id)?.name}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">{l.slug}</td>
                      <td className="p-4">
                        <button
                          onClick={() => toggleLayananActive(l)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${l.is_active ? 'bg-primary' : 'bg-muted'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${l.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex gap-2">
                          <button onClick={() => openLayEdit(l)} className="p-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground"><Pencil size={14} /></button>
                          <button onClick={() => setLayDeleteTarget(l)} className="p-1.5 rounded-md border border-destructive/30 hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Main>

      {/* ── Kategori Dialog ── */}
      {catDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCatDialogOpen(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-5">
            <h3 className="text-lg font-bold">{catEditTarget ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Nama</label>
                <input value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))}
                  placeholder="Nama kategori" className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Slug</label>
                <input value={catForm.slug} onChange={(e) => setCatForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="slug-kategori" className="bg-background border border-input rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Icon</label>
                <input value={catForm.icon} onChange={(e) => setCatForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="Misal: 🧠 atau nama icon" className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Sort Order</label>
                <input type="number" value={catForm.sort_order} onChange={(e) => setCatForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setCatDialogOpen(false)} className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted">Batal</button>
              <button onClick={handleCatSave} disabled={catSaving || !catForm.name} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                {catSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Kategori Delete Confirm ── */}
      {catDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCatDeleteTarget(null)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold">Hapus Kategori?</h3>
            <p className="text-sm text-muted-foreground">Hapus kategori <span className="font-semibold text-foreground">{catDeleteTarget.name}</span>?</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setCatDeleteTarget(null)} className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted">Batal</button>
              <button onClick={handleCatDelete} className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Layanan Dialog ── */}
      {layDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLayDialogOpen(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-xl mx-4 p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">{layEditTarget ? 'Edit Layanan' : 'Tambah Layanan'}</h3>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Judul</label>
                  <input value={layForm.title} onChange={(e) => setLayForm((f) => ({ ...f, title: e.target.value, slug: toSlug(e.target.value) }))}
                    placeholder="Nama layanan" className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Slug</label>
                  <input value={layForm.slug} onChange={(e) => setLayForm((f) => ({ ...f, slug: e.target.value }))}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Deskripsi</label>
                <textarea value={layForm.description} onChange={(e) => setLayForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3} className="bg-background border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Kategori</label>
                  <select value={layForm.kategori_id} onChange={(e) => setLayForm((f) => ({ ...f, kategori_id: e.target.value }))}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary">
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">URL Gambar</label>
                  <input value={layForm.image_url} onChange={(e) => setLayForm((f) => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://..." className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              {/* Stats */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Statistik Layanan</label>
                <div className="grid grid-cols-3 gap-2">
                  <input value={layForm.stats.durasi_sesi} onChange={(e) => setLayForm((f) => ({ ...f, stats: { ...f.stats, durasi_sesi: e.target.value } }))}
                    placeholder="Durasi Sesi" className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <input value={layForm.stats.format_layanan} onChange={(e) => setLayForm((f) => ({ ...f, stats: { ...f.stats, format_layanan: e.target.value } }))}
                    placeholder="Format Layanan" className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <input value={layForm.stats.mulai_dari} onChange={(e) => setLayForm((f) => ({ ...f, stats: { ...f.stats, mulai_dari: e.target.value } }))}
                    placeholder="Mulai Dari" className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              {/* Mengapa Memilih */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Mengapa Memilih</label>
                {layForm.mengapa_memilih.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={v} onChange={(e) => updateMengapa(i, e.target.value)} placeholder={`Alasan ${i + 1}`}
                      className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                    <button onClick={() => removeMengapa(i)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                  </div>
                ))}
                <button onClick={addMengapa} className="text-xs font-semibold text-primary hover:text-primary/80 self-start">+ Tambah Alasan</button>
              </div>
              {/* Isu Permasalahan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Isu Permasalahan</label>
                {layForm.isu_permasalahan.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={v} onChange={(e) => updateIsu(i, e.target.value)} placeholder={`Tag ${i + 1}`}
                      className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                    <button onClick={() => removeIsu(i)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                  </div>
                ))}
                <button onClick={addIsu} className="text-xs font-semibold text-primary hover:text-primary/80 self-start">+ Tambah Isu</button>
              </div>
              {/* Programs JSON */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Programs (JSON)</label>
                <textarea value={layForm.programs_json} onChange={(e) => setLayForm((f) => ({ ...f, programs_json: e.target.value }))}
                  rows={4} className="bg-background border border-input rounded-md px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:border-primary" />
              </div>
              {/* is_active */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Status Aktif</label>
                <button type="button" onClick={() => setLayForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${layForm.is_active ? 'bg-primary' : 'bg-muted'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${layForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setLayDialogOpen(false)} className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted">Batal</button>
              <button onClick={handleLaySave} disabled={laySaving || !layForm.title} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                {laySaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Layanan Delete Confirm ── */}
      {layDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLayDeleteTarget(null)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold">Hapus Layanan?</h3>
            <p className="text-sm text-muted-foreground">Hapus layanan <span className="font-semibold text-foreground">{layDeleteTarget.title}</span>?</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setLayDeleteTarget(null)} className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted">Batal</button>
              <button onClick={handleLayDelete} className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
