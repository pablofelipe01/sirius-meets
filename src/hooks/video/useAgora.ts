'use client'

import { useState, useEffect } from 'react'
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalVideoTrack,
  ILocalAudioTrack,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng'

interface UseAgoraProps {
  appId: string
  channel: string
  token?: string | null
  uid?: string | number | null
  onDataMessage?: (userId: string | number, message: string) => void
}

export function useAgora({ appId, channel, token = null, uid = null, onDataMessage }: UseAgoraProps) {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null)
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null)
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null)
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isClientReady, setIsClientReady] = useState(false)
  const [dataChannel, setDataChannel] = useState<number | null>(null)

  // Initialize Agora client
  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({ 
      mode: 'rtc', 
      codec: 'vp8' 
    })
    
    setClient(agoraClient)
    setIsClientReady(true)

    // Set up event listeners
    agoraClient.on('user-published', async (user, mediaType) => {
      await agoraClient.subscribe(user, mediaType)
      setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user])
    })

    agoraClient.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'video') {
        setRemoteUsers(prev => prev.map(u => 
          u.uid === user.uid ? { ...u, hasVideo: false } : u
        ))
      }
    })

    agoraClient.on('user-left', (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))
    })

    // Listener para mensajes de datos
    agoraClient.on('stream-message', (userId, data) => {
      console.log('📨 Mensaje recibido de:', userId)
      const decoder = new TextDecoder()
      const message = decoder.decode(data)
      if (onDataMessage) {
        onDataMessage(userId, message)
      }
    })

    return () => {
      agoraClient.removeAllListeners()
    }
  }, [onDataMessage])

  // Join channel
  const join = async () => {
    console.log('🚀 Intentando unirse al canal...')
    console.log('📱 AppId:', appId)
    console.log('📺 Channel:', channel)
    console.log('🔑 Token:', token)
    console.log('👤 UID:', uid)
    
    if (!client || !appId || !channel) {
      console.error('❌ Faltan datos necesarios:', { client: !!client, appId: !!appId, channel: !!channel })
      return
    }

    console.log('✅ Verificación pasada, creando tracks...')

    try {
      // Create local tracks
      console.log('🎤 Creando tracks de audio y video...')
      const [audioTrack, videoTrack] = await Promise.all([
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack()
      ])
      console.log('✅ Tracks creados exitosamente')

      setLocalAudioTrack(audioTrack)
      setLocalVideoTrack(videoTrack)

      // Join the channel
      console.log('🚪 Uniéndose al canal...')
      const userUid = await client.join(appId, channel, token, uid)
      console.log('✅ Unido al canal exitosamente con UID:', userUid)
      
      // Publish local tracks
      console.log('📡 Publicando tracks...')
      await client.publish([audioTrack, videoTrack])
      console.log('✅ Tracks publicados')
      
      // Crear canal de datos DESPUÉS de publicar
      try {
        // Pequeña espera para asegurar que la conexión esté estable
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const dataChannelId = await client.createDataStream({ reliable: true, ordered: true })
        setDataChannel(dataChannelId)
        console.log('📡 Canal de datos creado con ID:', dataChannelId)
      } catch (error) {
        console.error('Error creando canal de datos:', error)
      }
      
      setIsConnected(true)
    } catch (error) {
      console.error('❌ Error en join:', error)
      throw error
    }
  }

  // Leave channel
  const leave = async () => {
    if (!client) return

    try {
      // Stop and close local tracks
      localAudioTrack?.close()
      localVideoTrack?.close()
      
      // Leave the channel
      await client.leave()
      
      setLocalAudioTrack(null)
      setLocalVideoTrack(null)
      setRemoteUsers([])
      setIsConnected(false)
      setDataChannel(null)
    } catch (error) {
      console.error('Error leaving channel:', error)
    }
  }

  // Toggle audio
  const toggleAudio = async () => {
    if (!localAudioTrack) return
    
    const enabled = !isAudioEnabled
    await localAudioTrack.setEnabled(enabled)
    setIsAudioEnabled(enabled)
  }

  // Toggle video
  const toggleVideo = async () => {
    if (!localVideoTrack) return
    
    const enabled = !isVideoEnabled
    await localVideoTrack.setEnabled(enabled)
    setIsVideoEnabled(enabled)
  }

  // Send data message
  const sendDataMessage = async (message: string) => {
    if (!client || dataChannel === null || dataChannel === undefined) {
      console.error('No hay canal de datos disponible', { client: !!client, dataChannel })
      return false
    }
    
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(message)
      await client.sendStreamMessage(dataChannel, data)
      console.log('💬 Mensaje enviado por canal:', dataChannel, 'Mensaje:', message)
      return true
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      return false
    }
  }

  return {
    localVideoTrack,
    localAudioTrack,
    remoteUsers,
    isConnected,
    isAudioEnabled,
    isVideoEnabled,
    isClientReady,
    join,
    leave,
    toggleAudio,
    toggleVideo,
    sendDataMessage,
  }
}