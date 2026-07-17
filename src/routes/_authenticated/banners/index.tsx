import { createFileRoute } from '@tanstack/react-router'
import BannersPage from '@/features/banners'

export const Route = createFileRoute('/_authenticated/banners/')({
  component: BannersPage,
})
