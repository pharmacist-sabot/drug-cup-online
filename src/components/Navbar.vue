<template>
  <nav class="navbar">
    <div class="nav-container">
      <router-link to="/" class="nav-brand">ระบบเบิกยาออนไลน์</router-link>
      <div class="nav-links" v-if="auth.isLoggedIn">
        <router-link v-if="!auth.isAdmin" to="/pcu/dashboard">หน้าหลัก รพ.สต.</router-link>
        <router-link v-if="auth.isAdmin" to="/admin/dashboard">หน้าหลัก Admin</router-link>
        <router-link v-if="auth.isAdmin" to="/admin/reports">รายงาน</router-link>
        <div class="user-info">
          <span>สวัสดี, {{ auth.profile?.username }} ({{ auth.isAdmin ? 'Admin' : auth.userPcuName }})</span>
          <button @click="handleLogout">ออกจากระบบ</button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.navbar {
  background-color: var(--dark-color);
  color: white;
  padding: 0.8rem 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-decoration: none;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-links a {
  color: var(--light-color);
  text-decoration: none;
  padding: 0.5rem;
  border-radius: var(--border-radius);
  transition: background-color 0.2s;
}

.nav-links a:hover, .nav-links a.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info span {
  font-size: 0.9rem;
}

.user-info button {
  background-color: var(--danger-color);
  color: white;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
}
</style>