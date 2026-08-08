import React, { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, AlertTriangle, Eye, EyeOff, ExternalLink, Sparkles, Layers, Sliders, Upload, X, Monitor, Smartphone, Image as ImageIcon, Clock, Info } from 'lucide-react'
import { SimplePagination } from '@/components/simple-pagination'

interface Banner {
  id: number;
  type?: string; // 'hero' | 'popup'
  title?: string;
  popup_delay?: number;
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
  const normalized = url
    .replace('http://194.233.91.132:19000', 'https://storage.alliago.id')
    .replace('http://storage.alliago.id', 'https://storage.alliago.id')
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized
  if (normalized.startsWith('/assets/')) return `${LANDING_BASE}${normalized}`
  return `${API_BASE}${normalized}`
}

const emptyForm = {
  type: 'hero',
  title: '',
  popup_delay: 3,
  image_url: '',
  mobile_image_url: '',
  href: '',
  sort_order: 1,
  is_active: true,
}

export default function BannersPage() {
  const [activeTab, setActiveTab] = useState<'hero' | 'popup'>('hero')
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  const filteredBanners = banners.filter((b) => {
    if (activeTab === 'popup') return b.type === 'popup'
    return (b.type || 'hero') === 'hero'
  })

  const handleOpenAdd = () => {
    setEditTarget(null)
    setForm({
      ...emptyForm,
      type: activeTab,
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (banner: Banner) => {
    setEditTarget(banner)
    setForm({
      type: banner.type || 'hero',
      title: banner.title || '',
      popup_delay: banner.popup_delay ?? 3,
      image_url: banner.image_url || '',
      mobile_image_url: banner.mobile_image_url || '',
      href: banner.href || '',
      sort_order: banner.sort_order || 1,
      is_active: banner.is_active ?? true,
    })
    setDialogOpen(true)
  }

  const processFileUpload = async (file: File, isMobile = false) => {
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
        throw new Error('Gagal mengunggah gambar banner ke MinIO.')
      }

      const data = await response.json()
      if (isMobile) {
        setForm((prev) => ({ ...prev, mobile_image_url: data.url }))
        toast.success('Gambar banner mobile berhasil diunggah ke MinIO!')
      } else {
        setForm((prev) => ({ ...prev, image_url: data.url }))
        toast.success('Gambar banner desktop berhasil diunggah ke MinIO!')
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Terjadi kesalahan saat mengunggah gambar ke MinIO.')
    } finally {
      if (isMobile) {
        setUploadingMobile(false)
      } else {
        setUploading(false)
      }
    }
  }

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, isMobile = false) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFileUpload(file, isMobile)
    }
  }

  const handleDropImage = async (e: React.DragEvent<HTMLDivElement>, isMobile = false) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processFileUpload(file, isMobile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalForm = { ...form }
    // Fallback logic
    if (!finalForm.image_url && finalForm.mobile_image_url) {
      finalForm.image_url = finalForm.mobile_image_url
    }

    if (!finalForm.image_url) {
      toast.warning('Gambar banner desktop/landscape wajib diisi atau diunggah!')
      return
    }

    setSaving(true)
    try {
      if (editTarget) {
        await api.patch(`/admin/banners/${editTarget.id}`, finalForm)
      } else {
        await api.post('/admin/banners', finalForm)
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Manajemen Banner</h1>
            <p className="text-xs text-slate-500 mt-1">
              Kelola slider banner utama dan pop-up banner promosi yang tampil saat pengunjung membuka beranda.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-wellme-secondary-gradient hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border-none"
          >
            <Plus size={16} />
            {activeTab === 'popup' ? 'Tambah Banner Pop Up' : 'Tambah Banner Slider'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2">
          <button
            onClick={() => { setActiveTab('hero'); setCurrentPage(1); }}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'hero'
                ? 'border-wellme-primary text-wellme-primary dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers size={16} />
            Slider Banner Hero
          </button>
          <button
            onClick={() => { setActiveTab('popup'); setCurrentPage(1); }}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'popup'
                ? 'border-wellme-primary text-wellme-primary dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles size={16} className="text-amber-500" />
            Banner Pop Up
            <span className="ml-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] rounded-full font-black">
              {banners.filter(b => b.type === 'popup').length}
            </span>
          </button>
        </div>

        {/* Caution Alert */}
        {activeTab === 'hero' ? (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-3 mb-6 items-start">
            <div className="p-1 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-800 dark:text-amber-300">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-600" /> REKOMENDASI DIMENSI SLIDER HERO
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                Rasio aspek banner slider yang digunakan adalah <strong>2.7:1</strong>. Gunakan resolusi <strong>1170x433 piksel</strong> atau <strong>851x315 piksel</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 flex gap-3 mb-6 items-start">
            <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-800 dark:text-blue-300">
              <Sparkles size={18} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <Info size={14} className="text-blue-600" /> BANNER POP UP OTOMATIS (RESPONSIVE DESKTOP & MOBILE)
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                Pengunjung akan langsung melihat pop-up banner ini setiap kali membuka beranda utama. Anda dapat mengunggah 2 tipe gambar: <strong>Landscape (Desktop)</strong> dan <strong>Portrait/Square (Mobile)</strong>. Jika ada lebih dari 1 pop-up aktif, sistem akan menampikannya dalam animasi carousel bergantian.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wellme-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl text-xs font-medium border border-red-100">
            {error}
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-12 text-center flex flex-col items-center justify-center">
            {activeTab === 'popup' ? <Sparkles className="size-8 text-amber-500 mb-2" /> : <ImageIcon className="size-8 text-slate-400 mb-2" />}
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
              {activeTab === 'popup' ? 'Belum Ada Pop-Up Banner' : 'Belum Ada Slider Banner'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
              {activeTab === 'popup' 
                ? 'Klik "+ Tambah Banner Pop Up" untuk menambahkan pop-up penawaran spesial di beranda.'
                : 'Unggah gambar banner promosi untuk menghias slider beranda utama Allia Kids.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBanners
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((banner) => (
                <div 
                  key={banner.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm flex flex-col group relative"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-950 overflow-hidden border-b border-slate-100 dark:border-slate-800 flex">
                    {/* Desktop View Preview */}
                    <div className="flex-1 relative border-r border-slate-200/40">
                      <img 
                        src={resolveUrl(banner.image_url)} 
                        alt="Desktop Banner"
                        className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
                      />
                      <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Monitor size={10} /> Desktop
                      </span>
                    </div>

                    {/* Mobile View Preview if present */}
                    {banner.mobile_image_url && (
                      <div className="w-1/3 relative bg-slate-900">
                        <img 
                          src={resolveUrl(banner.mobile_image_url)} 
                          alt="Mobile Banner"
                          className="w-full h-full object-cover object-center"
                        />
                        <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Smartphone size={10} /> Mobile
                        </span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide">
                      {banner.title || `URUTAN: ${banner.sort_order}`}
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
                      {banner.type === 'popup' && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock size={10} /> Delay: {banner.popup_delay || 3} dtk
                          </span>
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            Pop-Up Modal
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Redireksi / Link</span>
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
            <SimplePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredBanners.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}

        {/* Add/Edit Modal (Matching screenshot media_1786020138971 for Popup Banners) */}
        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setDialogOpen(false)} />
            <div className={`relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 w-full max-h-[90vh] flex flex-col ${form.type === 'popup' ? 'max-w-4xl' : 'max-w-lg'}`}>
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  {form.type === 'popup' ? <Sparkles className="h-5 w-5 text-amber-500" /> : <Layers className="h-5 w-5 text-blue-500" />}
                  {editTarget 
                    ? (form.type === 'popup' ? 'Ubah Popup Banner' : 'Edit Banner Slider') 
                    : (form.type === 'popup' ? 'Tambah Popup Banner' : 'Tambah Banner Slider')}
                </h3>
                <button
                  onClick={() => setDialogOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                {form.type === 'popup' ? (
                  /* Popup Banner 2-Column Layout matching screenshot */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: General Configuration */}
                    <div className="lg:col-span-4 bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-5">
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
                        General Configuration
                      </h4>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Campaign / Banner Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.title}
                          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g. Promo Sesi Terapi Hipno"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Popup Delay (Seconds) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="60"
                          value={form.popup_delay}
                          onChange={(e) => setForm((prev) => ({ ...prev, popup_delay: parseInt(e.target.value) || 3 }))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Toggle Activate Popup */}
                      <div className="pt-2">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 relative"></div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Activate Popup</span>
                        </label>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Redirect Link (On Click)
                        </label>
                        <input
                          type="text"
                          value={form.href}
                          onChange={(e) => setForm((prev) => ({ ...prev, href: e.target.value }))}
                          placeholder="https://wa.me/+6281334455616 atau /apply"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Right Column: Desktop & Mobile Banner Upload Cards */}
                    <div className="lg:col-span-8 space-y-5">
                      
                      {/* Desktop Banner Box */}
                      <div className="bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                            Desktop Banner (Landscape)
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Horizontal aspect ratio suggested for desktop users.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Desktop Image File</label>
                          <div 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropImage(e, false)}
                            className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center bg-white dark:bg-slate-900 flex flex-col items-center justify-center relative min-h-[100px]"
                          >
                            {form.image_url ? (
                              <div className="w-full flex items-center justify-between gap-3">
                                <img src={resolveUrl(form.image_url)} alt="Desktop" className="h-16 w-auto max-w-[200px] object-cover rounded-lg border" />
                                <div className="flex gap-2">
                                  <label className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">
                                    Ganti File
                                    <input type="file" accept="image/*" onChange={(e) => handleUploadImage(e, false)} className="hidden" />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-xs font-medium text-slate-500">
                                  Seret & Jatuhkan berkas Anda atau <label className="text-amber-600 font-bold cursor-pointer hover:underline">Jelajahi<input type="file" accept="image/*" onChange={(e) => handleUploadImage(e, false)} className="hidden" /></label>
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">External Desktop Image URL</label>
                          <input
                            type="text"
                            value={form.image_url}
                            onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                            placeholder="https://example.com/desktop-banner.jpg"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Mobile Banner Box */}
                      <div className="bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                            Mobile Banner (Portrait/Square)
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Vertical or square aspect ratio suggested for mobile screens.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Mobile Image File</label>
                          <div 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropImage(e, true)}
                            className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center bg-white dark:bg-slate-900 flex flex-col items-center justify-center relative min-h-[100px]"
                          >
                            {form.mobile_image_url ? (
                              <div className="w-full flex items-center justify-between gap-3">
                                <img src={resolveUrl(form.mobile_image_url)} alt="Mobile" className="h-16 w-auto max-w-[120px] object-cover rounded-lg border" />
                                <div className="flex gap-2">
                                  <label className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">
                                    Ganti File
                                    <input type="file" accept="image/*" onChange={(e) => handleUploadImage(e, true)} className="hidden" />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-xs font-medium text-slate-500">
                                  Seret & Jatuhkan berkas Anda atau <label className="text-amber-600 font-bold cursor-pointer hover:underline">Jelajahi<input type="file" accept="image/*" onChange={(e) => handleUploadImage(e, true)} className="hidden" /></label>
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">External Mobile Image URL</label>
                          <input
                            type="text"
                            value={form.mobile_image_url}
                            onChange={(e) => setForm((prev) => ({ ...prev, mobile_image_url: e.target.value }))}
                            placeholder="https://example.com/mobile-banner.jpg"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  /* Standard Hero Banner Modal Form */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Gambar Banner Desktop *</label>
                      <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center relative min-h-[120px] overflow-hidden">
                        {form.image_url ? (
                          <div className="absolute inset-0 group">
                            <img src={resolveUrl(form.image_url)} alt="Banner Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <label className="bg-white text-slate-900 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer shadow">
                                Ganti Gambar Desktop
                                <input type="file" accept="image/*" onChange={(e) => handleUploadImage(e, false)} className="hidden" />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Monitor className="size-6 text-slate-400 mb-1" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih file gambar banner (Desktop)</span>
                            <label className="mt-2 bg-white dark:bg-slate-800 border border-slate-200 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-black cursor-pointer shadow-sm hover:bg-slate-50">
                              {uploading ? 'Mengunggah...' : 'Pilih File'}
                              <input type="file" accept="image/*" disabled={uploading} onChange={(e) => handleUploadImage(e, false)} className="hidden" />
                            </label>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Gambar Banner Mobile (Optional)</label>
                      <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center relative min-h-[120px] overflow-hidden">
                        {form.mobile_image_url ? (
                          <div className="absolute inset-0 group">
                            <img src={resolveUrl(form.mobile_image_url)} alt="Mobile Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <label className="bg-white text-slate-900 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer shadow">
                                Ganti Gambar Mobile
                                <input type="file" accept="image/*" onChange={(e) => handleUploadImage(e, true)} className="hidden" />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Smartphone className="size-6 text-slate-400 mb-1" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih file gambar banner (Mobile)</span>
                            <label className="mt-2 bg-white dark:bg-slate-800 border border-slate-200 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-black cursor-pointer shadow-sm hover:bg-slate-50">
                              {uploadingMobile ? 'Mengunggah...' : 'Pilih File'}
                              <input type="file" accept="image/*" disabled={uploadingMobile} onChange={(e) => handleUploadImage(e, true)} className="hidden" />
                            </label>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Link Redireksi (Optional)</label>
                      <input
                        type="text"
                        value={form.href}
                        onChange={(e) => setForm((prev) => ({ ...prev, href: e.target.value }))}
                        placeholder="https://wa.me/..."
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-wellme-primary dark:bg-slate-950 dark:text-slate-50 focus:outline-none"
                      />
                    </div>

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
                  </div>
                )}

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
