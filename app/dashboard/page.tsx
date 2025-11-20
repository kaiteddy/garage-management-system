import { CleanDashboard } from '@/components/dashboard/clean-dashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GarageManager Pro - Dashboard',
  description: 'Complete garage management dashboard with MOT tracking, vehicle management, and customer service tools',
  generator: 'GarageManager Pro'
}

export default function DashboardPage() {
  return <CleanDashboard />
}
