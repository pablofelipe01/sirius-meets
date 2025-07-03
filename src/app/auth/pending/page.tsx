'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Clock, CheckCircle, Mail, LogOut } from 'lucide-react'
import Image from 'next/image'

export default function PendingApprovalPage() {
  const [userEmail, setUserEmail] = useState<string>('')
  const [checkingStatus, setCheckingStatus] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    checkUserStatus()
    
    // Verificar el estado cada 10 segundos
    const interval = setInterval(checkUserStatus, 10000)
    
    return () => clearInterval(interval)
  }, [])

  async function checkUserStatus() {
    setCheckingStatus(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      setUserEmail(user.email || '')

      // Verificar el estado del perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, is_super_admin')
        .eq('id', user.id)
        .single()

      if (profile) {
        if (profile.status === 'approved') {
          // Usuario aprobado - redirigir
          if (profile.is_super_admin) {
            router.push('/admin/dashboard')
          } else {
            router.push('/dashboard')
          }
        } else if (profile.status === 'rejected') {
          // Usuario rechazado
          router.push('/auth/unauthorized')
        }
        // Si sigue pending, se queda en esta página
      }
    } catch (error) {
      console.error('Error verificando estado:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Sirius Regenerative"
            width={150}
            height={45}
            className="mx-auto mb-8"
          />
        </div>

        {/* Card principal */}
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6">
            <div className="flex items-center justify-center">
              <Clock className="h-12 w-12 text-white animate-pulse" />
            </div>
          </div>

          {/* Contenido */}
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              ¡Registro Exitoso!
            </h1>
            <p className="text-gray-300 mb-6">
              Tu cuenta está pendiente de aprobación
            </p>

            {/* Email del usuario */}
            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Mail className="h-4 w-4" />
                <span className="text-sm">{userEmail}</span>
              </div>
            </div>

            {/* Mensaje informativo */}
            <div className="space-y-4 text-sm text-gray-400">
              <p>
                Un administrador revisará tu solicitud y aprobará tu acceso pronto.
              </p>
              <p>
                Este proceso generalmente toma menos de 24 horas.
              </p>
              
              {/* Estado de verificación */}
              <div className="flex items-center justify-center gap-2 mt-6">
                {checkingStatus ? (
                  <>
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-blue-400">Verificando estado...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-gray-500" />
                    <span>Verificación automática cada 10 segundos</span>
                  </>
                )}
              </div>
            </div>

            {/* Información adicional */}
            <div className="mt-8 p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
              <p className="text-sm text-blue-400">
                💡 <strong>Tip:</strong> Puedes cerrar esta página. Te notificaremos cuando tu cuenta sea aprobada.
              </p>
            </div>

            {/* Botones de acción */}
            <div className="mt-8 space-y-3">
              <button
                onClick={checkUserStatus}
                disabled={checkingStatus}
                className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {checkingStatus ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Verificar Estado Ahora
                  </>
                )}
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-gray-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            ¿Necesitas ayuda? Contacta a{' '}
            <a 
              href="mailto:pablo@siriusregenerative.com" 
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              pablo@siriusregenerative.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}