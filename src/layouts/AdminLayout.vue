<template>
  <div class="admin-layout">
    <Sidebar />
    <div class="main-content">
      <header class="top-header no-print">
        <div class="user-info">
          <i class="fas fa-user-circle"></i>
          <div class="user-details">
            <span class="username">{{ auth.profile?.username }}</span>
            <span class="role">Admin</span>
          </div>
          <button @click="handleLogout" class="btn-logout" title="ออกจากระบบ">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </header>
      <main>
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import Sidebar from '@/components/Sidebar.vue';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.admin-layout {
  display: flex;
}

.main-content {
  flex-grow: 1;
  margin-left: 260px; 
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.top-header {
  background-color: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 0.75rem 1.5rem;
  display: flex;
  justify-content: flex-end; 
  align-items: center;
}

main {
  flex-grow: 1;
  background-color: var(--bg-color);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-color);
}
.user-info .fa-user-circle { font-size: 2rem; color: var(--secondary-color); }
.user-details { display: flex; flex-direction: column; line-height: 1.2; }
.user-details .username { font-weight: 600; }
.user-details .role { font-size: 0.8rem; color: var(--text-muted); }
.btn-logout { background: none; border: none; cursor: pointer; color: var(--secondary-color); font-size: 1.5rem; padding: 0.5rem; border-radius: 50%; line-height: 1; transition: color 0.2s, background-color 0.2s; }
.btn-logout:hover { color: var(--danger-color); background-color: #fbebee; }
</style>