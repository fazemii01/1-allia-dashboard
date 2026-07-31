export interface InvoiceExportData {
  id: string | number
  invoice_number?: string
  patient_name?: string
  patient_id: string | number
  due_date: string
  status: string
  payment_type?: string
  dp_percentage?: number
  installment_no?: number
  total?: number
  total_amount?: number
  full_amount?: number
  payment_method?: string
}

export function exportMonthlyInvoiceExcel(invoices: InvoiceExportData[], selectedMonthName: string = "Semua Periode") {
  const formatMoney = (amount: number) => {
    return 'Rp ' + (amount || 0).toLocaleString('id-ID')
  }

  const getStatusText = (st: string) => {
    switch (st) {
      case 'sudah_bayar': return 'LUNAS'
      case 'belum_bayar': return 'BELUM BAYAR'
      case 'menunggu_verifikasi': return 'MENUNGGU VERIFIKASI'
      case 'jatuh_tempo': return 'JATUH TEMPO'
      default: return (st || '-').toUpperCase()
    }
  }

  const getPaymentTypeText = (type?: string, dpPercentage?: number) => {
    switch (type) {
      case 'dp': return `DP ${dpPercentage || 50}%`
      case 'custom': return `Custom (${dpPercentage || 0}%)`
      case 'pelunasan': return 'Pelunasan (Cicilan 2)'
      case 'full': return 'Lunas 100%'
      default: return type ? type.toUpperCase() : 'Standard'
    }
  }

  // Calculate Summary metrics
  const totalInvoices = invoices.length
  const totalRevenue = invoices.reduce((acc, inv) => {
    const amt = Number(inv.total ?? inv.total_amount ?? 0) || 0
    return inv.status === 'sudah_bayar' ? acc + amt : acc
  }, 0)
  const totalPending = invoices.reduce((acc, inv) => {
    const amt = Number(inv.total ?? inv.total_amount ?? 0) || 0
    return inv.status !== 'sudah_bayar' ? acc + amt : acc
  }, 0)
  const totalRemainingBalance = invoices.reduce((acc, inv) => {
    const totalVal = Number(inv.total ?? inv.total_amount ?? 0) || 0
    const fullAmt = Number(inv.full_amount) || 0
    const rem = fullAmt > 0 ? Math.max(0, fullAmt - totalVal) : 0
    return acc + rem
  }, 0)

  // Build HTML Excel Spreadsheet (Compatible with all Microsoft Excel versions natively as .xls)
  const htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Laporan Invoice</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  th, td { border: 1px solid #CBD5E1; padding: 8px 12px; font-size: 10pt; }
  .banner-title { background-color: #1E3A8A; color: #FFFFFF; font-size: 16pt; font-weight: bold; text-align: center; border: none; padding: 12px; }
  .banner-sub { background-color: #1E3A8A; color: #DBEAFE; font-size: 10pt; font-style: italic; text-align: center; border: none; padding-bottom: 12px; }
  .section-title { font-size: 12pt; font-weight: bold; color: #1E3A8A; background-color: #EFF6FF; border: 1px solid #BFDBFE; }
  .th-header { background-color: #1E40AF; color: #FFFFFF; font-weight: bold; text-align: center; vertical-align: middle; }
  .kpi-label { background-color: #F8FAFC; color: #475569; font-weight: bold; }
  .kpi-value { background-color: #FFFFFF; font-weight: bold; text-align: right; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .currency { text-align: right; mso-number-format: "\\Rp\\ #\\,\\#\\#0"; }
  .status-paid { background-color: #DCFCE7; color: #166534; font-weight: bold; text-align: center; }
  .status-unpaid { background-color: #FEF3C7; color: #92400E; font-weight: bold; text-align: center; }
  .status-verify { background-color: #FFEDD5; color: #C2410C; font-weight: bold; text-align: center; }
  .total-row { background-color: #E2E8F0; font-weight: bold; border-top: 2px solid #1E3A8A; border-bottom: 3px double #1E3A8A; }
</style>
</head>
<body>

<table>
  <tr>
    <td colspan="6" class="banner-title">ALLIA KIDS - LAPORAN KEUANGAN &amp; INVOICE</td>
  </tr>
  <tr>
    <td colspan="6" class="banner-sub">Periode Laporan: ${selectedMonthName} • Dibuat Pada: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
  </tr>
</table>

<table>
  <tr>
    <td colspan="4" class="section-title">📊 RINGKASAN METRIK PERFORMA (KPI)</td>
  </tr>
  <tr>
    <td class="kpi-label">Total Invoice Terbit</td>
    <td class="kpi-value">${totalInvoices} Invoice</td>
    <td class="kpi-label">Total Pendapatan (Lunas)</td>
    <td class="kpi-value">${formatMoney(totalRevenue)}</td>
  </tr>
  <tr>
    <td class="kpi-label">Total Invoice Belum Lunas</td>
    <td class="kpi-value">${invoices.filter(i => i.status !== 'sudah_bayar').length} Invoice</td>
    <td class="kpi-label">Nominal Tagihan Pending</td>
    <td class="kpi-value">${formatMoney(totalPending)}</td>
  </tr>
  <tr>
    <td class="kpi-label">Total Sisa Tagihan DP/Pelunasan</td>
    <td class="kpi-value">${formatMoney(totalRemainingBalance)}</td>
    <td class="kpi-label">Tingkat Pelunasan (Rate)</td>
    <td class="kpi-value">${totalInvoices > 0 ? Math.round((invoices.filter(i => i.status === 'sudah_bayar').length / totalInvoices) * 100) : 0}%</td>
  </tr>
</table>

<table>
  <thead>
    <tr>
      <th class="th-header" style="width: 40px;">No</th>
      <th class="th-header">No. Invoice</th>
      <th class="th-header">Nama Pasien</th>
      <th class="th-header">Skema Pembayaran</th>
      <th class="th-header">Nominal Tagihan (Rp)</th>
      <th class="th-header">Sisa Pelunasan (Rp)</th>
      <th class="th-header">Total Full Sesi (Rp)</th>
      <th class="th-header">Jatuh Tempo</th>
      <th class="th-header">Metode Pembayaran</th>
      <th class="th-header">Status</th>
    </tr>
  </thead>
  <tbody>
    ${invoices.map((inv, index) => {
      const totalVal = Number(inv.total ?? inv.total_amount ?? 0) || 0
      const fullAmt = Number(inv.full_amount) || 0
      const remainingAmt = fullAmt > 0 ? Math.max(0, fullAmt - totalVal) : 0
      const statusClass = inv.status === 'sudah_bayar' ? 'status-paid' : inv.status === 'menunggu_verifikasi' ? 'status-verify' : 'status-unpaid'
      const patientName = inv.patient_name || (inv as any).patient?.nama_lengkap || (inv as any).patient?.name || '-'

      return `<tr>
        <td class="text-center">${index + 1}</td>
        <td class="text-center" style="font-family: monospace; font-weight: bold;">${inv.invoice_number || `INV-${inv.id}`}</td>
        <td class="text-left">${patientName}</td>
        <td class="text-center">${getPaymentTypeText(inv.payment_type, inv.dp_percentage)}</td>
        <td class="currency">${formatMoney(totalVal)}</td>
        <td class="currency">${formatMoney(remainingAmt)}</td>
        <td class="currency">${formatMoney(fullAmt || totalVal)}</td>
        <td class="text-center">${inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-'}</td>
        <td class="text-center">${inv.payment_method === 'cash' ? 'Tunai / Cash' : 'Transfer Bank'}</td>
        <td class="${statusClass}">${getStatusText(inv.status)}</td>
      </tr>`
    }).join('\n')}
    <tr class="total-row">
      <td colspan="4" class="text-right">TOTAL METRIK (${invoices.length} INVOICE)</td>
      <td class="currency">${formatMoney(invoices.reduce((s, i) => s + (Number(i.total ?? i.total_amount ?? 0) || 0), 0))}</td>
      <td class="currency">${formatMoney(totalRemainingBalance)}</td>
      <td class="currency">${formatMoney(invoices.reduce((s, i) => s + (Number(i.full_amount) || Number(i.total ?? i.total_amount ?? 0) || 0), 0))}</td>
      <td colspan="3"></td>
    </tr>
  </tbody>
</table>

</body>
</html>`

  // Trigger browser download as .xls (Native Excel Workbook compatible)
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const cleanMonth = selectedMonthName.replace(/[^a-zA-Z0-9]/g, '_')
  link.setAttribute('download', `Laporan_Invoice_AlliaKids_${cleanMonth}.xls`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportMonthlyInvoiceCSV(invoices: InvoiceExportData[], selectedMonthName: string = "Semua Periode") {
  const getStatusText = (st: string) => {
    switch (st) {
      case 'sudah_bayar': return 'LUNAS'
      case 'belum_bayar': return 'BELUM BAYAR'
      case 'menunggu_verifikasi': return 'MENUNGGU VERIFIKASI'
      case 'jatuh_tempo': return 'JATUH TEMPO'
      default: return (st || '-').toUpperCase()
    }
  }

  const getPaymentTypeText = (type?: string, dpPercentage?: number) => {
    switch (type) {
      case 'dp': return `DP ${dpPercentage || 50}%`
      case 'custom': return `Custom (${dpPercentage || 0}%)`
      case 'pelunasan': return 'Pelunasan (Cicilan 2)'
      case 'full': return 'Lunas 100%'
      default: return type ? type.toUpperCase() : 'Standard'
    }
  }

  const headers = [
    'No',
    'No Invoice',
    'Nama Pasien',
    'Skema Pembayaran',
    'Nominal Tagihan (IDR)',
    'Sisa Pelunasan (IDR)',
    'Total Full Sesi (IDR)',
    'Jatuh Tempo',
    'Metode Pembayaran',
    'Status'
  ]

  const rows = invoices.map((inv, idx) => {
    const totalVal = Number(inv.total ?? inv.total_amount ?? 0) || 0
    const fullAmt = Number(inv.full_amount) || 0
    const remainingAmt = fullAmt > 0 ? Math.max(0, fullAmt - totalVal) : 0
    const patientName = inv.patient_name || (inv as any).patient?.nama_lengkap || (inv as any).patient?.name || '-'

    return [
      idx + 1,
      `"${inv.invoice_number || `INV-${inv.id}`}"`,
      `"${patientName}"`,
      `"${getPaymentTypeText(inv.payment_type, inv.dp_percentage)}"`,
      totalVal,
      remainingAmt,
      fullAmt || totalVal,
      `"${inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-'}"`,
      `"${inv.payment_method === 'cash' ? 'Tunai / Cash' : 'Transfer Bank'}"`,
      `"${getStatusText(inv.status)}"`
    ].join(',')
  })

  const csvString = '\uFEFF' + [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const cleanMonth = selectedMonthName.replace(/[^a-zA-Z0-9]/g, '_')
  link.setAttribute('download', `Laporan_Invoice_AlliaKids_${cleanMonth}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
