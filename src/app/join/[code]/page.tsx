'use client'

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Link2, Video, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function JoinMeetingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [loading, setLoading] = useState(true)
  const [meetingInfo, setMeetingInfo] = useState<any>(null)
  const [joiningAs, setJoiningAs] = useState<'authenticated' | 'guest' | null>(null)
  const [guestInfo, setGuestInfo] = useState<any>(null)
  
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    handleJoinFlow()
  }, [])

  async function handleJoinFlow() {
    try {
      // Primero verificar si el código es válido
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select(`
          *,
          profiles:host_id (
            full_name,
            email
          )
        `)
        .eq('invitation_code', code.toUpperCase())
        .single()

      if (meetingError || !meeting) {
        // Podría ser un link único de invitación
        await checkUniqueInvitation()
        return
      }

      // Verificar el estado de la reunión
      const now = new Date()
      const end = new Date(meeting.scheduled_end)

      if (now > end) {
        toast.error('Esta reunión ya ha finalizado')
        router.push('/')
        return
      }

      setMeetingInfo(meeting)

      // Verificar si el usuario está autenticado
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Usuario autenticado - unirse directamente
        setJoiningAs('authenticated')
        await joinAsAuthenticatedUser(user.id, meeting.id)
      } else {
        // No autenticado - mostrar opciones
        setLoading(false)
      }
    } catch (error) {
      console.error('Error en flujo de unión:', error)
      toast.error('Error al procesar la invitación')
      router.push('/')
    }
  }

  async function checkUniqueInvitation() {
    try {
      // Buscar si es un código único de invitación
      const { data: invitation, error } = await supabase
        .from('meeting_invitations')
        .select(`
          *,
          meetings!inner (
            *,
            profiles:host_id (
              full_name,
              email
            )
          )
        `)
        .eq('unique_code', code)
        .eq('status', 'pending')
        .single()

      if (error || !invitation) {
        toast.error('Link de invitación inválido o expirado')
        router.push('/')
        return
      }

      const meeting = invitation.meetings

      // Verificar el estado de la reunión
      const now = new Date()
      const end = new Date(meeting.scheduled_end)

      if (now > end) {
        toast.error('Esta reunión ya ha finalizado')
        router.push('/')
        return
      }

      setMeetingInfo(meeting)
      setGuestInfo({
        email: invitation.email,
        name: invitation.email.split('@')[0] // Usar parte del email como nombre por defecto
      })
      setJoiningAs('guest')

      // Actualizar estado de invitación
      await supabase
        .from('meeting_invitations')
        .update({ 
          status: 'joined',
          joined_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      // Proceder a unirse
      await joinAsGuest(invitation)
    } catch (error) {
      console.error('Error verificando invitación única:', error)
      toast.error('Error al verificar la invitación')
      router.push('/')
    }
  }

  async function joinAsAuthenticatedUser(userId: string, meetingId: string) {
    try {
      // Verificar si ya es participante
      const { data: existingParticipant } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('user_id', userId)
        .single()

      if (!existingParticipant) {
        // Agregar como participante
        const { error } = await supabase
          .from('meeting_participants')
          .insert({
            meeting_id: meetingId,
            user_id: userId,
            role: 'participant',
            joined_at: new Date().toISOString()
          })

        if (error) throw error
      }

      // Redirigir a la reunión
      toast.success('✅ Entrando a la reunión...')
      router.push(`/meetings/${meetingId}`)
    } catch (error) {
      console.error('Error uniéndose como usuario autenticado:', error)
      toast.error('Error al unirse a la reunión')
      setLoading(false)
    }
  }

  async function joinAsGuest(invitation: any) {
    try {
      // Guardar información del invitado en sessionStorage
      sessionStorage.setItem('guestMeetingAccess', JSON.stringify({
        meetingId: meetingInfo.id,
        guestEmail: invitation.email,
        guestName: guestInfo.name,
        invitationId: invitation.id
      }))

      // Por ahora mostrar mensaje mientras se implementa la sala de video
      toast.success('🎉 ¡Bienvenido a la reunión!')
      
      // En el futuro, aquí redirigiríamos directamente a la sala de video
      // router.push(`/meeting-room/${meetingInfo.id}`)
      
      setLoading(false)
      
      // Mostrar información temporal
      setTimeout(() => {
        toast.info('La sala de video estará disponible pronto', {
          duration: 5000
        })
      }, 1000)
    } catch (error) {
      console.error('Error uniéndose como invitado:', error)
      toast.error('Error al unirse a la reunión')
      setLoading(false)
    }
  }

  async function handleLoginRedirect() {
    sessionStorage.setItem('joinMeetingCode', code)
    router.push(`/auth/login?join=${code}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Preparando tu acceso a la reunión...</p>
        </div>
      </div>
    )
  }

  if (!meetingInfo) {
    return null
  }

  // Si es un invitado con link único, mostrar pantalla de bienvenida
  if (joiningAs === 'guest' && guestInfo) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
              <Video className="h-16 w-16 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">¡Bienvenido!</h1>
              <p className="text-blue-100">Te has unido exitosamente a la reunión</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white mb-2">{meetingInfo.title}</h2>
                <p className="text-gray-400">Como: {guestInfo.email}</p>
              </div>

              <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
                <p className="text-sm text-blue-400 text-center">
                  🎥 La sala de video se abrirá automáticamente cuando esté disponible
                </p>
              </div>

              <div className="text-center text-sm text-gray-400">
                <p>Anfitrión: {meetingInfo.profiles.full_name || meetingInfo.profiles.email}</p>
                <p>
                  {new Date(meetingInfo.scheduled_start).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {new Date(meetingInfo.scheduled_end).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Si no está autenticado y es código general, mostrar opciones
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Link2 className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Unirse a Reunión</h1>
            </div>
            <p className="text-blue-100">Código: {code}</p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">{meetingInfo.title}</h2>
              {meetingInfo.description && (
                <p className="text-gray-400">{meetingInfo.description}</p>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-500">Anfitrión:</span>
                <span className="text-white">
                  {meetingInfo.profiles.full_name || meetingInfo.profiles.email}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-gray-500">Hora:</span>
                <span className="text-white">
                  {new Date(meetingInfo.scheduled_start).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {new Date(meetingInfo.scheduled_end).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <p className="text-gray-400 text-sm mb-4">
                Para unirte a esta reunión necesitas una invitación personal o ser parte del equipo de Sirius.
              </p>
              
              <button
                onClick={handleLoginRedirect}
                className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Iniciar sesión con cuenta Sirius
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )
}