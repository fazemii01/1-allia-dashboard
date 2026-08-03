import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    const { accessToken, user, reset } = useAuthStore.getState().auth
    if (!accessToken) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.href,
        },
      })
    }

    const rawRole = user?.role
    const role = Array.isArray(rawRole) ? rawRole[0] : rawRole
    const isAllowed = role === 'admin' || role === 'staff'

    if (user && !isAllowed) {
      toast.error('Akses ditolak: Hanya akun Admin dan Staff yang diizinkan mengakses Dashboard.')
      reset()
      throw redirect({
        to: '/sign-in',
      })
    }
  },
  component: AuthenticatedLayout,
})
