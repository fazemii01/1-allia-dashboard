import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Overview } from './components/overview'
import { RecentSales } from './components/recent-sales'
import { apiFetch } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Users, UserCheck, Calendar, Receipt, HeartHandshake, BookOpen, Activity } from 'lucide-react'

interface DashboardStats {
  cards: {
    totalPatients: number
    activeTherapists: number
    weeklySessions: number
    pendingInvoicesCount: number
    pendingInvoicesAmount: number
  }
  recentPatients: any[]
  categoryStats: { category: string; count: number }[]
  monthlyOverview: { name: string; total: number }[]
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await apiFetch<DashboardStats>('/admin/dashboard/stats')
      setStats(data)
      setError(null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Gagal memuat statistik dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <div className='flex items-center gap-4 ms-auto'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-6 flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-3xl font-extrabold tracking-tight'>Overview Dashboard</h1>
            <p className='text-muted-foreground'>
              Selamat datang kembali. Berikut adalah ringkasan operasional Allia Kids hari ini.
            </p>
          </div>
        </div>

        {loading ? (
          <div className='space-y-6'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className='h-28 w-full' />
              ))}
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Skeleton className='col-span-1 lg:col-span-4 h-96 w-full' />
              <Skeleton className='col-span-1 lg:col-span-3 h-96 w-full' />
            </div>
          </div>
        ) : error ? (
          <Alert variant='destructive'>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !stats ? (
          <div className='text-center py-8 text-muted-foreground'>Statistik tidak tersedia.</div>
        ) : (
          <Tabs defaultValue='overview' className='space-y-6'>
            <TabsList>
              <TabsTrigger value='overview'>Overview Utama</TabsTrigger>
              <TabsTrigger value='categories'>Distribusi Layanan</TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='space-y-6'>
              {/* Stats Card Grid */}
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Card className='shadow-sm hover:shadow-md transition-shadow'>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium text-muted-foreground'>
                      Total Pasien Terdaftar
                    </CardTitle>
                    <Users className='h-4 w-4 text-blue-500' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-3xl font-bold tracking-tight'>{stats.cards.totalPatients}</div>
                    <p className='text-xs text-muted-foreground mt-1'>
                      Anak yang terdata dalam sistem
                    </p>
                  </CardContent>
                </Card>

                <Card className='shadow-sm hover:shadow-md transition-shadow'>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium text-muted-foreground'>
                      Terapis Aktif
                    </CardTitle>
                    <UserCheck className='h-4 w-4 text-green-500' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-3xl font-bold tracking-tight'>{stats.cards.activeTherapists}</div>
                    <p className='text-xs text-muted-foreground mt-1'>
                      Terapis bersertifikat dan aktif
                    </p>
                  </CardContent>
                </Card>

                <Card className='shadow-sm hover:shadow-md transition-shadow'>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium text-muted-foreground'>
                      Sesi Terapi Pekan Ini
                    </CardTitle>
                    <Calendar className='h-4 w-4 text-amber-500' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-3xl font-bold tracking-tight'>{stats.cards.weeklySessions}</div>
                    <p className='text-xs text-muted-foreground mt-1'>
                      Jadwal sesi teraputik aktif
                    </p>
                  </CardContent>
                </Card>

                <Card className='shadow-sm hover:shadow-md transition-shadow'>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium text-muted-foreground'>
                      Tagihan Belum Lunas
                    </CardTitle>
                    <Receipt className='h-4 w-4 text-destructive' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold tracking-tight'>
                      {formatRupiah(stats.cards.pendingInvoicesAmount)}
                    </div>
                    <p className='text-xs text-destructive mt-1 font-semibold'>
                      {stats.cards.pendingInvoicesCount} invoice pending pembayaran
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts & Lists Section */}
              <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
                {/* Monthly Session Volume Chart */}
                <Card className='col-span-1 lg:col-span-4 shadow-sm'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <Activity className='h-4 w-4 text-primary' />
                      Volume Sesi Terapi bulanan
                    </CardTitle>
                    <CardDescription>Visualisasi jumlah total janji temu sesi terapi anak per bulan.</CardDescription>
                  </CardHeader>
                  <CardContent className='ps-2'>
                    <Overview data={stats.monthlyOverview} />
                  </CardContent>
                </Card>

                {/* Recent Registrations List */}
                <Card className='col-span-1 lg:col-span-3 shadow-sm'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <HeartHandshake className='h-4 w-4 text-primary' />
                      Pendaftaran Pasien Baru
                    </CardTitle>
                    <CardDescription>
                      Daftar 5 pendaftaran anak terbaru yang diajukan dari Landing Page.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentSales patients={stats.recentPatients} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value='categories' className='space-y-6'>
              <Card className='shadow-sm'>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <BookOpen className='h-4 w-4 text-primary' />
                    Distribusi Kategori Terapi Pasien
                  </CardTitle>
                  <CardDescription>Jumlah anak terdaftar yang mengambil program per jenis terapi.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {stats.categoryStats.length > 0 ? (
                      stats.categoryStats.map((item, idx) => (
                        <Card key={idx} className='bg-muted/30 border-muted-foreground/10'>
                          <CardContent className='pt-6 flex items-center justify-between'>
                            <div>
                              <p className='text-sm font-semibold capitalize'>{item.category}</p>
                              <p className='text-xs text-muted-foreground'>Program Terapi</p>
                            </div>
                            <div className='text-2xl font-extrabold text-primary'>{item.count} Anak</div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className='text-muted-foreground text-center py-4 col-span-full'>
                        Belum ada distribusi data kategori.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </Main>
    </>
  )
}
