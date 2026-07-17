import { createFileRoute } from '@tanstack/react-router'
import { WhatsAppManager } from '@/features/whatsapp'

export const Route = createFileRoute('/_authenticated/whatsapp/')({
  component: WhatsAppManager,
})
