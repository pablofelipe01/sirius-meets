'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

export default function CreateMeetingPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Datos del formulario
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [meetingType, setMeetingType] = useState<'virtual' | 'hybrid' | 'in_person'>('virtual')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(10)
  
  const supabase = createSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Verificar que esté aprobado
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single()

      if (profile?.status !== 'approved') {
        router.push('/dashboard')
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validaciones básicas
      if (!title.trim()) {
        alert('El título es obligatorio')
        return
      }

      if (new Date(scheduledStart) >= new Date(scheduledEnd)) {
        alert('La fecha de fin debe ser posterior a la fecha de inicio')
        return
      }

      if (new Date(scheduledStart) <= new Date()) {
        alert('La fecha de inicio debe ser en el futuro')
        return
      }

      // Crear la reunión
      const meetingData = {
        title: title.trim(),
        description: description.trim() || null,
        meeting_type: meetingType,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        host_id: user.id,
        max_participants: maxParticipants,
        invitation_code: generateInvitationCode(),
        agora_channel_name: generateChannelName()
      }

      console.log('🚀 Creando reunión:', meetingData)

      const { data, error } = await supabase
        .from('meetings')
        .insert([meetingData])
        .select()
        .single()

      if (error) throw error

      console.log('✅ Reunión creada:', data)
      alert('¡Reunión creada exitosamente!')
      router.push('/dashboard')

    } catch (error) {
      console.error('Error creating meeting:', error)
      alert('Error al crear la reunión')
    } finally {
      setSaving(false)
    }
  }

  const generateInvitationCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const generateChannelName = () => {
    return `meeting_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">📅 Crear Nueva Reunión</h1>
            <p className="text-slate-400">Sirius Meetings</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors"
          >
            ← Volver al Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-6">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">
              Título de la reunión *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ej: Reunión semanal de equipo"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe de qué tratará la reunión..."
            />
          </div>

          {/* Tipo de reunión */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">
              Tipo de reunión
            </label>
            <select
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value as any)}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="virtual">🖥️ Virtual (solo online)</option>
              <option value="hybrid">🔗 Híbrida (presencial + virtual)</option>
              <option value="in_person">👥 Presencial (grabación móvil)</option>
            </select>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Fecha y hora de inicio *
              </label>
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Fecha y hora de fin *
              </label>
              <input
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Máximo de participantes */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">
              Máximo de participantes
            </label>
            <input
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 10)}
              min="2"
              max="100"
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Botón submit */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creando...' : '📅 Crear Reunión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}