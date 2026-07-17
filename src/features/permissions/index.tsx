import { useEffect, useState, useCallback } from 'react'
import { Shield, RotateCcw, Save, Lock, Eye, Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ResourceActions {
  view: boolean
  create: boolean
  update: boolean
  delete: boolean
}

type PermissionMatrix = Record<string, Record<string, ResourceActions>>

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = ['staff', 'user'] as const
type Role = (typeof ROLES)[number]

const RESOURCES: { key: string; label: string; description: string }[] = [
  { key: 'patients', label: 'Data Pasien', description: 'Manajemen data pasien & formulir pendaftaran' },
  { key: 'appointments', label: 'Jadwal Sesi', description: 'Penjadwalan dan manajemen sesi terapi' },
  { key: 'invoices', label: 'Invoice & Tagihan', description: 'Pembuatan dan pengelolaan tagihan' },
  { key: 'therapists', label: 'Manajemen Terapis', description: 'Data dan profil terapis' },
  { key: 'layanan', label: 'Layanan & Kategori', description: 'CMS konten layanan terapi' },
  { key: 'edukasi', label: 'Edukasi Skrining', description: 'Buku saku, artikel, dan galeri' },
  { key: 'whatsapp', label: 'WhatsApp Manager', description: 'Template & log pesan WhatsApp' },
]

const ACTIONS: { key: keyof ResourceActions; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'view',   label: 'Lihat',  icon: <Eye size={13} />,    color: 'text-blue-500' },
  { key: 'create', label: 'Tambah', icon: <Plus size={13} />,   color: 'text-green-500' },
  { key: 'update', label: 'Edit',   icon: <Pencil size={13} />, color: 'text-amber-500' },
  { key: 'delete', label: 'Hapus',  icon: <Trash2 size={13} />, color: 'text-red-500' },
]

const ROLE_LABELS: Record<Role, { label: string; description: string; color: string }> = {
  staff: {
    label: 'Staff / Terapis',
    description: 'Karyawan klinik dan terapis internal',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  user: {
    label: 'User / Orang Tua',
    description: 'Akun orang tua / wali pasien',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
}

// ─── Permission Row Component ─────────────────────────────────────────────────
function PermissionRow({
  resource,
  actions,
  onChange,
}: {
  resource: (typeof RESOURCES)[number]
  actions: ResourceActions
  onChange: (action: keyof ResourceActions, value: boolean) => void
}) {
  return (
    <div className='flex items-center justify-between py-4 border-b last:border-0'>
      <div className='flex-1 min-w-0 pr-4'>
        <p className='text-sm font-medium leading-none'>{resource.label}</p>
        <p className='text-xs text-muted-foreground mt-1'>{resource.description}</p>
      </div>
      <div className='flex items-center gap-6 shrink-0'>
        {ACTIONS.map(({ key, label, icon, color }) => (
          <div key={key} className='flex flex-col items-center gap-1.5 w-14'>
            <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
              {icon} {label}
            </span>
            <Switch
              id={`${resource.key}-${key}`}
              checked={actions[key] ?? false}
              onCheckedChange={(checked) => onChange(key, checked)}
              disabled={key !== 'view' && !actions.view}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PermissionsPage() {
  const [matrix, setMatrix] = useState<PermissionMatrix>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Role | null>(null)
  const [saved, setSaved] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<PermissionMatrix>('/admin/permissions')
      setMatrix(data)
    } catch (err: any) {
      setError(err.message ?? 'Gagal memuat data permissions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const handleToggle = (role: Role, resource: string, action: keyof ResourceActions, value: boolean) => {
    setMatrix((prev) => {
      const updated = { ...prev }
      if (!updated[role]) updated[role] = {}
      updated[role] = {
        ...updated[role],
        [resource]: { ...(updated[role][resource] ?? {}), [action]: value },
      }
      // If view is turned off, disable all other actions
      if (action === 'view' && !value) {
        updated[role][resource] = { view: false, create: false, update: false, delete: false }
      }
      return updated
    })
  }

  const handleSave = async (role: Role) => {
    try {
      setSaving(role)
      await api.put(`/admin/permissions/${role}`, matrix[role] ?? {})
      setSaved(role)
      setTimeout(() => setSaved(null), 2500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const handleReset = async (role: Role) => {
    try {
      setSaving(role)
      const defaults = await api.post<Record<string, ResourceActions>>(
        `/admin/permissions/${role}/reset`,
        {},
      )
      setMatrix((prev) => ({ ...prev, [role]: defaults }))
      setSaved(role)
      setTimeout(() => setSaved(null), 2500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className='space-y-6 p-4 md:p-6'>
      {/* ── Header ── */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-lg bg-primary/10'>
            <Shield className='size-5 text-primary' />
          </div>
          <div>
            <h1 className='text-xl font-semibold tracking-tight'>Manajemen Hak Akses</h1>
            <p className='text-sm text-muted-foreground mt-0.5'>
              Atur apa yang boleh dilakukan setiap role di dashboard
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium'>
            <Lock size={12} />
            Admin Only
          </div>
        </div>
      </div>

      {/* ── Admin notice ── */}
      <div className='rounded-lg border border-dashed p-4 bg-muted/30 flex items-start gap-3'>
        <Shield className='size-4 text-muted-foreground mt-0.5 shrink-0' />
        <div className='text-sm text-muted-foreground'>
          <span className='font-medium text-foreground'>Admin</span> selalu memiliki akses penuh ke semua fitur dan tidak dapat dibatasi. Halaman ini hanya mengatur hak akses untuk role{' '}
          <span className='font-medium text-foreground'>Staff</span> dan{' '}
          <span className='font-medium text-foreground'>User</span>.
        </div>
      </div>

      {error && (
        <div className='rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive'>
          {error}
        </div>
      )}

      {/* ── Role Tabs ── */}
      <Tabs defaultValue='staff'>
        <TabsList className='mb-2'>
          {ROLES.map((role) => (
            <TabsTrigger key={role} value={role}>
              {ROLE_LABELS[role].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ROLES.map((role) => (
          <TabsContent key={role} value={role} className='space-y-4'>
            {/* Role header */}
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <Badge className={ROLE_LABELS[role].color}>
                  {ROLE_LABELS[role].label}
                </Badge>
                <span className='text-sm text-muted-foreground'>
                  {ROLE_LABELS[role].description}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                {/* Reset to defaults */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant='outline' size='sm' className='gap-1.5'>
                      <RotateCcw size={13} />
                      Reset Default
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset ke Default?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ini akan mengembalikan semua hak akses <strong>{ROLE_LABELS[role].label}</strong> ke pengaturan bawaan sistem. Perubahan yang sudah disimpan akan hilang.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleReset(role)}>
                        Ya, Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Save button */}
                <Button
                  size='sm'
                  className='gap-1.5'
                  onClick={() => handleSave(role)}
                  disabled={saving === role}
                >
                  <Save size={13} />
                  {saving === role
                    ? 'Menyimpan...'
                    : saved === role
                      ? '✓ Tersimpan'
                      : 'Simpan Perubahan'}
                </Button>
              </div>
            </div>

            {/* Permission grid */}
            <div className='rounded-lg border bg-card'>
              {/* Column headers */}
              <div className='flex items-center justify-between px-4 py-3 border-b bg-muted/40 rounded-t-lg'>
                <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                  Fitur / Modul
                </span>
                <div className='flex items-center gap-6'>
                  {ACTIONS.map(({ key, label, icon, color }) => (
                    <div key={key} className={`flex items-center gap-1 text-xs font-semibold w-14 justify-center ${color}`}>
                      {icon} {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              <div className='px-4 divide-y'>
                {loading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className='flex items-center justify-between py-4'>
                      <Skeleton className='h-4 w-40' />
                      <div className='flex gap-6'>
                        {ACTIONS.map((a) => <Skeleton key={a.key} className='h-6 w-10' />)}
                      </div>
                    </div>
                  ))
                ) : (
                  RESOURCES.map((resource) => (
                    <PermissionRow
                      key={resource.key}
                      resource={resource}
                      actions={matrix[role]?.[resource.key] ?? { view: false, create: false, update: false, delete: false }}
                      onChange={(action, value) => handleToggle(role, resource.key, action, value)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Helper note */}
            <p className='text-xs text-muted-foreground'>
              💡 Jika <strong>Lihat</strong> dinonaktifkan, aksi lain (Tambah, Edit, Hapus) otomatis dinonaktifkan juga. Klik <strong>Simpan Perubahan</strong> untuk menerapkan.
            </p>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
