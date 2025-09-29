<!-- src/layouts/AdminLayout.vue -->
<template>
  <div class="admin-layout">

    <Sidebar :isOpen="isSidebarOpen" />
    
    <div v-if="isSidebarOpen" class="sidebar-overlay" @click="toggleSidebar"></div>

    <div class="main-content">
      <header class="top-header no-print">

        <button class="hamburger-menu" @click="toggleSidebar" aria-label="Toggle Sidebar">
          <i class="fas fa-bars"></i>
        </button>

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
import { ref } from 'vue'; 
import Sidebar from '@/components/Sidebar.vue';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

const isSidebarOpen = ref(false);
function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value;
}

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
  transition: margin-left 0.3s ease; 
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
  background-color: transparent;
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

.btn-logout { 
  background: none; border: none; cursor: pointer; font-size: 1.5rem; 
  padding: 0.5rem; border-radius: 50%; line-height: 1; 
  transition: color 0.2s, background-color 0.2s; color: var(--text-muted);
}
.btn-logout:hover { color: var(--danger-color); background-color: rgba(211, 47, 47, 0.1); }

.hamburger-menu {
  display: none; 
  margin-right: auto; 
  font-size: 1.5rem;
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  padding: 0.5rem;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1050; 
  display: none; 
}

@media (max-width: 992px) {
  .main-content {
    margin-left: 0;
  }
  .hamburger-menu,
  .sidebar-overlay {
    display: block; 
  }
}
</style>