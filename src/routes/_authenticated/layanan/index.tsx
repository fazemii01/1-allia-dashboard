import { createFileRoute } from '@tanstack/react-router'
import LayananPage from '@/features/layanan'

export const Route = createFileRoute('/_authenticated/layanan/')({
  component: LayananPage,
})
