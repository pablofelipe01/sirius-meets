'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import Image from 'next/image'
import { 
  Video, 
  Users, 
  Calendar, 
  Shield, 
  Zap, 
  Globe,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

export default function LandingPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Si el usuario está autenticado, redirigir según su estado
        const { data: profile } = await supabase
          .from('profiles')
          .select('status, is_super_admin')
          .eq('id', user.id)
          .single()

        if (profile) {
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
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    )
  }

  const features = [
    {
      icon: <Video className="h-6 w-6" />,
      title: "Reuniones Virtuales HD",
      description: "Video y audio de alta calidad con tecnología de Sirius Agentics IA"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Gestión de Participantes",
      description: "Invita a miembros del equipo y colaboradores externos"
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Programación Inteligente",
      description: "Organiza reuniones virtuales, presenciales o híbridas"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Seguridad Empresarial",
      description: "Acceso exclusivo para miembros de Sirius Regenerative"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Transcripciones con IA",
      description: "Obtén resúmenes automáticos de tus reuniones"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Acceso Global",
      description: "Conecta con tu equipo desde cualquier lugar"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <Image
                src="/logo.png"
                alt="Sirius Regenerative"
                width={200}
                height={60}
                priority
              />
            </div>
            
            {/* Título y subtítulo */}
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Sirius Meetings
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              La plataforma de reuniones exclusiva para el equipo de Sirius Regenerative
            </p>
            
            {/* CTAs */}
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={() => router.push('/auth/login')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                Iniciar Sesión
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => router.push('/auth/login')}
                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
              >
                Registrarse
              </button>
            </div>
            
            {/* Badge */}
            <div className="mt-12 inline-flex items-center gap-2 text-sm text-gray-400">
              <Shield className="h-4 w-4" />
              Solo para emails @siriusregenerative.com
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para reuniones productivas
            </h2>
            <p className="text-xl text-gray-400">
              Diseñado específicamente para las necesidades de Sirius Regenerative
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition-colors border border-slate-700"
              >
                <div className="text-blue-400 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              ¿Cómo funciona?
            </h2>
            <p className="text-xl text-gray-400">
              Comienza a usar Sirius Meetings en 3 simples pasos
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Regístrate</h3>
              <p className="text-gray-400">
                Usa tu email corporativo @siriusregenerative.com
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Espera aprobación</h3>
              <p className="text-gray-400">
                Un administrador verificará tu cuenta
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">¡Crea reuniones!</h3>
              <p className="text-gray-400">
                Organiza reuniones virtuales o presenciales
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Únete a tus compañeros de Sirius Regenerative en la nueva plataforma de reuniones
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-lg transition-colors inline-flex items-center gap-2"
          >
            Comenzar ahora
            <ArrowRight className="h-5 w-5" />
          </button>
          
          <div className="mt-8 flex items-center justify-center gap-4 text-sm text-gray-400">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Acceso exclusivo para el equipo</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>100% seguro</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Sin costos adicionales</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Sirius Regenerative"
                width={100}
                height={30}
                className="opacity-80"
              />
              <span className="text-gray-400">© 2024 Sirius Regenerative</span>
            </div>
            
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="https://www.siriusregenerative.co/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Sitio principal
              </a>
              <a href="mailto:pablo@siriusregenerative.com" className="hover:text-white transition-colors">
                Soporte
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}