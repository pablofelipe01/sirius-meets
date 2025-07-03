'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAgora } from '@/hooks/video/useAgora'
import VideoPlayer from './VideoPlayer'
import VideoControls from './VideoControls'
import ChatPanel from './ChatPanel'
import { agoraConfig } from '@/lib/agora'
import toast from 'react-hot-toast'

interface VideoRoomProps {
  channelName: string
  userName: string
  onLeave?: () => void
}

export default function VideoRoom({ channelName, userName, onLeave }: VideoRoomProps) {
  const router = useRouter()
  const [isJoining, setIsJoining] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState<unknown[]>([])
  const hasJoinedRef = useRef(false)

  const handleDataMessage = useCallback((userId: string | number, messageText: string) => {
    try {
      const messageData = JSON.parse(messageText)
      const newMessage = {
        id: Date.now().toString() + '-' + userId,
        userId: userId.toString(),
        userName: messageData.userName || `Usuario ${userId}`,
        text: messageData.text,
        timestamp: new Date(),
        isLocal: false
      }
      setMessages(prev => [...prev, newMessage])
    } catch (error) {
      console.error('Error procesando mensaje:', error)
    }
  }, [])

  const {
    localVideoTrack,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    localAudioTrack,
    remoteUsers,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isConnected,
    isAudioEnabled,
    isVideoEnabled,
    isClientReady,
    join,
    leave,
    toggleAudio,
    toggleVideo,
    sendDataMessage,
  } = useAgora({
    appId: agoraConfig.appId,
    channel: channelName,
    onDataMessage: handleDataMessage,
  })

  // Único useEffect para manejar la conexión
  useEffect(() => {
    if (!isClientReady || hasJoinedRef.current) {
      return
    }

    const initializeRoom = async () => {
      console.log('🎥 Iniciando sala de video...')
      console.log('📺 Canal:', channelName)
      console.log('👤 Usuario:', userName)
      
      hasJoinedRef.current = true
      setIsJoining(true)
      
      try {
        await join()
        setIsJoining(false)
        toast.success('Te has unido a la reunión')
      } catch (error) {
        console.error('Error joining room:', error)
        toast.error('Error al unirse a la reunión')
        setIsJoining(false)
        hasJoinedRef.current = false
      }
    }

    initializeRoom()
  }, [isClientReady, channelName, userName])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (hasJoinedRef.current) {
        console.log('🧹 Limpiando recursos de video...')
        leave()
      }
    }
  }, [])

  const handleLeave = async () => {
    try {
      await leave()
      toast.success('Has salido de la reunión')
    } catch (error) {
      console.error('Error al salir:', error)
    }
    
    if (onLeave) {
      onLeave()
    } else {
      router.push('/meetings')
    }
  }

  const handleToggleChat = () => {
    setShowChat(!showChat)
  }

  const handleSendMessage = async (text: string) => {
    const newMessage = {
      id: Date.now().toString(),
      userId: 'local',
      userName: userName,
      text: text,
      timestamp: new Date(),
      isLocal: true
    }
    setMessages(prev => [...prev, newMessage])
    
    // Enviar mensaje a través de Agora
    if (sendDataMessage) {
      const messageData = JSON.stringify({
        userName: userName,
        text: text
      })
      const sent = await sendDataMessage(messageData)
      if (!sent) {
        toast.error('Error al enviar el mensaje')
      }
    }
  }

  if (isJoining) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Uniéndose a la reunión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          <div className={`grid gap-4 h-full ${
            showChat 
              ? 'grid-cols-1 md:grid-cols-2' 
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {/* Local Video */}
            <VideoPlayer
              videoTrack={localVideoTrack}
              isLocal={true}
              userName={userName}
            />

            {/* Remote Videos */}
            {remoteUsers.map((user) => (
              <VideoPlayer
                key={user.uid}
                videoTrack={user.videoTrack}
                audioTrack={user.audioTrack}
                userName={`Usuario ${user.uid}`}
              />
            ))}
          </div>
        </div>

        {/* Controls */}
        <VideoControls
          audioEnabled={isAudioEnabled}
          videoEnabled={isVideoEnabled}
          showChat={showChat}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleChat={handleToggleChat}
          onLeave={handleLeave}
        />
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="w-80 h-full">
          <ChatPanel
            userName={userName}
            userId="local"
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        </div>
      )}
    </div>
  )
}