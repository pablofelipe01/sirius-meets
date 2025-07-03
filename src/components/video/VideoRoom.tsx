'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAgora } from '@/hooks/video/useAgora'
import VideoPlayer from './VideoPlayer'
import VideoControls from './VideoControls'
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
  } = useAgora({
    appId: agoraConfig.appId,
    channel: channelName,
  })

  // Primer useEffect - solo para logging
  useEffect(() => {
    console.log('🎥 Componente VideoRoom montado')
    console.log('📺 Canal:', channelName)
    console.log('👤 Usuario:', userName)
  }, [channelName, userName])

  // Segundo useEffect - para unirse cuando el cliente esté listo
  useEffect(() => {
    if (!isClientReady) {
      console.log('⏳ Esperando cliente...')
      return
    }

    const initializeRoom = async () => {
      console.log('✅ Cliente listo, uniéndose al canal...')
      setIsJoining(true)
      try {
        await join()
        setIsJoining(false)
        toast.success('Te has unido a la reunión')
      } catch (error) {
        console.error('Error joining room:', error)
        toast.error('Error al unirse a la reunión')
        setIsJoining(false)
      }
    }

    initializeRoom()

    return () => {
      leave()
    }
  }, [isClientReady]) // Solo ejecutar cuando isClientReady cambie

  const handleLeave = async () => {
    await leave()
    toast.success('Has salido de la reunión')
    if (onLeave) {
      onLeave()
    } else {
      router.push('/meetings')
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
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
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
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onLeave={handleLeave}
      />
    </div>
  )
}