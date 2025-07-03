'use client'

import { useEffect, useRef } from 'react'
import { IRemoteVideoTrack, ILocalVideoTrack } from 'agora-rtc-sdk-ng'

interface VideoPlayerProps {
  videoTrack: IRemoteVideoTrack | ILocalVideoTrack | null
  audioTrack?: unknown
  isLocal?: boolean
  userName?: string
}

export default function VideoPlayer({ 
  videoTrack, 
  audioTrack, 
  isLocal = false, 
  userName = 'Usuario' 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (videoTrack && videoRef.current) {
      videoTrack.play(videoRef.current)
    }

    return () => {
      if (videoTrack) {
        videoTrack.stop()
      }
    }
  }, [videoTrack])

  useEffect(() => {
    if (audioTrack && !isLocal) {
      audioTrack.play()
    }

    return () => {
      if (audioTrack && !isLocal) {
        audioTrack.stop()
      }
    }
  }, [audioTrack, isLocal])

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      <div 
        ref={videoRef} 
        className="w-full h-full"
        style={{ minHeight: '300px' }}
      />
      <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm text-white">
        {userName} {isLocal && '(Tú)'}
      </div>
    </div>
  )
}