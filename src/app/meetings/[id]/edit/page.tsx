'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import toast from 'react-hot-toast'
import { 
  Calendar,
  Clock,
  Users,
  MapPin,
  FileText,
  Save,
  X
} from 'lucide-react'

// Schema de validación
const meetingSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  meeting_type: z.enum(['virtual', 'hybrid', 'in_person']),
  scheduled_start: z.string().min(1, 'La fecha de inicio es requerida'),
  scheduled_end: z.string().min(1, 'La fecha de fin es requerida'),
  max_participants: z.number().min(2, 'Mínimo 2 participantes').max(1000, 'Máximo 1000 participantes'),
}).refine((data) => {
  const start = new Date(data.scheduled_start)
  const end = new Date(data.scheduled_end)
  return end > start
}, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["scheduled_end"]
})

type MeetingFormData = z.infer<typeof meetingSchema>

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
  agora_channel: string
  created_at: string
}

export default function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  
  const router = useRouter()
  const supabase = createSupabaseClient()
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema)
  })

  const watchedType = watch('meeting_type')

  useEffect(() => {
    loadMeeting()
  }, [id])

  async function loadMeeting() {
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Cargar reunión
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      // Verificar si es el dueño
      if (data.host_id !== user.id) {
        toast.error('❌ No tienes permisos para editar esta reunión')
        router.push(`/meetings/${id}`)
        return
      }

      setMeeting(data)
      setIsOwner(true)

      // Formatear fechas para los inputs de datetime-local
      const formatDateTime = (dateString: string) => {
        const date = new Date(dateString)
        // Formato: YYYY-MM-DDTHH:mm
        return date.toISOString().slice(0, 16)
      }

      // Cargar los datos en el formulario
      reset({
        title: data.title,
        description: data.description || '',
        meeting_type: data.meeting_type,
        scheduled_start: formatDateTime(data.scheduled_start),
        scheduled_end: formatDateTime(data.scheduled_end),
        max_participants: data.max_participants
      })

      console.log('📝 Reunión cargada para edición:', data)
    } catch (error) {
      console.error('Error cargando reunión:', error)
      toast.error('❌ No se pudo cargar la reunión')
      router.push('/meetings')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: MeetingFormData) {
    if (!meeting) return
    
    setSaving(true)
    
    try {
      // Verificar que las fechas no estén en el pasado
      const now = new Date()
      const start = new Date(data.scheduled_start)
      
      if (start < now) {
        // Solo mostrar advertencia si la reunión aún no ha comenzado
        const originalStart = new Date(meeting.scheduled_start)
        if (originalStart > now) {
          toast.error('❌ No puedes programar una reunión en el pasado')
          setSaving(false)
          return
        }
      }

      // Actualizar reunión en la base de datos
      const { error } = await supabase
        .from('meetings')
        .update({
          title: data.title,
          description: data.description || null,
          meeting_type: data.meeting_type,
          scheduled_start: new Date(data.scheduled_start).toISOString(),
          scheduled_end: new Date(data.scheduled_end).toISOString(),
          max_participants: data.max_participants,
          updated_at: new Date().toISOString()
        })
        .eq('id', meeting.id)

      if (error) throw error

      toast.success('✅ Reunión actualizada exitosamente')
      router.push(`/meetings/${meeting.id}`)
    } catch (error) {
      console.error('Error actualizando reunión:', error)
      toast.error('❌ No se pudo actualizar la reunión')
    } finally {
      setSaving(false)
    }
  }

  function getMeetingStatus() {
    if (!meeting) return null
    
    const now = new Date()
    const start = new Date(meeting.scheduled_start)
    const end = new Date(meeting.scheduled_end)
    
    if (now >= start && now <= end) {
      return { text: '🔴 EN VIVO', canEditTime: false }
    } else if (now > end) {
      return { text: '✅ COMPLETADA', canEditTime: false }
    } else {
      return { text: '📅 PROGRAMADA', canEditTime: true }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-gray-400">Cargando reunión...</div>
      </div>
    )
  }

  if (!meeting || !isOwner) {
    return null
  }

  const status = getMeetingStatus()

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 shadow-sm border-b border-slate-700">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-400">✏️ Editar Reunión</h1>
            <button
              onClick={() => router.push(`/meetings/${meeting?.id || id}`)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {status && (
          <div className="mb-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Estado actual:</span>
              <span className="font-medium">{status.text}</span>
            </div>
            {!status.canEditTime && (
              <p className="text-sm text-yellow-500 mt-2">
                ⚠️ Las fechas no se pueden modificar para reuniones en curso o completadas
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            {/* Título */}
            <div className="mb-6">
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <FileText className="h-4 w-4 mr-2" />
                Título de la reunión
              </label>
              <input
                {...register('title')}
                type="text"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Reunión semanal de equipo"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>
              )}
            </div>

            {/* Descripción */}
            <div className="mb-6">
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <FileText className="h-4 w-4 mr-2" />
                Descripción (opcional)
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe el propósito de la reunión..."
              />
            </div>

            {/* Tipo de reunión */}
            <div className="mb-6">
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <MapPin className="h-4 w-4 mr-2" />
                Tipo de reunión
              </label>
              <select
                {...register('meeting_type')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="virtual">🖥️ Virtual</option>
                <option value="hybrid">🔗 Híbrida</option>
                <option value="in_person">👥 Presencial</option>
              </select>
            </div>

            {/* Fechas */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                  <Calendar className="h-4 w-4 mr-2" />
                  Fecha y hora de inicio
                </label>
                <input
                  {...register('scheduled_start')}
                  type="datetime-local"
                  disabled={!status?.canEditTime}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {errors.scheduled_start && (
                  <p className="mt-1 text-sm text-red-400">{errors.scheduled_start.message}</p>
                )}
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                  <Clock className="h-4 w-4 mr-2" />
                  Fecha y hora de fin
                </label>
                <input
                  {...register('scheduled_end')}
                  type="datetime-local"
                  disabled={!status?.canEditTime}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {errors.scheduled_end && (
                  <p className="mt-1 text-sm text-red-400">{errors.scheduled_end.message}</p>
                )}
              </div>
            </div>

            {/* Participantes */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <Users className="h-4 w-4 mr-2" />
                Número máximo de participantes
              </label>
              <input
                {...register('max_participants', { valueAsNumber: true })}
                type="number"
                min="2"
                max="1000"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 10"
              />
              {errors.max_participants && (
                <p className="mt-1 text-sm text-red-400">{errors.max_participants.message}</p>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">ℹ️ Información de la reunión</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p><strong>Código de invitación:</strong> <code className="bg-slate-700 px-2 py-1 rounded">{meeting.invitation_code}</code></p>
              <p><strong>Canal de Agora:</strong> <code className="bg-slate-700 px-2 py-1 rounded">{meeting.agora_channel}</code></p>
              <p><strong>Creada:</strong> {new Date(meeting.created_at).toLocaleString('es-ES')}</p>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              💡 El código de invitación y el canal de Agora no se pueden modificar
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/meetings/${meeting?.id || id}`)}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-md font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}