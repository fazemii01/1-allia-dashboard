import { createFileRoute } from '@tanstack/react-router'
import TherapistsPage from '@/features/therapists'

export const Route = createFileRoute('/_authenticated/therapists/')({
  component: TherapistsPage,
})
