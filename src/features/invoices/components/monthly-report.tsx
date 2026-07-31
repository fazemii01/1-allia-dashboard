import React, { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { Download, TrendingUp, DollarSign, CheckCircle2, Clock, Calendar, PieChart as PieIcon, BarChart3, Receipt } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { exportMonthlyInvoiceExcel, exportMonthlyInvoiceCSV, InvoiceExportData } from '../utils/excel-export'

interface MonthlyReportProps {
  invoices: InvoiceExportData[]
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export function MonthlyReportSection({ invoices }: MonthlyReportProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  // Extract available months from invoices
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>()
    invoices.forEach((inv) => {
      if (inv.due_date) {
        const d = new Date(inv.due_date)
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          monthsSet.add(key)
        }
      }
    })
    return Array.from(monthsSet).sort().reverse()
  }, [invoices])

  // Filter invoices based on selected month
  const filteredInvoices = useMemo(() => {
    if (selectedMonth === 'all') return invoices
    return invoices.filter((inv) => {
      if (!inv.due_date) return false
      const d = new Date(inv.due_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return key === selectedMonth
    })
  }, [invoices, selectedMonth])

  // Metrics calculation
  const totalInvoices = filteredInvoices.length
  const totalPaidRevenue = filteredInvoices.reduce((acc, inv) => {
    const val = Number(inv.total ?? inv.total_amount ?? 0) || 0
    return inv.status === 'sudah_bayar' ? acc + val : acc
  }, 0)
  const totalPendingAmount = filteredInvoices.reduce((acc, inv) => {
    const val = Number(inv.total ?? inv.total_amount ?? 0) || 0
    return inv.status !== 'sudah_bayar' ? acc + val : acc
  }, 0)
  const totalRemainingBalance = filteredInvoices.reduce((acc, inv) => {
    const totalVal = Number(inv.total ?? inv.total_amount ?? 0) || 0
    const fullAmt = Number(inv.full_amount) || 0
    const rem = fullAmt > 0 ? Math.max(0, fullAmt - totalVal) : 0
    return acc + rem
  }, 0)

  // Chart data: Revenue Breakdown by Status
  const statusChartData = useMemo(() => {
    const statusMap: Record<string, number> = {
      sudah_bayar: 0,
      belum_bayar: 0,
      menunggu_verifikasi: 0,
      jatuh_tempo: 0,
    }
    filteredInvoices.forEach((inv) => {
      const val = Number(inv.total ?? inv.total_amount ?? 0) || 0
      const st = inv.status || 'belum_bayar'
      statusMap[st] = (statusMap[st] || 0) + val
    })

    return [
      { name: 'Lunas', amount: statusMap.sudah_bayar, fill: 'var(--color-lunas, #10B981)' },
      { name: 'Belum Bayar', amount: statusMap.belum_bayar, fill: 'var(--color-belum, #F59E0B)' },
      { name: 'Menunggu Verifikasi', amount: statusMap.menunggu_verifikasi, fill: 'var(--color-verif, #F97316)' },
      { name: 'Jatuh Tempo', amount: statusMap.jatuh_tempo, fill: 'var(--color-tempo, #EF4444)' },
    ]
  }, [filteredInvoices])

  // Monthly trend data for BarChart
  const monthlyTrendData = useMemo(() => {
    const monthStats: Record<string, { month: string; lunas: number; pending: number }> = {}

    invoices.forEach((inv) => {
      if (!inv.due_date) return
      const d = new Date(inv.due_date)
      if (isNaN(d.getTime())) return
      const monthLabel = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
      if (!monthStats[monthLabel]) {
        monthStats[monthLabel] = { month: monthLabel, lunas: 0, pending: 0 }
      }
      const val = Number(inv.total ?? inv.total_amount ?? 0) || 0
      if (inv.status === 'sudah_bayar') {
        monthStats[monthLabel].lunas += val
      } else {
        monthStats[monthLabel].pending += val
      }
    })

    return Object.values(monthStats)
  }, [invoices])

  const getSelectedMonthName = () => {
    if (selectedMonth === 'all') return 'Semua Periode'
    const [y, m] = selectedMonth.split('-')
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`
  }

  const handleDownloadExcel = () => {
    exportMonthlyInvoiceExcel(filteredInvoices, getSelectedMonthName())
  }

  const handleDownloadCSV = () => {
    exportMonthlyInvoiceCSV(filteredInvoices, getSelectedMonthName())
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md text-popover-foreground">
          <p className="font-semibold mb-1">{label || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-foreground">
                Rp {Number(entry.value).toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Controls Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Laporan & Analytic Invoice</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Rekapitulasi bulanan status pembayaran dan unduh file laporan Excel (.xls / .csv).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-background border border-input rounded-md px-3 py-1.5 text-xs">
              <Calendar size={14} className="text-muted-foreground" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none outline-none font-medium text-foreground cursor-pointer text-xs"
              >
                <option value="all">Semua Bulan</option>
                {availableMonths.map((m) => {
                  const [y, mm] = m.split('-')
                  return (
                    <option key={m} value={m}>
                      {MONTH_NAMES[parseInt(mm, 10) - 1]} {y}
                    </option>
                  )
                })}
              </select>
            </div>

            <Button size="sm" onClick={handleDownloadExcel} className="gap-1.5 text-xs font-semibold cursor-pointer">
              <Download size={14} /> Download Excel (.xls)
            </Button>

            <Button size="sm" variant="outline" onClick={handleDownloadCSV} className="gap-1.5 text-xs font-semibold cursor-pointer">
              <Download size={14} /> Download CSV (.csv)
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoice</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Periode: {getSelectedMonthName()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendapatan Lunas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              Rp {totalPaidRevenue.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <span>✓ Pembayaran terverifikasi</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Nominal Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              Rp {totalPendingAmount.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
              Belum bayar / verifikasi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sisa Pelunasan</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              Rp {totalRemainingBalance.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Sisa cicilan DP ke-2
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Recharts Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Monthly Trend Bar Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" /> Tren Pendapatan Bulanan
            </CardTitle>
            <CardDescription className="text-xs">
              Perbandingan pendapatan lunas dan pending per periode
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-72 w-full">
              {monthlyTrendData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                  Belum ada data trend bulanan.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                    <XAxis
                      dataKey="month"
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toLocaleString('id-ID')}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="lunas" name="Nominal Lunas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Nominal Pending" fill="hsl(var(--muted-foreground)/0.4)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-muted-foreground" /> Distribusi Status Tagihan
            </CardTitle>
            <CardDescription className="text-xs">
              Komposisi status invoice pada periode ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full flex items-center justify-center">
              {statusChartData.every((item) => item.amount === 0) ? (
                <div className="text-xs text-muted-foreground italic">Tidak ada data status.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData.filter((item) => item.amount > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="amount"
                      nameKey="name"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
