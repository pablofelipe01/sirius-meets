'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Calendar, Clock, Users, Video } from 'lucide-react'
import toast from 'react-hot-toast'

interface Meeting {
  id: string
  title: string
  description: string | null
  meeting_type: 'virtual' | 'hybrid' | 'in_person'
  scheduled_start: string
  scheduled_end: string
  max_participants: number
  host_id: string
  invitation_code: string
  agora_channel_name: string
  profiles: {
    full_name: string | null
    email: string
  }
}

export default function JoinMeetingPage() {
  const params = useParams()
  const router = useRouter()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadMeetingByCode()
  }, [params.code])

  async function loadMeetingByCode() {
    try {
      const code = params.code as string
      console.log('🔍 Buscando reunión con código:', code)

      // Buscar la reunión por código
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select(`
          *,
          profiles!meetings_host_id_fkey (
            full_name,
            email
          )
        `)
        .eq('invitation_code', code.toUpperCase())
        .single()

      if (meetingError || !meetingData) {
        console.error('Error buscando reunión:', meetingError)
        toast.error('Código de invitación inválido')
        router.push('/')
        return
      }

      console.log('✅ Reunión encontrada:', meetingData)
      setMeeting(meetingData)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al buscar la reunión')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!meeting) return
    
    setJoining(true)
    
    try {
      // Verificar si el usuario está autenticado
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Guardar la URL de destino
        sessionStorage.setItem('redirectAfterLogin', `/join/${params.code}`)
        router.push('/auth/login')
        return
      }

      // Verificar si ya es participante
      const { data: existingParticipant } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meeting.id)
        .eq('user_id', user.id)
        .single()

      if (!existingParticipant) {
        // Agregar como participante
        const { error: participantError } = await supabase
          .from('meeting_participants')
          .insert([{
            meeting_id: meeting.id,
            user_id: user.id,
            participant_role: 'participant',
            joined_at: new Date().toISOString()
          }])

        if (participantError) {
          console.error('Error agregando participante:', participantError)
          toast.error('Error al unirse a la reunión')
          return
        }
      }

      // Ir a la sala de video
      router.push(`/meetings/${meeting.id}/video`)
    } catch (error) {
      console.error('Error al unirse:', error)
      toast.error('Error al procesar la solicitud')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando reunión...</p>
        </div>
      </div>
    )
  }

  if (!meeting) {
    return null
  }

  const startDate = new Date(meeting.scheduled_start)
  const endDate = new Date(meeting.scheduled_end)
  const now = new Date()
  const isLive = now >= startDate && now <= endDate

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Únete a la reunión</h1>
          <p className="text-gray-400">Has sido invitado a participar</p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">{meeting.title}</h2>
            {meeting.description && (
              <p className="text-gray-400">{meeting.description}</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-300">
              <Calendar className="h-5 w-5 text-gray-500" />
              <span>
                {startDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            <div className="flex items-center gap-3 text-gray-300">
              <Clock className="h-5 w-5 text-gray-500" />
              <span>
                {startDate.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })} - {endDate.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div className="flex items-center gap-3 text-gray-300">
              <Users className="h-5 w-5 text-gray-500" />
              <span>Organizado por {meeting.profiles.full_name || meeting.profiles.email}</span>
            </div>
          </div>

          {isLive && (
            <div className="bg-red-600/20 border border-red-600 rounded-lg p-3 text-center">
              <p className="text-red-400 font-medium">🔴 Reunión en vivo ahora</p>
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={joining || !isLive}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isLive
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {joining ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Uniéndose...
              </>
            ) : (
              <>
                <Video className="h-5 w-5" />
                {isLive ? 'Unirse a la reunión' : 'La reunión no ha comenzado'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}