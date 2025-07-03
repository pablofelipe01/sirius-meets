'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { X, Mail, UserPlus, Send, Copy, CheckCircle, Search, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface InviteParticipantsModalProps {
  meetingId: string
  meetingTitle: string
  invitationCode: string
  isOpen: boolean
  onClose: () => void
  onInviteSent?: () => void
}

interface InternalUser {
  id: string
  email: string
  full_name: string | null
}

export default function InviteParticipantsModal({
  meetingId,
  meetingTitle,
  invitationCode,
  isOpen,
  onClose,
  onInviteSent
}: InviteParticipantsModalProps) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inviteMethod, setInviteMethod] = useState<'internal' | 'external' | 'code'>('internal')
  const [internalUsers, setInternalUsers] = useState<InternalUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<InternalUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<InternalUser | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (isOpen && inviteMethod === 'internal') {
      loadInternalUsers()
    }
  }, [isOpen, inviteMethod])

  useEffect(() => {
    // Filtrar usuarios basado en el término de búsqueda
    if (searchTerm) {
      const filtered = internalUsers.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredUsers(filtered)
      setShowDropdown(true)
    } else {
      setFilteredUsers(internalUsers)
      setShowDropdown(false)
    }
  }, [searchTerm, internalUsers])

  async function loadInternalUsers() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Cargar usuarios aprobados de la organización
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('status', 'approved')
        .neq('id', user.id) // Excluir al usuario actual
        .order('full_name')

      if (error) throw error

      setInternalUsers(data || [])
    } catch (error) {
      console.error('Error cargando usuarios internos:', error)
    }
  }

  async function handleInviteInternal() {
    if (!selectedUser) {
      toast.error('Por favor selecciona un usuario')
      return
    }

    setSending(true)

    try {
      // Verificar si ya es participante
      const { data: existing } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('user_id', selectedUser.id)
        .single()

      if (existing) {
        toast.error('Este usuario ya está en la reunión')
        return
      }

      // Agregar como participante
      const { error } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meetingId,
          user_id: selectedUser.id,
          role: 'participant',
          joined_at: null
        })

      if (error) throw error

      toast.success(`✅ ${selectedUser.full_name || selectedUser.email} agregado a la reunión`)
      
      // Limpiar y notificar
      setSelectedUser(null)
      setSearchTerm('')
      if (onInviteSent) onInviteSent()
    } catch (error) {
      console.error('Error invitando usuario interno:', error)
      toast.error('Error al invitar usuario')
    } finally {
      setSending(false)
    }
  }

  async function handleInviteExternal() {
    if (!email.trim()) {
      toast.error('Por favor ingresa un email')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Por favor ingresa un email válido')
      return
    }

    if (email.endsWith('@siriusregenerative.com')) {
      toast.error('Para usuarios internos, usa la pestaña "Equipo Sirius"')
      return
    }

    setSending(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      // Generar código único para este invitado
      const uniqueCode = `${invitationCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase()

      // Crear invitación con código único
      const { error } = await supabase
        .from('meeting_invitations')
        .insert({
          meeting_id: meetingId,
          email: email,
          invited_by: user.id,
          message: message || null,
          status: 'pending',
          unique_code: uniqueCode
        })

      if (error) {
        if (error.code === '23505') {
          toast.error('Ya existe una invitación para este email')
        } else {
          throw error
        }
        return
      }

      // Generar el link único
      const uniqueLink = `${window.location.origin}/join/${uniqueCode}`
      
      // Copiar el link al portapapeles
      navigator.clipboard.writeText(uniqueLink)
      
      toast.success(
        <div>
          📧 Invitación creada para {email}
          <br />
          <span className="text-sm">Link copiado al portapapeles</span>
        </div>
      )
      
      // Aquí en el futuro se enviaría el email real con el link único
      console.log(`Link único para ${email}: ${uniqueLink}`)
      
      setEmail('')
      setMessage('')
      if (onInviteSent) onInviteSent()
    } catch (error) {
      console.error('Error enviando invitación:', error)
      toast.error('Error al enviar la invitación')
    } finally {
      setSending(false)
    }
  }

  function copyInvitationCode() {
    navigator.clipboard.writeText(invitationCode)
    setCopied(true)
    toast.success('📋 Código copiado al portapapeles')
    setTimeout(() => setCopied(false), 3000)
  }

  function copyInvitationLink() {
    const link = `${window.location.origin}/join/${invitationCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('🔗 Enlace copiado al portapapeles')
    setTimeout(() => setCopied(false), 3000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg max-w-md w-full border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Invitar Participantes</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setInviteMethod('internal')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              inviteMethod === 'internal'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Equipo Sirius
          </button>
          <button
            onClick={() => setInviteMethod('external')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              inviteMethod === 'external'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Mail className="h-4 w-4 inline mr-2" />
            Externos
          </button>
          <button
            onClick={() => setInviteMethod('code')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              inviteMethod === 'code'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Copy className="h-4 w-4 inline mr-2" />
            Código
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {inviteMethod === 'internal' ? (
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Buscar miembro del equipo
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Buscar por nombre o email..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Dropdown de usuarios */}
                {showDropdown && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user)
                          setSearchTerm(user.full_name || user.email)
                          setShowDropdown(false)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-600 transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.full_name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.full_name || 'Sin nombre'}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedUser && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Seleccionado:</p>
                  <p className="text-white font-medium">{selectedUser.full_name || selectedUser.email}</p>
                  <p className="text-sm text-gray-400">{selectedUser.email}</p>
                </div>
              )}

              <button
                onClick={handleInviteInternal}
                disabled={sending || !selectedUser}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>Agregando...</>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Agregar a la Reunión
                  </>
                )}
              </button>
            </div>
          ) : inviteMethod === 'external' ? (
            <div className="space-y-4">
              <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  💡 Los invitados recibirán un link único. Solo necesitan hacer clic para entrar - sin registro ni formularios.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email del invitado externo
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mensaje personalizado (opcional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Te invito a participar en nuestra reunión..."
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleInviteExternal}
                disabled={sending || !email.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>Creando invitación...</>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Crear Link de Invitación
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-300">
                Comparte este código o enlace para que cualquiera pueda unirse:
              </p>

              {/* Código */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Código de invitación
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-lg bg-slate-700 px-4 py-2 rounded text-blue-400">
                    {invitationCode}
                  </code>
                  <button
                    onClick={copyInvitationCode}
                    className="text-gray-400 hover:text-white transition-colors p-2"
                  >
                    {copied ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Enlace */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Enlace directo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/join/${invitationCode}`}
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-gray-300 text-sm"
                  />
                  <button
                    onClick={copyInvitationLink}
                    className="text-gray-400 hover:text-white transition-colors p-2"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">
                  <strong className="text-gray-300">Nota:</strong> Cualquier persona con este 
                  código podrá unirse a la reunión `{meetingTitle}`
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}