import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { sleep, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Please enter your email.' : undefined),
  }),
  password: z
    .string()
    .min(1, 'Please enter your password.')
    .min(4, 'Password must be at least 4 characters long.'),
  rememberMe: z.boolean().optional(),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      })

      if (!response.ok) {
        let msg = 'Masuk gagal. Periksa kembali email dan password Anda.'
        try {
          const errData = await response.json()
          msg = errData?.message ?? msg
        } catch {}
        throw new Error(msg)
      }

      const resData = await response.json() // { access_token, user: { id, name, whatsapp, email, role } }

      // Persist token for apiFetch
      localStorage.setItem('admin_token', resData.access_token)

      auth.setUser({
        accountNo: `ACC00${resData.user.id}`,
        email: resData.user.email ?? '',
        name: resData.user.name,
        role: [resData.user.role],
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (matching backend JWT token lifetime)
      })

      // Set token in store (calls setCookie internally)
      auth.setAccessToken(resData.access_token)

      toast.success(`Selamat datang kembali, ${resData.user.name}!`)

      // Redirect to dashboard
      const targetPath = redirectTo || '/'
      navigate({ to: targetPath, replace: true })
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-4', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='font-manrope font-semibold text-slate-700 dark:text-slate-300 text-xs tracking-wide'>
                Email
              </FormLabel>
              <FormControl>
                <Input
                  placeholder='nama@email.com'
                  className='h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus-visible:ring-[#0a7cc3]/30 focus-visible:border-[#0a7cc3] focus-visible:ring-[3px] transition-all duration-200'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='font-manrope font-semibold text-slate-700 dark:text-slate-300 text-xs tracking-wide'>
                Kata Sandi
              </FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='••••••••'
                  inputClassName='h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus-visible:ring-[#0a7cc3]/30 focus-visible:border-[#0a7cc3] focus-visible:ring-[3px] transition-all duration-200'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='rememberMe'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center space-y-0 gap-2 py-1'>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className='rounded-[5px] border-slate-300 dark:border-slate-800 data-[state=checked]:bg-[#0a7cc3] data-[state=checked]:border-[#0a7cc3]'
                />
              </FormControl>
              <FormLabel className='font-manrope font-semibold text-slate-600 dark:text-slate-400 text-xs cursor-pointer select-none'>
                Ingat saya
              </FormLabel>
            </FormItem>
          )}
        />
        <Button
          className='mt-2 h-11 rounded-xl bg-gradient-to-r from-[#0a7cc3] to-[#0868a8] hover:from-[#f46b1e] hover:to-[#d85512] text-white font-semibold font-manrope shadow-md shadow-blue-500/10 hover:shadow-orange-500/10 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 gap-2 border-none cursor-pointer'
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn className='size-4' />}
          Masuk
        </Button>
      </form>
    </Form>
  )
}
