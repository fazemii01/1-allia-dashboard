import { createFileRoute } from '@tanstack/react-router'
import ActivityLogsPage from '@/features/activity-logs'

export const Route = createFileRoute('/_authenticated/activity-logs/')({
  component: ActivityLogsPage,
})
