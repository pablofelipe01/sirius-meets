'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { 
  Calendar, 
  Users, 
  Clock, 
  Video,
  Plus,
  LogOut,
  Shield
} from 'lucide-react'
import Image from 'next/image'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({
    totalMeetings: 0,
    upcomingMeetings: 0,
    completedMeetings: 0
  })
  const [loading, setLoading] = useState(true)
  
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Cargar perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData) {
        router.push('/auth/login')
        return
      }

      // Verificar estado
      if (profileData.status === 'pending') {
        router.push('/auth/pending')
        return
      } else if (profileData.status === 'rejected') {
        router.push('/auth/unauthorized')
        return
      }

      setUser(user)
      setProfile(profileData)

      // Cargar estadísticas
      await loadStats(user.id)
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats(userId: string) {
    try {
      // Total de reuniones
      const { count: total } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', userId)

      // Reuniones próximas
      const { count: upcoming } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', userId)
        .gte('scheduled_start', new Date().toISOString())

      // Reuniones completadas
      const { count: completed } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', userId)
        .lt('scheduled_end', new Date().toISOString())

      setStats({
        totalMeetings: total || 0,
        upcomingMeetings: upcoming || 0,
        completedMeetings: completed || 0
      })
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Cargando dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="Sirius Regenerative"
                width={120}
                height={36}
                className="h-8 w-auto"
              />
              <div className="h-8 w-px bg-slate-600" />
              <h1 className="text-xl font-semibold text-white">Dashboard</h1>
              {profile?.is_super_admin && (
                <span className="ml-2 text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded-full">
                  Super Admin
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {profile?.is_super_admin && (
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2 text-white text-sm font-medium"
                >
                  <Shield className="h-4 w-4" />
                  Panel Admin
                </button>
              )}
              
              <div className="text-sm text-gray-400">
                {profile?.full_name || user?.email}
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bienvenida */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            ¡Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}! 👋
          </h2>
          <p className="text-gray-400">
            Bienvenido a Sirius Meetings. Aquí está tu resumen del día.
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-600/20 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-white">{stats.totalMeetings}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Total de Reuniones</h3>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-600/20 rounded-lg">
                <Clock className="h-6 w-6 text-green-400" />
              </div>
              <span className="text-2xl font-bold text-white">{stats.upcomingMeetings}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Reuniones Próximas</h3>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-600/20 rounded-lg">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-white">{stats.completedMeetings}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Reuniones Completadas</h3>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/meetings/create')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Nueva Reunión</span>
                </div>
                <span className="text-blue-200">→</span>
              </button>

              <button
                onClick={() => router.push('/meetings')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-lg p-4 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Ver Mis Reuniones</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Próxima Reunión</h3>
            {stats.upcomingMeetings > 0 ? (
              <div className="space-y-3">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Video className="h-5 w-5 text-blue-400" />
                    <span className="font-medium text-white">Reunión de Equipo</span>
                  </div>
                  <p className="text-sm text-gray-400">Hoy a las 3:00 PM</p>
                  <button className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    Ver detalles →
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-gray-400">No tienes reuniones próximas</p>
                <button
                  onClick={() => router.push('/meetings/create')}
                  className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Programar una reunión →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}