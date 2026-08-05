import { createFileRoute } from '@tanstack/react-router'
import PublicInvoiceView from '@/features/invoices/public-invoice-view'

export const Route = createFileRoute('/invoice/$code')({
  component: PublicInvoiceView,
})
