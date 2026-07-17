import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface RecentPatientsProps {
  patients: any[]
}

export function RecentSales({ patients }: RecentPatientsProps) {
  const getInitials = (name: string) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'baru':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-200'
      case 'aktif':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200'
      case 'selesai':
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-200 border-neutral-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className='space-y-6'>
      {patients && patients.length > 0 ? (
        patients.map((patient) => (
          <div key={patient.id} className='flex items-center gap-4'>
            <Avatar className='h-9 w-9'>
              <AvatarFallback className='bg-primary/10 text-primary font-bold'>
                {getInitials(patient.nama_lengkap)}
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-1 flex-wrap items-center justify-between gap-2'>
              <div className='space-y-0.5'>
                <p className='text-sm font-semibold leading-none'>{patient.nama_lengkap}</p>
                <p className='text-xs text-muted-foreground'>
                  {patient.no_telepon || '-'} • Usia: {patient.usia} Tahun
                </p>
                <div className='pt-1'>
                  <Badge variant='secondary' className='text-[10px] py-0 px-1.5 font-normal'>
                    {patient.jenis_terapi}
                  </Badge>
                </div>
              </div>
              <div>
                <Badge variant='outline' className={`text-xs capitalize ${getStatusBadgeColor(patient.status)}`}>
                  {patient.status}
                </Badge>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className='text-center text-sm text-muted-foreground py-4'>
          Belum ada pendaftaran pasien baru.
        </div>
      )}
    </div>
  )
}
