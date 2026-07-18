import React, { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, AlertTriangle, Eye, EyeOff, ExternalLink } from 'lucide-react'

interface Banner {
  id: number;
  image_url: string;
  mobile_image_url?: string;
  href?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:9000'
const LANDING_BASE = import.meta.env.VITE_LANDING_URL ?? 'http://localhost:9001'

function resolveUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/assets/')) return `${LANDING_BASE}${url}`
  return `${API_BASE}${url}`
}

const emptyForm = {
  image_url: '',
  mobile_image_url: '',
  href: '',
  sort_order: 1,
  is_active: true,
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Banner | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [uploading, setUploading] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)
  const [saving, setSaving] = useState(false)

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchBanners = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<Banner[]>('/admin/banners')
      setBanners(data)
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data banner')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
  }, [])

  const handleOpenAdd = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const handleOpenEdit = (banner: Banner) => {
    setEditTarget(banner)
    setForm({
      image_url: banner.image_url,
      mobile_image_url: banner.mobile_image_url || '',
      href: banner.href || '',
      sort_order: banner.sort_order,
      is_active: banner.is_active,
    })
    setDialogOpen(true)
  }

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, isMobile = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (isMobile) {
      setUploadingMobile(true)
    } else {
      setUploading(true)
    }

    try {
      const token = localStorage.getItem('admin_token')
      const formData = new FormData()
      formData.append('image', file)

      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'
      const response = await fetch(`${apiBase}/admin/banners/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Gagal mengunggah gambar banner.')
      }

      const data = await response.json()
      if (isMobile) {
        setForm((prev) => ({ ...prev, mobile_image_url: data.url }))
        toast.success('Gambar banner mobile berhasil diunggah!')
      } else {
        setForm((prev) => ({ ...prev, image_url: data.url }))
        toast.success('Gambar banner desktop berhasil diunggah!')
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Terjadi kesalahan saat mengunggah gambar.')
    } finally {
      if (isMobile) {
        setUploadingMobile(false)
      } else {
        setUploading(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.image_url) {
      toast.warning('Gambar banner wajib diunggah!')
      return
    }

    setSaving(true)
    try {
      if (editTarget) {
        await api.patch(`/admin/banners/${editTarget.id}`, form)
      } else {
        await api.post('/admin/banners', form)
      }
      setDialogOpen(false)
      fetchBanners()
      toast.success(editTarget ? 'Banner berhasil diperbarui!' : 'Banner berhasil ditambahkan!')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menyimpan banner')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (banner: Banner) => {
    try {
      const updated = await api.patch<Banner>(`/admin/banners/${banner.id}`, {
        is_active: !banner.is_active,
      })
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? updated : b))
      )
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memperbarui status banner')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/admin/banners/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchBanners()
      toast.success('Banner berhasil dihapus!')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghapus banner')
    } finally {
      setDeleting(false)
    }
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Manajemen Banner</h1>
            <p className="text-xs text-slate-500 mt-1">
              Kelola slide banner promosi dan pengumuman yang ditampilkan pada beranda/landing page utama.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-wellme-secondary-gradient hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border-none"
          >
            <Plus size={16} />
            Tambah Banner
          </button>
        </div>

        {/* Caution Alert Banner Size */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-3 mb-6 items-start">
          <div className="p-1 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-800 dark:text-amber-300">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">⚠️ CAUTION: Rekomendasi Dimensi Banner</h4>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
              Rasio aspek banner slider yang digunakan saat ini adalah <strong>2.7:1</strong>. Untuk menghindari bagian gambar terpotong atau gepeng di beranda utama, gunakan resolusi gambar seperti <strong>1170x433 piksel</strong> atau <strong>851x315 piksel</strong>.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wellme-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl text-xs font-medium border border-red-100">
            {error}
          </div>
        ) : banners.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-12 text-center flex flex-col items-center justify-center">
            <span className="text-3xl">🖼️</span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-3">Belum Ada Banner</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
              Unggah gambar banner promosi untuk menghias dan mengarahkan pengunjung beranda utama Allia Kids.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map((banner) => (
              <div 
                key={banner.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm flex flex-col group relative"
              >
                {/* Banner Thumbnail (Aspect ratio 2.7:1) */}
                <div className="relative aspect-[2.7/1] w-full bg-slate-100 dark:bg-slate-950 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                  <img 
                    src={resolveUrl(banner.image_url)} 
                    alt="Allia Kids Banner"
                    className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide">
                    URUTAN: {banner.sort_order}
                  </div>
                  <button
                    onClick={() => handleToggleStatus(banner)}
                    className={`absolute top-3 right-3 p-1.5 rounded-lg backdrop-blur-sm transition-all cursor-pointer ${
                      banner.is_active 
                        ? 'bg-emerald-500/95 text-white' 
                        : 'bg-black/60 text-slate-400 hover:text-white'
                    }`}
                    title={banner.is_active ? 'Banner Aktif' : 'Banner Nonaktif'}
                  >
                    {banner.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>

                {/* Banner Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Redireksi / Link</span>
                      {banner.mobile_image_url && (
                        <span className="inline-flex items-center gap-1 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-lg text-[9px] font-extrabold">
                          📱 Mobile Banner
                        </span>
                      )}
                    </div>
                    {banner.href ? (
                      <a 
                        href={banner.href} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-bold text-wellme-primary hover:underline flex items-center gap-1 overflow-hidden truncate"
                      >
                        <span className="truncate">{banner.href}</span>
                        <ExternalLink size={12} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 italic">Hanya Gambar (Tanpa Link)</span>
                    )}
                  </div>

                  <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3.5 mt-4">
                    <button
                      onClick={() => handleOpenEdit(banner)}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                    >
                      <Pencil size={12} />
                      Ubah
                    </button>
                    <button
                      onClick={() => setDeleteTarget(banner)}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 dark:border-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDialogOpen(false)} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 max-w-lg w-full rounded-2xl shadow-xl overflow-hidden animate-zoom-in">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-50">
                  {editTarget ? 'Edit Banner' : 'Tambah Banner Baru'}
                </h3>
                <button
                  onClick={() => setDialogOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Desktop Image Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Gambar Banner Desktop *</label>
                  <div className="border border-dashed border-slate-200 dark:border-slate-750 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center relative min-h-[120px] overflow-hidden">
                    {form.image_url ? (
                      <div className="absolute inset-0 group">
                        <img 
                          src={form.image_url} 
                          alt="Banner Preview" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="bg-white text-slate-900 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer shadow">
                            Ganti Gambar Desktop
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleUploadImage(e, false)} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-xl mb-1">🖥️</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih file gambar banner (Desktop)</span>
                        <label className="mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-black cursor-pointer shadow-sm hover:bg-slate-50">
                          {uploading ? 'Mengunggah...' : 'Pilih File'}
                          <input 
                            type="file" 
                            accept="image/*" 
                            disabled={uploading}
                            onChange={(e) => handleUploadImage(e, false)} 
                            className="hidden" 
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile Image Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Gambar Banner Mobile (Optional - akan fallback ke desktop jika kosong)</label>
                  <div className="border border-dashed border-slate-200 dark:border-slate-750 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center relative min-h-[120px] overflow-hidden">
                    {form.mobile_image_url ? (
                      <div className="absolute inset-0 group">
                        <img 
                          src={form.mobile_image_url} 
                          alt="Mobile Banner Preview" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="bg-white text-slate-900 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer shadow">
                            Ganti Gambar Mobile
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleUploadImage(e, true)} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-xl mb-1">📱</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih file gambar banner (Mobile)</span>
                        <label className="mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-black cursor-pointer shadow-sm hover:bg-slate-50">
                          {uploadingMobile ? 'Mengunggah...' : 'Pilih File'}
                          <input 
                            type="file" 
                            accept="image/*" 
                            disabled={uploadingMobile}
                            onChange={(e) => handleUploadImage(e, true)} 
                            className="hidden" 
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* Redirect Link */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Link Redireksi (Optional)</label>
                  <input
                    type="text"
                    value={form.href}
                    onChange={(e) => setForm((prev) => ({ ...prev, href: e.target.value }))}
                    placeholder="https://wa.me/... atau /apply"
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-wellme-primary dark:bg-slate-950 dark:text-slate-50 focus:outline-none"
                  />
                </div>

                {/* Order & Status Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Urutan Slide (Angka)</label>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 1 }))}
                      min="1"
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-wellme-primary dark:bg-slate-950 dark:text-slate-50 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2 flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-3 select-none">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded border-slate-300 text-wellme-primary focus:ring-wellme-primary"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tampilkan Slider</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setDialogOpen(false)}
                    className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="bg-wellme-secondary-gradient hover:opacity-95 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border-none disabled:opacity-55"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Banner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 max-w-sm w-full rounded-2xl shadow-xl overflow-hidden p-6 animate-zoom-in">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50">Hapus Banner?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus banner ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-55"
                >
                  {deleting ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Main>
    </>
  )
}
