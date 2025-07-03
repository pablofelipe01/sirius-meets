'use client'

import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare } from 'lucide-react'

interface VideoControlsProps {
  audioEnabled: boolean
  videoEnabled: boolean
  showChat?: boolean
  onToggleAudio: () => void
  onToggleVideo: () => void
  onToggleChat?: () => void
  onLeave: () => void
}

export default function VideoControls({
  audioEnabled,
  videoEnabled,
  showChat = false,
  onToggleAudio,
  onToggleVideo,
  onToggleChat,
  onLeave
}: VideoControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-gray-900 border-t border-gray-800">
      {/* Audio Toggle */}
      <button
        onClick={onToggleAudio}
        className={`p-3 rounded-full transition-colors ${
          audioEnabled 
            ? 'bg-gray-700 hover:bg-gray-600' 
            : 'bg-red-600 hover:bg-red-700'
        }`}
        title={audioEnabled ? 'Silenciar' : 'Activar audio'}
      >
        {audioEnabled ? (
          <Mic className="h-5 w-5 text-white" />
        ) : (
          <MicOff className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Video Toggle */}
      <button
        onClick={onToggleVideo}
        className={`p-3 rounded-full transition-colors ${
          videoEnabled 
            ? 'bg-gray-700 hover:bg-gray-600' 
            : 'bg-red-600 hover:bg-red-700'
        }`}
        title={videoEnabled ? 'Desactivar video' : 'Activar video'}
      >
        {videoEnabled ? (
          <Video className="h-5 w-5 text-white" />
        ) : (
          <VideoOff className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Chat Toggle */}
      {onToggleChat && (
        <button
          onClick={onToggleChat}
          className={`p-3 rounded-full transition-colors ${
            showChat 
              ? 'bg-purple-600 hover:bg-purple-700' 
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={showChat ? 'Ocultar chat' : 'Mostrar chat'}
        >
          <MessageSquare className="h-5 w-5 text-white" />
        </button>
      )}

      {/* Leave Button */}
      <button
        onClick={onLeave}
        className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
        title="Salir de la reunión"
      >
        <PhoneOff className="h-5 w-5 text-white" />
      </button>
    </div>
  )
}