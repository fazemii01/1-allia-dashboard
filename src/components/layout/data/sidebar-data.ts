import {
  LayoutDashboard,
  Users,
  Calendar,
  Receipt,
  UserCog,
  Package,
  MessagesSquare,
  BookOpen,
  Settings,
  Bell,
  Palette,
  Wrench,
  Shield,
  Image,
  Handshake,
  CreditCard,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin Allia Kids',
    email: 'admin@alliakids.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    { name: 'Allia Kids', logo: '/images/alliakids-logo.png', plan: 'Admin Dashboard' },
  ],
  navGroups: [
    {
      title: 'Utama',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
        { title: 'Data Pasien', url: '/patients', icon: Users },
        { title: 'Jadwal Sesi', url: '/appointments', icon: Calendar },
        { title: 'Invoice & Tagihan', url: '/invoices', icon: Receipt },
      ],
    },
    {
      title: 'Manajemen',
      items: [
        { title: 'Manajemen Terapis', url: '/therapists', icon: UserCog },
        { title: 'Layanan & Kategori', url: '/layanan', icon: Package },
        { title: 'Edukasi Skrining', url: '/edukasi', icon: BookOpen },
        { title: 'Manajemen Banner', url: '/banners', icon: Image },
        { title: 'Manajemen Mitra', url: '/partnerships', icon: Handshake },
        { title: 'Manajemen Testimoni', url: '/testimonials', icon: MessagesSquare },
        { title: 'Metode Pembayaran', url: '/payment-methods', icon: CreditCard },
        { title: 'WhatsApp Manager', url: '/whatsapp', icon: MessagesSquare },
      ],
    },
    {
      title: 'Lainnya',
      items: [
        { title: 'Log Aktivitas', url: '/activity-logs', icon: BookOpen },
        { title: 'Manajemen User (Admin)', url: '/users', icon: Shield },
        { title: 'Hak Akses (Admin)', url: '/permissions', icon: Shield },
        {
          title: 'Pengaturan',
          icon: Settings,
          items: [
            { title: 'Profil', url: '/settings', icon: UserCog },
            { title: 'Akun', url: '/settings/account', icon: Wrench },
            { title: 'Tampilan', url: '/settings/appearance', icon: Palette },
            { title: 'Notifikasi', url: '/settings/notifications', icon: Bell },
          ],
        },
      ],
    },
  ],
}
