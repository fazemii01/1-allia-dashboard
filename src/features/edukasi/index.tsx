import React, { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, BookOpen, Globe, Archive } from 'lucide-react'
import EdukasiEditor from './editor'

interface EdukasiItem {
  id: string | number
  title: string
  slug: string
  category: 'buku_saku' | 'artikel' | 'galeri'
  description?: string
  cover_url?: string
  file_url?: string
  is_published: boolean
  created_at?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  buku_saku: 'Buku Saku',
  artikel: 'Artikel',
  galeri: 'Galeri',
}

const CATEGORY_COLORS: Record<string, string> = {
  buku_saku: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  artikel: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  galeri: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

function toSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const emptyForm = {
  title: '',
  slug: '',
  category: 'artikel' as EdukasiItem['category'],
  description: '',
  cover_url: '',
  file_url: '',
}

export default function EdukasiPage() {
  const [items, setItems] = useState<EdukasiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'all' | EdukasiItem['category']>('all')

  const [editorOpen, setEditorOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EdukasiItem | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<EdukasiItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchItems = async () => {
    setLoading(true); setError(null)
    try { setItems(await apiFetch<EdukasiItem[]>('/admin/edukasi')) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchItems() }, [])

  const openAdd = () => { setEditTarget(null); setEditorOpen(true) }
  const openEdit = (item: EdukasiItem) => {
    setEditTarget(item)
    setEditorOpen(true)
  }

  const handleTogglePublish = async (item: EdukasiItem) => {
    try {
      if (item.is_published) {
        await apiFetch(`/admin/edukasi/${item.id}`, { method: 'PATCH', body: JSON.stringify({ is_published: false }) })
      } else {
        await apiFetch(`/admin/edukasi/${item.id}/publish`, { method: 'PATCH' })
      }
      fetchItems()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await apiFetch(`/admin/edukasi/${deleteTarget.id}`, { method: 'DELETE' }); setDeleteTarget(null); fetchItems() }
    catch (e: any) { toast.error(e.message) }
    finally { setDeleting(false) }
  }

  const tabs = [
    { key: 'all', label: 'Semua' },
    { key: 'buku_saku', label: 'Buku Saku' },
    { key: 'artikel', label: 'Artikel' },
    { key: 'galeri', label: 'Galeri' },
  ] as const

  const filtered = activeTab === 'all' ? items : items.filter((i) => i.category === activeTab)

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
            <h2 className="text-2xl font-bold tracking-tight">Edukasi Skrining</h2>
            <p className="text-muted-foreground">Kelola konten edukasi: buku saku, artikel, dan galeri.</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-semibold shadow-sm"
          >
            <Plus size={16} /> Tambah Konten
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 text-sm font-medium">{error}</div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase">
                  <th className="p-4">Judul</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Dibuat</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="p-4"><div className="h-4 bg-muted animate-pulse rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-2"><BookOpen size={32} className="opacity-30" />Belum ada data</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-foreground">{item.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">{item.slug}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${CATEGORY_COLORS[item.category] ?? ''}`}>
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                          item.is_published
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400'
                        }`}>
                          {item.is_published ? 'Terbit' : 'Draft'}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex gap-2">
                          <button onClick={() => openEdit(item)} className="p-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleTogglePublish(item)}
                            className={`p-1.5 rounded-md border transition-colors ${
                              item.is_published
                                ? 'border-orange-300/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600'
                                : 'border-green-300/50 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700'
                            }`}
                            title={item.is_published ? 'Arsipkan' : 'Terbitkan'}
                          >
                            {item.is_published ? <Archive size={14} /> : <Globe size={14} />}
                          </button>
                          <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-md border border-destructive/30 hover:bg-destructive/10 text-destructive" title="Hapus">
                            <Trash2 size={14} />
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

      {/* Fullscreen Rich Editor */}
      {editorOpen && (
        <EdukasiEditor
          item={editTarget}
          onClose={(saved) => {
            setEditorOpen(false)
            setEditTarget(null)
            if (saved) fetchItems()
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold">Hapus Konten?</h3>
            <p className="text-sm text-muted-foreground">Hapus <span className="font-semibold text-foreground">{deleteTarget.title}</span>? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted">Batal</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 disabled:opacity-50">
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
