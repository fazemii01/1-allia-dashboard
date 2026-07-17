import { createFileRoute } from '@tanstack/react-router'
import EdukasiPage from '@/features/edukasi'

export const Route = createFileRoute('/_authenticated/edukasi/')({
  component: EdukasiPage,
})
