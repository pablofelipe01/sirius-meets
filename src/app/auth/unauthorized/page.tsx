'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { XCircle, Mail, LogOut, Home } from 'lucide-react'
import Image from 'next/image'

export default function UnauthorizedPage() {
  const [userEmail, setUserEmail] = useState<string>('')
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    setUserEmail(user.email || '')

    // Verificar si el estado cambió
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()

    if (profile && profile.status === 'approved') {
      // Si fue aprobado mientras tanto, redirigir
      router.push('/dashboard')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
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
          {/* Header con gradiente rojo */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
            <div className="flex items-center justify-center">
              <XCircle className="h-12 w-12 text-white" />
            </div>
          </div>

          {/* Contenido */}
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              Acceso No Autorizado
            </h1>
            <p className="text-gray-300 mb-6">
              Tu solicitud de acceso no ha sido aprobada
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
                Lamentablemente, tu solicitud de acceso a Sirius Meetings no ha sido aprobada.
              </p>
              <p>
                Esto puede deberse a que:
              </p>
              <ul className="text-left space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>No eres parte del equipo de Sirius Regenerative</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>Tu email corporativo no está verificado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>Hubo un error en el proceso de verificación</span>
                </li>
              </ul>
            </div>

            {/* Contacto */}
            <div className="mt-8 p-4 bg-yellow-600/10 border border-yellow-600/30 rounded-lg">
              <p className="text-sm text-yellow-400">
                Si crees que esto es un error, por favor contacta al administrador:
              </p>
              <a 
                href="mailto:pablo@siriusregenerative.com" 
                className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                pablo@siriusregenerative.com
              </a>
            </div>

            {/* Botones de acción */}
            <div className="mt-8 space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                Volver al Inicio
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
      </div>
    </div>
  )
}