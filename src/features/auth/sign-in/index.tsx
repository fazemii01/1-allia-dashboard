import { Link, useSearch } from '@tanstack/react-router'
import { Logo } from '@/assets/logo'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <div className='relative min-h-svh w-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background overflow-x-hidden'>
      {/* Left Column: Premium Branding & Dynamic Glassmorphism (Visible on Desktop) */}
      <div className='relative hidden h-full flex-col justify-between p-12 text-white lg:flex bg-[#0b1329] overflow-hidden select-none'>
        {/* Soft Organic Mesh Gradients */}
        <div className='absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#09355c] to-[#0a7cc3]' />
        <div className='absolute top-[12%] right-[10%] size-80 rounded-full bg-[#f46b1e]/15 blur-3xl animate-pulse duration-[8000ms]' />
        <div className='absolute bottom-[10%] left-[5%] size-[400px] rounded-full bg-[#0a7cc3]/20 blur-3xl animate-pulse duration-[6000ms]' />
        
        {/* Decorative Wave Shapes */}
        <div className='absolute -bottom-10 -left-10 opacity-10 pointer-events-none'>
          <svg width='400' height='400' viewBox='0 0 100 100' fill='currentColor' className='text-white'>
            <path d='M0,50 Q25,70 50,50 T100,50 L100,100 L0,100 Z' />
          </svg>
        </div>

        {/* Top Header */}
        <div className='relative z-10 flex items-center gap-3 font-manrope'>
          <div className='flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg'>
            <Logo className='text-white size-6' />
          </div>
          <div>
            <span className='text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent'>Allia Kids</span>
            <span className='block text-[10px] tracking-wider uppercase text-slate-400 font-medium'>Admin Hub</span>
          </div>
        </div>

        {/* Dynamic Glassmorphic Experience Card */}
        <div className='relative z-10 my-auto max-w-lg'>
          <div className='group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden transition-all duration-500 hover:border-white/20 hover:bg-white/10'>
            {/* Soft inner glow overlay */}
            <div className='absolute -right-20 -top-20 size-40 rounded-full bg-[#f46b1e]/10 blur-2xl group-hover:bg-[#f46b1e]/20 transition-all duration-500' />
            
            <div className='flex items-center gap-2 mb-4'>
              <span className='inline-flex items-center rounded-full bg-[#f46b1e]/20 px-3 py-1 text-xs font-semibold text-[#f58d50] border border-[#f46b1e]/30 shadow-xs'>
                ✨ Prioritas Tumbuh Kembang
              </span>
            </div>
            
            <blockquote className='space-y-4'>
              <p className='text-lg font-medium leading-relaxed font-manrope text-slate-100'>
                "Tumbuh kembang buah hati adalah prioritas utama. Kelola layanan, aktivitas terapis, serta program belajar Allia Kids secara presisi untuk senyum terbaik mereka."
              </p>
              <footer className='pt-2 border-t border-white/10'>
                <div className='font-bold text-white text-sm'>Tim Tumbuh Kembang</div>
                <div className='text-xs text-slate-400'>Divisi Terapi & Layanan Anak Allia Kids</div>
              </footer>
            </blockquote>
          </div>
        </div>

        {/* Bottom Credits Footer */}
        <div className='relative z-10 text-xs text-slate-400 font-medium'>
          © {new Date().getFullYear()} Allia Kids. Hak Cipta Dilindungi.
        </div>
      </div>

      {/* Right Column: Interaction Form */}
      <div className='flex h-full items-center justify-center p-8 bg-slate-50/30 dark:bg-slate-950/20 backdrop-blur-xs'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[420px] bg-background border border-border/60 dark:border-border/30 rounded-2xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none'>
          
          <div className='flex flex-col space-y-2 text-center sm:text-left'>
            {/* Small Brand Tag for Mobile View */}
            <div className='flex lg:hidden items-center justify-center gap-2 mb-2'>
              <Logo className='text-[#0a7cc3] size-7' />
              <h1 className='text-lg font-bold font-manrope tracking-tight text-[#0a7cc3]'>Allia Kids</h1>
            </div>

            <h1 className='text-2xl sm:text-3xl font-extrabold tracking-tight font-manrope text-foreground'>
              Selamat Datang
            </h1>
            <p className='text-sm text-muted-foreground'>
              Masukkan email dan kata sandi Anda untuk mengakses dashboard admin.
            </p>
          </div>

          {/* Sign In Form */}
          <UserAuthForm redirectTo={redirect} />

          {/* Legal Footer Links */}
          <p className='px-4 text-center text-xs text-muted-foreground leading-relaxed'>
            Dengan masuk ke sistem, Anda menyetujui{' '}
            <a
              href='/terms'
              className='underline underline-offset-4 hover:text-[#0a7cc3] transition-colors'
            >
              Ketentuan Layanan
            </a>{' '}
            dan{' '}
            <a
              href='/privacy'
              className='underline underline-offset-4 hover:text-[#0a7cc3] transition-colors'
            >
              Kebijakan Privasi
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

