import React, { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, UserCog } from 'lucide-react'

interface Therapist {
  id: string | number
  name: string
  specialization: string
  phone: string
  bio?: string
  photo_url?: string
  is_active: boolean
}

const emptyForm: Omit<Therapist, 'id'> = {
  name: '',
  specialization: '',
  phone: '',
  bio: '',
  photo_url: '',
  is_active: true,
}

function resolveUrl(url: string | undefined): string {
  if (!url) return ''
  return url
    .replace('http://194.233.91.132:19000', 'https://storage.alliago.id')
    .replace('http://storage.alliago.id', 'https://storage.alliago.id')
}

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Therapist | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const formData = new FormData()
      formData.append('image', file)

      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'
      const response = await fetch(`${apiBase}/admin/therapists/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Gagal mengunggah foto terapis.')
      }

      const data = await response.json()
      setForm((prev) => ({ ...prev, photo_url: data.url }))
      toast.success('Foto terapis berhasil diunggah!')
    } catch (e: any) {
      toast.error(e.message ?? 'Terjadi kesalahan saat mengunggah foto.')
    } finally {
      setUploading(false)
    }
  }

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Therapist | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTherapists = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Therapist[]>('/admin/therapists')
      setTherapists(data)
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data terapis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTherapists()
  }, [])

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (t: Therapist) => {
    setEditTarget(t)
    setForm({
      name: t.name,
      specialization: t.specialization,
      phone: t.phone,
      bio: t.bio ?? '',
      photo_url: t.photo_url ?? '',
      is_active: t.is_active,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editTarget) {
        await apiFetch(`/admin/therapists/${editTarget.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        })
      } else {
        await apiFetch('/admin/therapists', {
          method: 'POST',
          body: JSON.stringify(form),
        })
      }
      setDialogOpen(false)
      fetchTherapists()
      toast.success(editTarget ? 'Data terapis berhasil diperbarui!' : 'Terapis baru berhasil ditambahkan!')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiFetch(`/admin/therapists/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchTherapists()
      toast.success('Terapis berhasil dihapus!')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghapus data')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header fixed>
        <div className="flex flex-1 items-center gap-2" />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className="flex flex-1 flex-col gap-4 sm:gap-6 pt-20">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Manajemen Terapis</h2>
            <p className="text-muted-foreground">Kelola data terapis yang aktif di Allia Kids.</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-semibold shadow-sm"
          >
            <Plus size={16} /> Tambah Terapis
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border text-xs font-bold text-muted-foreground uppercase">
                  <th className="p-4">Nama</th>
                  <th className="p-4">Spesialisasi</th>
                  <th className="p-4">Telepon</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="p-4">
                          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : therapists.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-2">
                        <UserCog size={32} className="opacity-30" />
                        Belum ada data terapis
                      </div>
                    </td>
                  </tr>
                ) : (
                  therapists.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {t.photo_url ? (
                            <img src={resolveUrl(t.photo_url)} alt={t.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {t.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-semibold text-foreground">{t.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{t.specialization || '—'}</td>
                      <td className="p-4 text-muted-foreground">{t.phone || '—'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                            t.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400'
                          }`}
                        >
                          {t.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(t)}
                            className="p-1.5 rounded-md border border-destructive/30 hover:bg-destructive/10 text-destructive transition-colors"
                            title="Hapus"
                          >
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

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDialogOpen(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold">{editTarget ? 'Edit Terapis' : 'Tambah Terapis'}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Isi informasi terapis di bawah ini.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Nama <span className="text-destructive">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nama lengkap terapis"
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Spesialisasi</label>
                <input
                  value={form.specialization}
                  onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
                  placeholder="Misal: Terapi Wicara, Hipoterapi"
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Telepon</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Deskripsi singkat terapis..."
                  rows={3}
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Foto Terapis</label>
                <div className="flex items-center gap-4">
                  {form.photo_url && (
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
                      <img src={resolveUrl(form.photo_url)} alt="Pratinjau Foto" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="flex flex-col items-center justify-center border border-dashed border-input rounded-md p-3 hover:bg-accent/50 cursor-pointer transition-all text-center">
                      <span className="text-xs text-muted-foreground font-medium">
                        {uploading ? 'Mengunggah...' : 'Klik untuk Pilih & Unggah Foto'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        onChange={handleUploadImage}
                        className="hidden"
                      />
                    </label>
                    {form.photo_url && (
                      <span className="text-[10px] text-muted-foreground mt-1 block truncate max-w-[250px]">
                        {form.photo_url}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Status Aktif</label>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    form.is_active ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold">Hapus Terapis</h3>
            <p className="text-sm text-muted-foreground">
              Apakah kamu yakin ingin menghapus <span className="font-semibold text-foreground">{deleteTarget.name}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
