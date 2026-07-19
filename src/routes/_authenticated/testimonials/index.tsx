import { createFileRoute } from '@tanstack/react-router'
import TestimonialsPage from '@/features/testimonials'

export const Route = createFileRoute('/_authenticated/testimonials/')({
  component: TestimonialsPage,
})
