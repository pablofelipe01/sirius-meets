'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

interface Meeting {
  id: string
  title: string
  description: string | null
  meeting_type: 'virtual' | 'hybrid' | 'in_person'
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  scheduled_start: string
  scheduled_end: string
  max_participants: number
  invitation_code: string | null
  created_at: string
}

export default function MeetingsListPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [user, setUser] = useState<unknown>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  const supabase = createSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    const initPage = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)
      await loadMeetings(user.id)
      setLoading(false)
    }

    initPage()
  }, [supabase, router])

  const loadMeetings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('host_id', userId)
        .order('scheduled_start', { ascending: false })

      if (error) throw error

      console.log('📅 Reuniones cargadas:', data)
      setMeetings(data || [])
    } catch (error) {
      console.error('Error loading meetings:', error)
    }
  }

  const getFilteredMeetings = () => {
    const now = new Date()
    
    switch (filter) {
      case 'upcoming':
        return meetings.filter(m => new Date(m.scheduled_start) > now)
      case 'past':
        return meetings.filter(m => new Date(m.scheduled_end) < now)
      default:
        return meetings
    }
  }

  const getMeetingIcon = (type: string) => {
    switch (type) {
      case 'virtual': return '🖥️'
      case 'hybrid': return '🔗'
      case 'in_person': return '👥'
      default: return '📅'
    }
  }

  const getStatusColor = (meeting: Meeting) => {
    const now = new Date()
    const start = new Date(meeting.scheduled_start)
    const end = new Date(meeting.scheduled_end)

    if (now >= start && now <= end) {
      return 'bg-green-600' // En vivo
    } else if (start > now) {
      return 'bg-blue-600' // Próxima
    } else {
      return 'bg-gray-600' // Pasada
    }
  }

  const getStatusText = (meeting: Meeting) => {
    const now = new Date()
    const start = new Date(meeting.scheduled_start)
    const end = new Date(meeting.scheduled_end)

    if (now >= start && now <= end) {
      return '🔴 EN VIVO'
    } else if (start > now) {
      return '📅 Programada'
    } else {
      return '✅ Completada'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando reuniones...</div>
      </div>
    )
  }

  const filteredMeetings = getFilteredMeetings()

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">📋 Mis Reuniones</h1>
            <p className="text-slate-400">Gestiona todas tus reuniones</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/meetings/create')}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              📅 Nueva Reunión
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Filtros */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            Todas ({meetings.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'upcoming' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            Próximas ({meetings.filter(m => new Date(m.scheduled_start) > new Date()).length})
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'past' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            Pasadas ({meetings.filter(m => new Date(m.scheduled_end) < new Date()).length})
          </button>
        </div>

        {/* Lista de reuniones */}
        {filteredMeetings.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">
              {filter === 'all' ? 'No tienes reuniones aún' : 
               filter === 'upcoming' ? 'No tienes reuniones próximas' : 
               'No tienes reuniones pasadas'}
            </h3>
            <p className="text-slate-400 mb-6">
              {filter === 'all' ? 'Crea tu primera reunión para empezar' : 'Cambia el filtro para ver otras reuniones'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/meetings/create')}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors"
              >
                📅 Crear Primera Reunión
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => (
              <div 
                key={meeting.id} 
                className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition-colors cursor-pointer"
                onClick={() => router.push(`/meetings/${meeting.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">{getMeetingIcon(meeting.meeting_type)}</span>
                      <h3 className="text-xl font-semibold hover:text-blue-400 transition-colors">
                        {meeting.title}
                      </h3>
                      <span className={`ml-3 px-2 py-1 rounded text-xs ${getStatusColor(meeting)}`}>
                        {getStatusText(meeting)}
                      </span>
                    </div>
                    
                    {meeting.description && (
                      <p className="text-slate-300 mb-3">{meeting.description}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                      <div>
                        <strong>Inicio:</strong> {formatDate(meeting.scheduled_start)}
                      </div>
                      <div>
                        <strong>Fin:</strong> {formatDate(meeting.scheduled_end)}
                      </div>
                      <div>
                        <strong>Tipo:</strong> {
                          meeting.meeting_type === 'virtual' ? 'Virtual' :
                          meeting.meeting_type === 'hybrid' ? 'Híbrida' : 'Presencial'
                        }
                      </div>
                      <div>
                        <strong>Max participantes:</strong> {meeting.max_participants}
                      </div>
                      {meeting.invitation_code && (
                        <div>
                          <strong>Código:</strong> 
                          <span className="ml-2 bg-slate-700 px-2 py-1 rounded font-mono">
                            {meeting.invitation_code}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation() // Evitar que se active el click del div padre
                        router.push(`/meetings/${meeting.id}`)
                      }}
                      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}