'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import VideoRoom from '@/components/video/VideoRoom'
import toast from 'react-hot-toast'

export default function MeetingVideoPage() {
  const params = useParams()
  const router = useRouter()
  const [meeting, setMeeting] = useState<unknown>(null)
  const [user, setUser] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const loadMeetingAndUser = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!profile || profile.status !== 'approved') {
          router.push('/auth/unauthorized')
          return
        }

        setUser(profile)

        // Get meeting details
        const { data: meetingData, error: meetingError } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', params.id)
          .single()

        if (meetingError || !meetingData) {
          toast.error('Reunión no encontrada')
          router.push('/meetings')
          return
        }

        // Check if user is a participant
        const { data: participant } = await supabase
          .from('meeting_participants')
          .select('*')
          .eq('meeting_id', params.id)
          .eq('user_id', user.id)
          .single()

        if (!participant) {
          toast.error('No tienes acceso a esta reunión')
          router.push('/meetings')
          return
        }

        setMeeting(meetingData)
      } catch (error) {
        console.error('Error loading meeting:', error)
        toast.error('Error al cargar la reunión')
        router.push('/meetings')
      } finally {
        setLoading(false)
      }
    }

    loadMeetingAndUser()
  }, [params.id, supabase, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando reunión...</p>
        </div>
      </div>
    )
  }

  if (!meeting || !user) {
    return null
  }

  return (
    <VideoRoom
      channelName={meeting.agora_channel_name}
      userName={user.full_name || user.email}
      onLeave={() => router.push(`/meetings/${params.id}`)}
    />
  )
}