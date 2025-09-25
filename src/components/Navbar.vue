<template>
  <nav class="navbar no-print">
    <div class="navbar-container">
      <router-link to="/" class="navbar-brand">
        <i class="fas fa-pills"></i>
        ระบบเบิกยาออนไลน์
      </router-link>
      <div class="nav-links" v-if="auth.isLoggedIn">
        <router-link v-if="!auth.isAdmin" to="/pcu/dashboard">
          <i class="fas fa-tachometer-alt"></i> หน้าหลัก รพ.สต.
        </router-link>
        <router-link v-if="auth.isAdmin" to="/admin/dashboard">
          <i class="fas fa-user-shield"></i> หน้าหลัก Admin
        </router-link>
        <router-link v-if="auth.isAdmin" to="/admin/reports">
          <i class="fas fa-file-alt"></i> รายงาน
        </router-link>
        
        <div class="user-info">
          <i class="fas fa-user-circle"></i>
          <div class="user-details">
            <span class="username">{{ auth.profile?.username }}</span>
            <span class="role">{{ auth.isAdmin ? 'Admin' : auth.userPcuName }}</span>
          </div>
          <button @click="handleLogout" class="btn-logout" title="ออกจากระบบ">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
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
.navbar {
  background-color: var(--surface-color);
  box-shadow: var(--box-shadow);
  padding: 0.75rem 1.5rem;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-color);
  text-decoration: none;
}

.navbar-brand:hover {
  text-decoration: none;
  opacity: 0.8;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-links a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: var(--border-radius);
  transition: background-color 0.2s, color 0.2s;
  font-weight: 500;
}

.nav-links a:hover, .nav-links a.router-link-exact-active {
  background-color: var(--bg-color);
  color: var(--primary-color);
  text-decoration: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-left: 1.5rem;
  border-left: 1px solid var(--border-color);
  color: var(--text-color);
}

.user-info .fa-user-circle {
  font-size: 2rem;
  color: var(--secondary-color);
}

.user-details {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.user-details .username {
  font-weight: 600;
}
.user-details .role {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.btn-logout {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--secondary-color);
  font-size: 1.5rem;
  padding: 0.5rem;
  border-radius: 50%;
  line-height: 1;
  transition: color 0.2s, background-color 0.2s;
}
.btn-logout:hover {
  color: var(--danger-color);
  background-color: #fbebee;
}
</style>