import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/supabaseClient' 

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)

  async function fetchSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      user.value = session.user
      await fetchProfile(user.value.id)
    }
  }

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles_drugcupsabot') 
      .select('*, pcus_drugcupsabot(name)') 
      .eq('id', userId)
      .single()
    if (error) console.error('Error fetching profile:', error)
    else profile.value = data
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    user.value = data.user
    await fetchProfile(user.value.id)
  }

  async function logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error.message);
      }
    } catch (e) {
      console.error('Unexpected error during logout:', e);
    } finally {
      user.value = null;
      profile.value = null;
    }
  }
  
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const userPcuName = computed(() => profile.value?.pcus_drugcupsabot?.name || 'N/A') // <-- Updated property access
  const userPcuId = computed(() => profile.value?.pcu_id || null)
  const userProfile = computed(() => profile.value)

  return { 
    user, 
    profile, 
    fetchSession, 
    login, 
    logout, 
    isLoggedIn, 
    isAdmin,
    userPcuName,
    userPcuId,
    userProfile
  }
})