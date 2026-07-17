import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { useAuthStore } from '@/stores/auth-store'
import { apiFetch } from '@/lib/api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface ActivityLog {
  id: number
  userId: number
  action: string
  modelType: string | null
  modelId: string | null
  description: string
  properties: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    id: number
    name: string
    whatsapp: string
    role: string
  } | null
}

export default function ActivityLogsPage() {
  const { auth } = useAuthStore()
  const userRole = auth.user?.role?.[0]

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [modelFilter, setModelFilter] = useState('ALL')

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const data = await apiFetch<ActivityLog[]>('/admin/activity-logs')
      setLogs(data)
      setError(null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Gagal memuat log aktivitas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'staff') {
      fetchLogs()
    }
  }, [userRole])

  if (userRole !== 'admin' && userRole !== 'staff') {
    return (
      <>
        <Header fixed>
          <ThemeSwitch className='ms-auto' />
          <ConfigDrawer />
          <ProfileDropdown />
        </Header>
        <Main className='flex flex-1 flex-col items-center justify-center p-8 text-center'>
          <div className='max-w-md space-y-3'>
            <h2 className='text-3xl font-extrabold tracking-tight text-destructive'>Akses Ditolak</h2>
            <p className='text-muted-foreground'>
              Halaman ini hanya dapat diakses oleh administrator dan staf.
            </p>
          </div>
        </Main>
      </>
    )
  }

  // Filter logs locally for instant responsiveness
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      (log.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.user?.whatsapp || '').includes(search)
    
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter
    const matchesModel = modelFilter === 'ALL' || log.modelType === modelFilter

    return matchesSearch && matchesAction && matchesModel
  })

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'login':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-200'
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200'
      case 'update':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-200'
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200'
      case 'upload':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 border-purple-200'
      case 'whatsapp':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200 border-teal-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200'
    }
  }

  // Distinct model types from logs
  const modelTypes = Array.from(new Set(logs.map((l) => l.modelType).filter(Boolean))) as string[]

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-4 ms-auto'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Log Aktivitas</h2>
          <p className='text-muted-foreground'>
            Histori lengkap tindakan yang dilakukan oleh admin dan staf Allia Kids.
          </p>
        </div>

        {/* Filter controls */}
        <Card className='rounded-md'>
          <CardContent className='pt-6 flex flex-col md:flex-row gap-4'>
            <div className='flex-1'>
              <Input
                placeholder='Cari deskripsi atau nama staf...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-full'
              />
            </div>
            <div className='w-full md:w-48'>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder='Filter Aksi' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>Semua Aksi</SelectItem>
                  <SelectItem value='login'>Login</SelectItem>
                  <SelectItem value='create'>Create (Tambah)</SelectItem>
                  <SelectItem value='update'>Update (Ubah)</SelectItem>
                  <SelectItem value='delete'>Delete (Hapus)</SelectItem>
                  <SelectItem value='upload'>Upload File</SelectItem>
                  <SelectItem value='whatsapp'>Kirim WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='w-full md:w-48'>
              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder='Filter Modul' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>Semua Modul</SelectItem>
                  {modelTypes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant='outline' onClick={fetchLogs} className='md:w-auto w-full'>
              Refresh
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className='space-y-4'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-40 w-full' />
          </div>
        ) : error ? (
          <Alert variant='destructive'>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className='overflow-hidden rounded-md border bg-background'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[150px]'>Pengguna</TableHead>
                  <TableHead className='w-[120px]'>Aksi</TableHead>
                  <TableHead className='w-[120px]'>Modul</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className='w-[130px]'>IP Address</TableHead>
                  <TableHead className='w-[180px]'>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className='hover:bg-muted/50'>
                      <TableCell className='font-medium'>
                        <div>
                          <p className='text-sm font-semibold'>{log.user?.name || 'Sistem'}</p>
                          <p className='text-xs text-muted-foreground'>{log.user?.whatsapp || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className={getActionBadgeColor(log.action)}>
                          {log.action.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.modelType ? (
                          <Badge variant='secondary' className='text-xs'>
                            {log.modelType}
                          </Badge>
                        ) : (
                          <span className='text-xs text-muted-foreground'>-</span>
                        )}
                      </TableCell>
                      <TableCell className='max-w-md truncate text-sm'>
                        <span title={log.description}>{log.description}</span>
                      </TableCell>
                      <TableCell className='text-xs font-mono text-muted-foreground'>
                        {log.ipAddress || '-'}
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        {format(new Date(log.createdAt), 'dd MMMM yyyy, HH:mm', { locale: id })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className='h-24 text-center text-muted-foreground'>
                      Tidak ada log aktivitas yang cocok.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Main>
    </>
  )
}
