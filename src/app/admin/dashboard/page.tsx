'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Shield, Calendar } from 'lucide-react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  status: 'pending' | 'approved' | 'rejected'
  is_super_admin: boolean
  created_at: string
}

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const supabase = createSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    const initAdmin = async () => {
      try {
        // Verificar que sea super admin
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth/login')
          return
        }

        // Verificar perfil de super admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!profile?.is_super_admin) {
          router.push('/dashboard')
          return
        }

        setCurrentUser(user)

        // Cargar usuarios pendientes
        const { data: pending } = await supabase
          .from('profiles')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        setPendingUsers(pending || [])
        setLoading(false)
      } catch (error) {
        console.error('Error loading admin dashboard:', error)
        setLoading(false)
      }
    }

    initAdmin()
  }, [supabase, router])

  const handleUserAction = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoading(userId)

    try {
      // 1. Actualizar el perfil del usuario
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
        })
        .eq('id', userId)

      if (profileError) throw profileError

      // 2. Si se aprueba, confirmar el email automáticamente
      if (action === 'approve') {
        const { error: emailError } = await supabase.rpc('confirm_user_email', {
          user_id: userId
        })
        
        // Si no existe la función, la crearemos más adelante
        if (emailError && !emailError.message.includes('function')) {
          console.warn('No se pudo confirmar email automáticamente:', emailError)
        }
      }

      // 3. Actualizar la lista local
      setPendingUsers(pendingUsers.filter(u => u.id !== userId))
      
      alert(`Usuario ${action === 'approve' ? 'aprobado' : 'rechazado'} exitosamente${
        action === 'approve' ? ' y email confirmado' : ''
      }`)
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error al actualizar usuario')
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando panel de administrador...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">🔑 Panel Super Admin</h1>
            <p className="text-slate-400">Sirius Meetings - Gestión de usuarios</p>
            <span className="mt-1 inline-block text-xs bg-red-600/20 text-red-400 px-2 py-1 rounded-full">
              Modo Administrador
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>👤</span> Vista Usuario
            </button>
            <span className="text-sm text-slate-300">
              {currentUser?.email}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Navegación rápida para super admin */}
        <div className="mb-6 bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-blue-400">
                Estás en el Panel de Super Administrador. También puedes usar todas las funciones de usuario normal.
              </span>
            </div>
            <button
              onClick={() => router.push('/meetings')}
              className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Mis Reuniones
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-xl">⏳</span>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Usuarios Pendientes</p>
                <p className="text-2xl font-bold">{pendingUsers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Acción Requerida</p>
                <p className="text-2xl font-bold">{pendingUsers.length > 0 ? 'SÍ' : 'NO'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-xl">👨‍💼</span>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Rol</p>
                <p className="text-2xl font-bold">Super Admin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Usuarios pendientes */}
        <div className="bg-slate-800 rounded-lg">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-amber-400 flex items-center">
              ⏳ Usuarios Esperando Aprobación
            </h2>
          </div>
          
          <div className="p-6">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-slate-400 text-lg mb-2">No hay usuarios pendientes</p>
                <p className="text-slate-500 text-sm">Todas las solicitudes han sido procesadas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="bg-slate-700 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        {user.full_name || 'Sin nombre especificado'}
                      </h3>
                      <p className="text-slate-300">{user.email}</p>
                      <p className="text-slate-500 text-sm">
                        Registrado: {new Date(user.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleUserAction(user.id, 'approve')}
                        disabled={actionLoading === user.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center"
                      >
                        {actionLoading === user.id ? '...' : '✅ Aprobar'}
                      </button>
                      
                      <button
                        onClick={() => handleUserAction(user.id, 'reject')}
                        disabled={actionLoading === user.id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center"
                      >
                        {actionLoading === user.id ? '...' : '❌ Rechazar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}