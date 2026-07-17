import { useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider, useUsers } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { apiFetch } from '@/lib/api'
import { type User } from './data/schema'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

import { useAuthStore } from '@/stores/auth-store'

const route = getRouteApi('/_authenticated/users/')

function UsersContent() {
  const { auth } = useAuthStore()
  const userRole = auth.user?.role?.[0]

  if (userRole !== 'admin') {
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
              Halaman ini hanya dapat diakses oleh administrator sistem.
            </p>
          </div>
        </Main>
      </>
    )
  }

  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { setOnSuccess } = useUsers()

  const [usersList, setUsersList] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await apiFetch<any[]>('/admin/users')
      const mapped = data.map((u: any) => ({
        id: String(u.id),
        firstName: u.name,
        lastName: '',
        username: u.whatsapp,
        email: u.email || '-',
        phoneNumber: u.whatsapp,
        status: 'active' as const,
        role: (u.role === 'admin' || u.role === 'staff' || u.role === 'user') ? u.role : 'user',
        createdAt: new Date(u.created_at),
        updatedAt: new Date(u.updated_at),
      }))
      setUsersList(mapped)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Gagal memuat daftar user')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    setOnSuccess(() => () => fetchUsers())
  }, [])

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Daftar User</h2>
            <p className='text-muted-foreground'>
              Kelola user, staf, dan admin Allia Kids di sini.
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>
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
          <UsersTable data={usersList} search={search} navigate={navigate} />
        )}
      </Main>

      <UsersDialogs />
    </>
  )
}

export function Users() {
  return (
    <UsersProvider>
      <UsersContent />
    </UsersProvider>
  )
}
