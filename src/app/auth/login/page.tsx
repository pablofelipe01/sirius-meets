'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import toast from 'react-hot-toast'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

const registerSchema = loginSchema.extend({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type LoginFormData = z.infer<typeof loginSchema>
type RegisterFormData = z.infer<typeof registerSchema>

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()
  
  // Verificar si viene de una invitación
  const joinCode = searchParams.get('join')

  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: signupErrors },
    watch
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  })

  const watchEmail = watch('email')

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      handlePostLogin(user.id)
    }
  }

  async function handlePostLogin(userId: string) {
    // Verificar el estado del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, is_super_admin')
      .eq('id', userId)
      .single()

    if (profile) {
      // Verificar si hay una redirección pendiente guardada en sessionStorage
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin')
      if (redirectUrl && profile.status === 'approved') {
        sessionStorage.removeItem('redirectAfterLogin')
        router.push(redirectUrl)
        return
      }

      // Si viene de una invitación y está aprobado
      if (joinCode && profile.status === 'approved') {
        const storedCode = sessionStorage.getItem('joinMeetingCode')
        sessionStorage.removeItem('joinMeetingCode')
        router.push(`/join/${storedCode || joinCode}`)
        return
      }

      // Flujo normal de redirección
      if (profile.is_super_admin) {
        router.push('/admin/dashboard')
      } else if (profile.status === 'approved') {
        router.push('/dashboard')
      } else if (profile.status === 'pending') {
        router.push('/auth/pending')
      } else {
        router.push('/auth/unauthorized')
      }
    }
  }

  async function onLoginSubmit(data: LoginFormData) {
    setLoading(true)
    
    try {
      console.log('🔐 Intentando login con:', data.email)
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) throw error

      console.log('✅ Login exitoso:', authData.user?.email)
      toast.success('¡Bienvenido de vuelta!')
      
      if (authData.user) {
        await handlePostLogin(authData.user.id)
      }
    } catch (error: unknown) {
      console.error('❌ Error en login:', error)
      toast.error(error.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  async function onRegisterSubmit(data: RegisterFormData) {
    // Validar que sea un email de Sirius
    if (!data.email.endsWith('@siriusregenerative.com')) {
      toast.error('Solo se permiten emails @siriusregenerative.com')
      return
    }

    setLoading(true)
    
    try {
      console.log('📝 Intentando registro con:', data.email)
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          }
        }
      })

      if (signUpError) throw signUpError

      console.log('✅ Registro exitoso:', authData)
      
      // Actualizar el nombre completo en el perfil
      if (authData.user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ full_name: data.fullName })
          .eq('id', authData.user.id)

        if (updateError) {
          console.error('Error actualizando perfil:', updateError)
        }
      }

      toast.success('¡Registro exitoso! Tu cuenta está pendiente de aprobación.')
      router.push('/auth/pending')
    } catch (error: unknown) {
      console.error('❌ Error en registro:', error)
      toast.error(error.message || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-slate-700">
        <h1 className="text-3xl font-bold text-center mb-2 text-white">
          {isLogin ? '🔐 Iniciar Sesión' : '📝 Registrarse'}
        </h1>
        <p className="text-center text-gray-400 mb-6">
          {isLogin ? 'Accede a Sirius Meetings' : 'Crea tu cuenta en Sirius Meetings'}
        </p>

        {joinCode && (
          <div className="mb-6 p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
            <p className="text-sm text-blue-400">
              🔗 Inicia sesión para unirte a la reunión
            </p>
          </div>
        )}
        
        {isLogin ? (
          <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                {...registerLogin('email')}
                type="email"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="tu@siriusregenerative.com"
              />
              {loginErrors.email && (
                <p className="mt-1 text-sm text-red-400">{loginErrors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contraseña
              </label>
              <input
                {...registerLogin('password')}
                type="password"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {loginErrors.password && (
                <p className="mt-1 text-sm text-red-400">{loginErrors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitSignup(onRegisterSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre Completo
              </label>
              <input
                {...registerSignup('fullName')}
                type="text"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Juan Pérez"
              />
              {signupErrors.fullName && (
                <p className="mt-1 text-sm text-red-400">{signupErrors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email Corporativo
              </label>
              <input
                {...registerSignup('email')}
                type="email"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="tu@siriusregenerative.com"
              />
              {signupErrors.email && (
                <p className="mt-1 text-sm text-red-400">{signupErrors.email.message}</p>
              )}
              {watchEmail && !watchEmail.endsWith('@siriusregenerative.com') && watchEmail.includes('@') && (
                <p className="mt-1 text-sm text-yellow-400">
                  ⚠️ Solo se permiten emails @siriusregenerative.com
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contraseña
              </label>
              <input
                {...registerSignup('password')}
                type="password"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {signupErrors.password && (
                <p className="mt-1 text-sm text-red-400">{signupErrors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Confirmar Contraseña
              </label>
              <input
                {...registerSignup('confirmPassword')}
                type="password"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {signupErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{signupErrors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (watchEmail && !watchEmail.endsWith('@siriusregenerative.com'))}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )
}