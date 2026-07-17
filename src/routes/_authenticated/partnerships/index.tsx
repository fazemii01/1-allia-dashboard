import { createFileRoute } from '@tanstack/react-router'
import PartnershipsPage from '@/features/partnerships'

export const Route = createFileRoute('/_authenticated/partnerships/')({
  component: PartnershipsPage,
})
