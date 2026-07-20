import { createFileRoute } from '@tanstack/react-router'
import PaymentMethodsPage from '@/features/payment-methods'

export const Route = createFileRoute('/_authenticated/payment-methods/')({
  component: PaymentMethodsPage,
})
