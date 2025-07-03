// hooks/useUser.ts
import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

interface Profile {
  id: string
  email: string
  full_name: string | null
  status: 'pending' | 'approved' | 'rejected'
  is_super_admin: boolean
  created_at: string
}

interface UserData {
  user: unknown | null
  profile: Profile | null
  loading: boolean
  isApproved: boolean
  isSuperAdmin: boolean
}

export function useUser(): UserData {
  const [userData, setUserData] = useState<UserData>({
    user: null,
    profile: null,
    loading: true,
    isApproved: false,
    isSuperAdmin: false,
  })

  const supabase = createSupabaseClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Obtener perfil del usuario
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          setUserData({
            user,
            profile,
            loading: false,
            isApproved: profile?.status === 'approved',
            isSuperAdmin: profile?.is_super_admin || false,
          })
        } else {
          setUserData({
            user: null,
            profile: null,
            loading: false,
            isApproved: false,
            isSuperAdmin: false,
          })
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        setUserData({
          user: null,
          profile: null,
          loading: false,
          isApproved: false,
          isSuperAdmin: false,
        })
      }
    }

    getUser()

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setUserData({
            user: session.user,
            profile,
            loading: false,
            isApproved: profile?.status === 'approved',
            isSuperAdmin: profile?.is_super_admin || false,
          })
        } else {
          setUserData({
            user: null,
            profile: null,
            loading: false,
            isApproved: false,
            isSuperAdmin: false,
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return userData
}