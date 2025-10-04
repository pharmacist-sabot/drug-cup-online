<!-- src/App.vue -->
<template>
  <div v-if="!auth.isLoggedIn || isPublicPage">
    <router-view />
  </div>
  <AdminLayout v-else-if="auth.isAdmin" />
  <PcuLayout v-else />
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router'; 
import { useAuthStore } from '@/store/auth';
import AdminLayout from '@/layouts/AdminLayout.vue';
import PcuLayout from '@/layouts/PcuLayout.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter(); 

const isPublicPage = computed(() => {
  const publicPages = ['Login', 'Home', 'PrintRequisition', 'PrintRequisitionSummary'];
  return publicPages.includes(route.name);
});

async function initializeAuthFromUrl() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.warn('No valid session found in URL hash or error:', error.message);

    return;
  }

  if (session) {
    console.log('Session found in URL hash, setting user...');
    auth.user.value = session.user;
    await auth.fetchProfile(session.user.id);

    if (auth.userProfile?.status === 'pending') {
      router.replace({ name: 'WaitingForApproval' });
    } else if (auth.userProfile?.status === 'approved') {
      router.replace({ name: 'Home' });
    } else {
      await auth.logout(); 
      router.replace({ name: 'Login' });
    }
  }
}

onMounted(async () => {

  await initializeAuthFromUrl();

  if (!auth.isLoggedIn) {
    await auth.fetchSession();
  }
});
</script>