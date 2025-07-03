'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Link2, 
  Edit, 
  Trash2,
  Video,
  User,
  Copy,
  CheckCircle,
  UserPlus
} from 'lucide-react'
import toast from 'react-hot-toast'
import InviteParticipantsModal from '@/components/InviteParticipantsModal'

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
  created_at: string
  profiles: {
    full_name: string | null
    email: string
  }
}

function getMeetingStatus(meeting: Meeting) {
  const now = new Date()
  const start = new Date(meeting.scheduled_start)
  const end = new Date(meeting.scheduled_end)
  
  if (now < start) {
    return { text: '📅 Programada' }
  } else if (now >= start && now <= end) {
    return { text: '🔴 EN VIVO' }
  } else {
    return { text: '✅ Completada' }
  }
}

function getMeetingTypeText(type: string) {
  switch (type) {
    case 'virtual': return '🖥️ Virtual'
    case 'hybrid': return '🔗 Híbrida'
    case 'in_person': return '👥 Presencial'
    default: return type
  }
}

export default function MeetingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [participants, setParticipants] = useState<unknown[]>([])
  const [invitations, setInvitations] = useState<unknown[]>([])
  
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    loadMeetingDetails()
    loadParticipants()
  }, [id])

  async function loadMeetingDetails() {
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setCurrentUserEmail(user.email)
      }

      // Cargar detalles de la reunión
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          profiles!meetings_host_id_fkey (
            full_name,
            email
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      console.log('📋 Detalles de reunión cargados:', data)
      setMeeting(data)
      
      // Verificar si el usuario actual es el creador
      if (user?.id === data.host_id) {
        setIsOwner(true)
      }
      
    } catch (error) {
      console.error('Error cargando reunión:', error)
      toast.error('❌ No se pudo cargar la reunión')
      router.push('/meetings')
    } finally {
      setLoading(false)
    }
  }

  async function loadParticipants() {
    try {
      // Cargar participantes confirmados
      const { data: participantsData } = await supabase
        .from('meeting_participants')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('meeting_id', id)

      setParticipants(participantsData || [])

      // Cargar invitaciones pendientes
      const { data: invitationsData } = await supabase
        .from('meeting_invitations')
        .select('*')
        .eq('meeting_id', id)
        .eq('status', 'pending')

      setInvitations(invitationsData || [])
    } catch (error) {
      console.error('Error cargando participantes:', error)
    }
  }

  async function handleDelete() {
    if (!meeting) return
    
    const confirmDelete = window.confirm('¿Estás seguro de que quieres eliminar esta reunión?')
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meeting.id)

      if (error) throw error

      toast.success('✅ Reunión eliminada exitosamente')
      router.push('/meetings')
    } catch (error) {
      console.error('Error eliminando reunión:', error)
      toast.error('❌ No se pudo eliminar la reunión')
    }
  }

  function copyInvitationCode() {
    if (meeting?.invitation_code) {
      navigator.clipboard.writeText(meeting.invitation_code)
      setCopied(true)
      toast.success('📋 Código copiado al portapapeles')
      setTimeout(() => setCopied(false), 3000)
    }
  }

  function handleJoinMeeting() {
  if (!meeting) return
  
  const status = getMeetingStatus(meeting)
  
  if (status.text === '📅 Programada') {
    toast.error('⏰ La reunión aún no ha comenzado')
    return
  }
  
  if (status.text === '✅ Completada') {
    toast.error('❌ Esta reunión ya ha finalizado')
    return
  }
  
  // Redirigir a la sala de video
  router.push(`/meetings/${meeting.id}/video`)
}

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-gray-400">Cargando detalles de la reunión...</div>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-gray-400">Reunión no encontrada</div>
      </div>
    )
  }

  const status = getMeetingStatus(meeting)
  const isLive = status.text === '🔴 EN VIVO'

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 shadow-sm border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <button
              onClick={() => router.push('/meetings')}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              ← Volver a reuniones
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700">
          {/* Encabezado de la reunión */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    status.text === '🔴 EN VIVO' ? 'bg-red-600 text-white' :
                    status.text === '📅 Programada' ? 'bg-blue-600 text-white' :
                    'bg-green-600 text-white'
                  }`}>
                    {status.text}
                  </span>
                </div>
                
                {meeting.description && (
                  <p className="text-gray-400 mt-2">{meeting.description}</p>
                )}
              </div>

              {isOwner && (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => router.push(`/meetings/${meeting.id}/edit`)}
                    className="px-4 py-2 text-gray-300 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-red-400 bg-red-900/20 rounded-md hover:bg-red-900/30 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Detalles de la reunión */}
          <div className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Columna izquierda */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Fecha</p>
                    <p className="font-medium text-white">
                      {new Date(meeting.scheduled_start).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Horario</p>
                    <p className="font-medium text-white">
                      {new Date(meeting.scheduled_start).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} - {new Date(meeting.scheduled_end).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Tipo de reunión</p>
                    <p className="font-medium text-white">{getMeetingTypeText(meeting.meeting_type)}</p>
                  </div>
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Participantes máximos</p>
                    <p className="font-medium text-white">{meeting.max_participants}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Creado por</p>
                    <p className="font-medium text-white">
                      {meeting.profiles.full_name || meeting.profiles.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Link2 className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-400">Código de invitación</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="font-mono text-sm bg-slate-700 px-2 py-1 rounded text-blue-400">
                        {meeting.invitation_code}
                      </code>
                      <button
                        onClick={copyInvitationCode}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {copied ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acción principal */}
          {meeting.meeting_type !== 'in_person' && (
            <div className="p-6 bg-slate-900/50 border-t border-slate-700">
              <button
                onClick={handleJoinMeeting}
                className={`w-full py-3 px-6 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                  isLive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-700 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!isLive}
              >
                <Video className="h-5 w-5" />
                {isLive ? 'Unirse a la reunión' : 
                 status.text === '📅 Programada' ? 'La reunión aún no ha comenzado' : 
                 'La reunión ha finalizado'}
              </button>
            </div>
          )}
        </div>

        {/* Sección de participantes */}
        <div className="mt-8 bg-slate-800 rounded-lg shadow-sm border border-slate-700">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Participantes</h2>
            {isOwner && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invitar
              </button>
            )}
          </div>
          <div className="p-6">
            {participants.length === 0 && invitations.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No hay participantes aún. {isOwner && 'Invita a alguien para comenzar.'}
              </p>
            ) : (
              <div className="space-y-4">
                {/* Participantes confirmados */}
                {participants.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      Confirmados ({participants.length})
                    </h3>
                    <div className="space-y-2">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {participant.profiles.full_name?.[0] || participant.profiles.email[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {participant.profiles.full_name || participant.profiles.email}
                              </p>
                              <p className="text-sm text-gray-400">{participant.profiles.email}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            participant.role === 'host' 
                              ? 'bg-purple-600/20 text-purple-400' 
                              : 'bg-slate-600/20 text-slate-400'
                          }`}>
                            {participant.role === 'host' ? 'Anfitrión' : 'Participante'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invitaciones pendientes */}
                {invitations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      Invitaciones pendientes ({invitations.length})
                    </h3>
                    <div className="space-y-2">
                      {invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3 border border-slate-600/50 border-dashed"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm">
                              <UserPlus className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-gray-300">{invitation.email}</p>
                              <p className="text-xs text-gray-500">Invitado {new Date(invitation.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-600/20 text-yellow-400">
                            Pendiente
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal de invitación */}
        {meeting && (
          <InviteParticipantsModal
            meetingId={meeting.id}
            meetingTitle={meeting.title}
            invitationCode={meeting.invitation_code}
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            onInviteSent={() => {
              loadParticipants()
              setShowInviteModal(false)
            }}
          />
        )}
      </div>
    </div>
  )
}