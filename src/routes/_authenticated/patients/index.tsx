import { createFileRoute } from '@tanstack/react-router'
import { Patients } from '@/features/patients'

export const Route = createFileRoute('/_authenticated/patients/')({
  component: Patients,
})
