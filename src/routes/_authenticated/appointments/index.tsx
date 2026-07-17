import { createFileRoute } from '@tanstack/react-router'
import AppointmentsPage from '@/features/appointments'

export const Route = createFileRoute('/_authenticated/appointments/')({
  component: AppointmentsPage,
})
