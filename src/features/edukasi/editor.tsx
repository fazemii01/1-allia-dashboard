import React, { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown,
  Type, Heading2, Image as ImageIcon, Quote, Loader2,
  UploadCloud, Send, X, GripVertical, Eye, EyeOff, BookOpen, FileText, Camera
} from 'lucide-react'
import { toast } from 'sonner'

export interface EdukasiItem {
  id?: string | number
  title: string
  slug: string
  category: 'buku_saku' | 'artikel' | 'galeri'
  description?: string
  cover_url?: string
  file_url?: string
  is_published?: boolean
}

export interface ArticleBlock {
  type: 'paragraph' | 'heading' | 'image' | 'quote'
  text?: string
  content?: string // alias for compatibility
  src?: string
  alt?: string
  caption?: string
}

export interface GalleryPhoto {
  src: string
  alt?: string
  caption?: string
}

interface Props {
  item: EdukasiItem | null
  onClose: (saved?: boolean) => void
}

const CATEGORIES = [
  { value: 'artikel', label: 'Artikel & Edukasi' },
  { value: 'galeri', label: 'Galeri Foto' },
  { value: 'buku_saku', label: 'Buku Saku (PDF)' },
]

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function EdukasiEditor({ item, onClose }: Props) {
  const isEditing = !!item
  const BASE_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'
  const BASE_IMAGE_URL = BASE_API.replace('/api', '')

  // Metadata
  const [title, setTitle] = useState(item?.title || '')
  const [slug, setSlug] = useState(item?.slug || '')
  const [category, setCategory] = useState<EdukasiItem['category']>(item?.category || 'artikel')
  const [coverUrl, setCoverUrl] = useState(item?.cover_url || '')
  const [fileUrl, setFileUrl] = useState(item?.file_url || '')

  // Content for pocket book (plain text) or Article blocks or Gallery photos
  const [plainDesc, setPlainDesc] = useState(() => {
    if (item && item.category === 'buku_saku') {
      return item.description || ''
    }
    return ''
  })

  const [blocks, setBlocks] = useState<ArticleBlock[]>(() => {
    if (item && item.category === 'artikel' && item.description) {
      try {
        const parsed = JSON.parse(item.description)
        if (Array.isArray(parsed)) {
          // Normalize text/content fields
          return parsed.map((b: any) => ({
            ...b,
            text: b.text || b.content || '',
            content: b.content || b.text || '',
          }))
        }
      } catch (e) {
        console.warn('Failed to parse article blocks, defaulting to flat text', e)
      }
    }
    return [{ type: 'paragraph', text: '', content: '' }]
  })

  const [photos, setPhotos] = useState<GalleryPhoto[]>(() => {
    if (item && item.category === 'galeri' && item.description) {
      try {
        const parsed = JSON.parse(item.description)
        if (Array.isArray(parsed)) return parsed
      } catch (e) {
        console.warn('Failed to parse gallery photos', e)
      }
    }
    return []
  })

  // UI state
  const [showPreview, setShowPreview] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingBlockIdx, setUploadingBlockIdx] = useState<number | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const coverInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Auto-generate slug from title
  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!isEditing) setSlug(toSlug(val))
  }

  // ── Block Management ──
  const addBlock = (type: ArticleBlock['type']) => {
    const newBlock: ArticleBlock = { type }
    if (type === 'paragraph' || type === 'heading' || type === 'quote') {
      newBlock.text = ''
      newBlock.content = ''
    } else if (type === 'image') {
      newBlock.src = ''
      newBlock.alt = ''
      newBlock.caption = ''
    }
    setBlocks([...blocks, newBlock])
  }

  const updateBlock = (idx: number, updates: Partial<ArticleBlock>) => {
    setBlocks(
      blocks.map((b, i) => {
        if (i === idx) {
          const merged = { ...b, ...updates }
          if (updates.text !== undefined) {
            merged.content = updates.text
          } else if (updates.content !== undefined) {
            merged.text = updates.content
          }
          return merged
        }
        return b
      })
    )
  }

  const removeBlock = (idx: number) => {
    if (blocks.length === 1) return
    setBlocks(blocks.filter((_, i) => i !== idx))
  }

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir
    if (targetIdx < 0 || targetIdx >= blocks.length) return
    const updated = [...blocks]
    ;[updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]]
    setBlocks(updated)
  }

  // ── Upload Handlers ──
  const handleUploadImage = async (file: File): Promise<string> => {
    const token = localStorage.getItem('admin_token')
    const fd = new FormData()
    fd.append('image', file)

    const res = await fetch(`${BASE_API}/admin/edukasi/upload-image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: fd,
    })

    if (!res.ok) throw new Error('Unggah gambar gagal')
    const data = await res.json()
    // Make sure it returns absolute image path or fully qualified domain
    return data.url.startsWith('http') ? data.url : `${BASE_IMAGE_URL}${data.url}`
  }

  const handleBlockImageUpload = async (idx: number, file: File) => {
    setUploadingBlockIdx(idx)
    try {
      const url = await handleUploadImage(file)
      updateBlock(idx, { src: url, alt: file.name })
      toast.success('Gambar terunggah!')
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengunggah gambar')
    } finally {
      setUploadingBlockIdx(null)
    }
  }

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const url = await handleUploadImage(file)
      setCoverUrl(url)
      toast.success('Cover terunggah!')
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengunggah cover')
    } finally {
      setUploadingCover(false)
    }
  }

  const handlePhotosSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingPhotos(true)
    try {
      const uploaded: GalleryPhoto[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const url = await handleUploadImage(file)
        uploaded.push({ src: url, alt: file.name.replace(/\.[^.]+$/, ''), caption: '' })
      }
      setPhotos((prev) => [...prev, ...uploaded])
      toast.success(`${files.length} foto berhasil ditambahkan!`)
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengunggah foto-foto')
    } finally {
      setUploadingPhotos(false)
    }
  }

  // ── Drag Reorder for Photos ──
  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const reordered = [...photos]
    const [dragged] = reordered.splice(dragIdx, 1)
    reordered.splice(idx, 0, dragged)
    setPhotos(reordered)
    setDragIdx(idx)
  }
  const handleDragEnd = () => setDragIdx(null)

  // ── Save handler ──
  const handleSave = async (publishState?: boolean) => {
    if (!title.trim()) {
      toast.error('Judul wajib diisi')
      return
    }
    if (!slug.trim()) {
      toast.error('Slug wajib diisi')
      return
    }

    setIsSubmitting(true)

    // Prepare description depending on category
    let finalDescription = ''
    if (category === 'artikel') {
      finalDescription = JSON.stringify(blocks)
    } else if (category === 'galeri') {
      finalDescription = JSON.stringify(photos)
    } else {
      finalDescription = plainDesc
    }

    const payload = {
      title,
      slug,
      category,
      description: finalDescription,
      cover_url: coverUrl,
      file_url: category === 'buku_saku' ? fileUrl : undefined,
      is_published: publishState !== undefined ? publishState : item?.is_published ?? false,
    }

    try {
      const token = localStorage.getItem('admin_token')
      const url = isEditing ? `${BASE_API}/admin/edukasi/${item!.id}` : `${BASE_API}/admin/edukasi`
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Gagal menyimpan data edukasi')
      toast.success(publishState ? 'Konten berhasil diterbitkan!' : 'Draft berhasil disimpan!')
      onClose(true)
    } catch (e: any) {
      toast.error(e.message || 'Error menyimpan konten')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Block type styles ──
  const blockMeta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    paragraph: { label: 'Paragraf', icon: <Type size={14} />, color: 'bg-muted text-foreground' },
    heading: { label: 'Sub-Judul', icon: <Heading2 size={14} />, color: 'bg-primary/10 text-primary' },
    image: { label: 'Gambar', icon: <ImageIcon size={14} />, color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400' },
    quote: { label: 'Kutipan', icon: <Quote size={14} />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400' },
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden text-foreground">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onClose()}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold text-lg leading-tight">
              {isEditing ? 'Edit Konten' : 'Buat Konten Baru'}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">{slug || 'belum-ada-slug'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {category === 'artikel' && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showPreview ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              {showPreview ? 'Sembunyikan Preview' : 'Tampilkan Preview'}
            </button>
          )}

          <button
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Simpan Draft
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            <Send size={14} />
            Terbitkan
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editor Form */}
        <div
          className={`${
            category === 'artikel' && showPreview ? 'w-full md:w-1/2' : 'w-full'
          } flex flex-col overflow-y-auto border-r border-border`}
        >
          {/* Section 1: Metadata Umum */}
          <div className="p-6 space-y-4 border-b border-border bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cover Image Upload */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gambar Cover</label>
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="relative h-44 rounded-xl border-2 border-dashed border-border overflow-hidden cursor-pointer hover:border-primary transition-all flex flex-col items-center justify-center bg-card group"
                >
                  {coverUrl ? (
                    <>
                      <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full">Ganti Gambar</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground text-center p-4">
                      {uploadingCover ? (
                        <Loader2 size={24} className="animate-spin text-primary" />
                      ) : (
                        <>
                          <UploadCloud size={32} className="mb-2 opacity-50" />
                          <span className="text-sm font-semibold">Unggah cover artikel</span>
                          <span className="text-xs opacity-60 mt-0.5">Rasio disarankan 16:9</span>
                        </>
                      )}
                    </div>
                  )}
                  <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
                </div>
              </div>

              {/* Basic Fields */}
              <div className="flex flex-col gap-3 justify-center">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kategori Konten</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EdukasiItem['category'])}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:border-primary font-semibold"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Judul Konten</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Contoh: Mengatasi Speech Delay Sejak Dini"
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:border-primary font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Slug URL</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(toSlug(e.target.value))}
                    placeholder="mengatasi-speech-delay"
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:border-primary font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Buku Saku: PDF URL */}
            {category === 'buku_saku' && (
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">URL File PDF</label>
                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://example.com/buku-saku-speech-delay.pdf"
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Section 2: Editor Dinamis Berdasarkan Kategori */}
          <div className="flex-1 p-6">
            {category === 'buku_saku' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deskripsi Singkat</label>
                <textarea
                  value={plainDesc}
                  onChange={(e) => setPlainDesc(e.target.value)}
                  placeholder="Tulis deskripsi singkat mengenai buku saku ini..."
                  rows={6}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:border-primary resize-none leading-relaxed"
                />
              </div>
            )}

            {category === 'artikel' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Daftar Blok Artikel</span>
                  <span className="text-xs text-muted-foreground">{blocks.length} blok terbuat</span>
                </div>

                {blocks.map((block, idx) => {
                  const meta = blockMeta[block.type]
                  return (
                    <div
                      key={idx}
                      className="group rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm"
                    >
                      {/* Block Controls Header */}
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                        <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveBlock(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 hover:bg-muted text-muted-foreground rounded disabled:opacity-30"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => moveBlock(idx, 1)}
                            disabled={idx === blocks.length - 1}
                            className="p-1 hover:bg-muted text-muted-foreground rounded disabled:opacity-30"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            onClick={() => removeBlock(idx)}
                            className="p-1 hover:bg-destructive/10 text-destructive rounded ml-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Block Input Content */}
                      <div className="p-4">
                        {block.type === 'paragraph' && (
                          <textarea
                            value={block.text || ''}
                            onChange={(e) => updateBlock(idx, { text: e.target.value })}
                            placeholder="Tulis isi paragraf di sini..."
                            rows={4}
                            className="w-full text-sm bg-transparent border-0 resize-none focus:outline-none focus:ring-0 leading-relaxed"
                          />
                        )}

                        {block.type === 'heading' && (
                          <input
                            type="text"
                            value={block.text || ''}
                            onChange={(e) => updateBlock(idx, { text: e.target.value })}
                            placeholder="Tulis sub-judul sesi..."
                            className="w-full text-base font-bold bg-transparent border-0 focus:outline-none focus:ring-0"
                          />
                        )}

                        {block.type === 'quote' && (
                          <textarea
                            value={block.text || ''}
                            onChange={(e) => updateBlock(idx, { text: e.target.value })}
                            placeholder="Tulis kalimat kutipan penting..."
                            rows={2}
                            className="w-full text-sm italic border-l-4 border-primary pl-3 bg-transparent border-0 focus:outline-none focus:ring-0 leading-relaxed"
                          />
                        )}

                        {block.type === 'image' && (
                          <div className="space-y-3">
                            {block.src ? (
                              <div className="relative rounded-lg overflow-hidden border border-border max-h-56 bg-muted">
                                <img src={block.src} alt={block.alt || ''} className="w-full h-full object-cover" />
                                <button
                                  onClick={() => updateBlock(idx, { src: '', alt: '', caption: '' })}
                                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1.5 rounded-full hover:bg-destructive/95"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-all bg-muted/10">
                                {uploadingBlockIdx === idx ? (
                                  <Loader2 size={24} className="animate-spin text-primary" />
                                ) : (
                                  <>
                                    <UploadCloud size={24} className="text-muted-foreground opacity-60 mb-1" />
                                    <span className="text-xs font-semibold text-muted-foreground">Klik untuk upload gambar blok</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    if (f) handleBlockImageUpload(idx, f)
                                  }}
                                />
                              </label>
                            )}
                            <input
                              type="text"
                              value={block.caption || ''}
                              onChange={(e) => updateBlock(idx, { caption: e.target.value })}
                              placeholder="Keterangan Gambar (Opsional)"
                              className="w-full px-3 py-1.5 text-xs border border-input rounded-md bg-background focus:outline-none focus:border-primary"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Add Block Options */}
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-dashed border-border">
                  <span className="text-xs font-bold text-muted-foreground uppercase mr-2">Tambah Blok:</span>
                  {(['paragraph', 'heading', 'image', 'quote'] as const).map((type) => {
                    const meta = blockMeta[type]
                    return (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border border-border ${meta.color} shadow-sm`}
                      >
                        {meta.icon}
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {category === 'galeri' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Daftar Foto Album</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Seret (drag) foto untuk mengurutkan tampilan.</p>
                  </div>

                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhotos}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/25 disabled:opacity-50"
                  >
                    {uploadingPhotos ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    {uploadingPhotos ? 'Mengunggah...' : 'Tambah Foto'}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotosSelect}
                  />
                </div>

                {photos.length === 0 ? (
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-muted/10 transition-all p-4"
                  >
                    <Camera size={36} className="text-muted-foreground opacity-40 mb-2" />
                    <span className="text-sm font-semibold">Klik untuk memilih foto-foto album</span>
                    <span className="text-xs text-muted-foreground opacity-60 mt-0.5">Bisa pilih banyak file sekaligus</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {photos.map((photo, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`group relative rounded-xl overflow-hidden border border-border bg-card transition-all ${
                          dragIdx === idx ? 'ring-2 ring-primary scale-95 opacity-55' : 'hover:shadow-md hover:border-primary/50'
                        }`}
                      >
                        {/* Drag indicator */}
                        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/55 backdrop-blur-sm text-white p-1 rounded cursor-grab active:cursor-grabbing">
                            <GripVertical size={12} />
                          </div>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removePhoto(idx)}
                          className="absolute top-2 right-2 z-10 bg-destructive/90 backdrop-blur-sm text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                        >
                          <X size={10} />
                        </button>

                        {/* Thumb */}
                        <img src={photo.src} alt={photo.alt || ''} className="w-full h-28 object-cover" />

                        {/* Caption input */}
                        <div className="p-2 border-t border-border">
                          <input
                            type="text"
                            value={photo.caption || ''}
                            onChange={(e) => {
                              const updated = [...photos]
                              updated[idx].caption = e.target.value
                              setPhotos(updated)
                            }}
                            placeholder="Tambah deskripsi foto..."
                            className="w-full text-[10px] bg-transparent focus:outline-none placeholder:text-muted-foreground opacity-75 focus:opacity-100"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Preview (Articles Only) */}
        {category === 'artikel' && showPreview && (
          <div className="hidden md:block w-1/2 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-8">
            <div className="bg-white dark:bg-card border border-border rounded-2xl shadow-sm overflow-hidden max-w-2xl mx-auto">
              {/* Header Cover banner */}
              <div className="relative h-56 w-full bg-slate-100 dark:bg-muted overflow-hidden flex items-center justify-center">
                {coverUrl ? (
                  <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-muted-foreground opacity-30 text-center flex flex-col items-center">
                    <BookOpen size={48} className="mb-2" />
                    <span>Gambar Cover Belum Diunggah</span>
                  </div>
                )}
              </div>

              {/* Meta details */}
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Parenting & Edukasi
                  </span>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {title || 'Judul Artikel Anda Akan Tampil Di Sini'}
                  </h1>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Dipublikasikan: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <hr className="border-border" />

                {/* Blocks content */}
                <div className="space-y-5 text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                  {blocks.map((block, index) => {
                    if (block.type === 'paragraph') {
                      return (
                        <p key={index} className="whitespace-pre-line text-justify">
                          {block.text || <span className="text-muted-foreground/40 italic">Ketuk blok untuk mengedit tulisan paragraf...</span>}
                        </p>
                      )
                    }
                    if (block.type === 'heading') {
                      return (
                        <h2 key={index} className="text-lg font-extrabold text-slate-900 dark:text-white mt-6 mb-1 border-l-4 border-primary pl-3">
                          {block.text || <span className="text-muted-foreground/40 italic font-normal">Judul sub-bagian...</span>}
                        </h2>
                      )
                    }
                    if (block.type === 'quote') {
                      return (
                        <blockquote key={index} className="bg-slate-50 dark:bg-muted border-l-4 border-primary px-5 py-3 rounded-r-xl italic font-bold my-4 text-slate-600 dark:text-slate-300">
                          “{block.text || <span className="text-muted-foreground/40 font-normal">Teks kutipan penting...</span>}”
                        </blockquote>
                      )
                    }
                    if (block.type === 'image') {
                      return (
                        <div key={index} className="flex flex-col items-center gap-2 my-4">
                          <div className="rounded-xl overflow-hidden border border-border bg-slate-100 max-h-72 w-full">
                            {block.src ? (
                              <img src={block.src} alt={block.alt || ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="h-40 flex items-center justify-center text-muted-foreground opacity-30">
                                <ImageIcon size={24} />
                              </div>
                            )}
                          </div>
                          {block.caption && (
                            <span className="text-[11px] font-bold text-muted-foreground italic text-center">
                              {block.caption}
                            </span>
                          )}
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
