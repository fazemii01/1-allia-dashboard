import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function ProfileForm() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    photo_url: '',
    password: '',
  })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const user = await api.get<any>('/auth/me')
        if (user) {
          setProfile({
            name: user.name || '',
            email: user.email || '',
            bio: user.bio || '',
            photo_url: user.photo_url || '',
            password: '',
          })
        }
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat profil pengguna')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('http://localhost:3001/api/auth/profile/upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Gagal mengunggah foto profil.')
      }

      const result = await response.json()
      setProfile((prev) => ({ ...prev, photo_url: result.url }))
      toast.success('Foto profil berhasil diunggah')
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah foto profil')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.name) {
      toast.error('Nama lengkap wajib diisi!')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        name: profile.name,
        email: profile.email || null,
        bio: profile.bio || null,
        photo_url: profile.photo_url || null,
      }
      if (profile.password) {
        payload.password = profile.password
      }
      const updated = await api.patch<any>('/auth/profile', payload)

      // Update local storage so sidebar updates instantly
      const stored = localStorage.getItem('admin_user')
      if (stored) {
        const u = JSON.parse(stored)
        u.name = updated.name
        u.email = updated.email
        u.photo_url = updated.photo_url
        localStorage.setItem('admin_user', JSON.stringify(u))
      }

      toast.success('Profil berhasil diperbarui!')
      // Refresh page after 1s to update headers
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui profil')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wellme-primary" />
      </div>
    )
  }

  const initials = profile.name
    ? profile.name.split(/\s+/).slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : 'A'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl w-full">
      {/* Profile Photo Section */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Foto Profil</Label>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border border-slate-100 shadow-sm overflow-hidden flex items-center justify-center">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback className="bg-wellme-primary text-white font-bold text-xl">{initials}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col gap-2">
            <label className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-black cursor-pointer shadow-sm hover:bg-slate-50 transition-all">
              {uploading ? 'Mengunggah...' : 'Pilih Foto Baru'}
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={handleUploadPhoto}
                className="hidden"
              />
            </label>
            <span className="text-[10px] text-slate-400">Rekomendasi format PNG/JPG, maks. 5MB.</span>
          </div>
        </div>
      </div>

      {/* Full Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</Label>
        <Input
          id="name"
          type="text"
          value={profile.name}
          onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Nama Lengkap"
          className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-wellme-primary focus-visible:outline-none"
        />
        <span className="text-[10px] text-slate-400 block">Nama ini akan ditampilkan pada portal dan log aktivitas Anda.</span>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Utama</Label>
        <Input
          id="email"
          type="email"
          value={profile.email}
          onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="admin@alliakids.com"
          className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-wellme-primary focus-visible:outline-none"
        />
        <span className="text-[10px] text-slate-400 block">Digunakan untuk pemulihan kata sandi dan login masuk.</span>
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <Label htmlFor="bio" className="text-xs font-bold text-slate-700 dark:text-slate-300">Biografi / Peran</Label>
        <Textarea
          id="bio"
          value={profile.bio}
          onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
          placeholder="Tulis deskripsi singkat mengenai peran atau biografi Anda..."
          className="rounded-xl border-slate-200 dark:border-slate-800 resize-none h-24 focus-visible:ring-wellme-primary focus-visible:outline-none"
        />
        <span className="text-[10px] text-slate-400 block">Deskripsi singkat peran atau tanggung jawab Anda di Allia Kids.</span>
      </div>

      {/* Change Password (Optional) */}
      <div className="space-y-1.5">
        <Label htmlFor="pass" className="text-xs font-bold text-slate-700 dark:text-slate-300">Kata Sandi Baru (Opsional)</Label>
        <Input
          id="pass"
          type="password"
          value={profile.password}
          onChange={(e) => setProfile((prev) => ({ ...prev, password: e.target.value }))}
          placeholder="••••••••"
          className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-wellme-primary focus-visible:outline-none"
        />
        <span className="text-[10px] text-slate-400 block">Kosongkan jika Anda tidak ingin mengganti kata sandi.</span>
      </div>

      <Button type="submit" disabled={saving} className="bg-wellme-secondary-gradient text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md hover:brightness-105 transition-all">
        {saving ? 'Memperbarui...' : 'Simpan Perubahan'}
      </Button>
    </form>
  )
}
