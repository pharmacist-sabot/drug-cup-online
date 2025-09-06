<template>
  <div class="container">
    <h2>หน้าหลัก</h2>
    <p>ยินดีต้อนรับ, {{ auth.profile?.username }}</p>
    <div class="actions">
      <button v-if="!auth.isAdmin" @click="goTo('/pcu/dashboard')" class="btn-primary">
        ไปที่หน้าเบิกยา
      </button>
      <button v-if="auth.isAdmin" @click="goTo('/admin/dashboard')" class="btn-primary">
        ไปที่หน้าจัดการ
      </button>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

function goTo(path) {
  router.push(path)
}
</script>

<style scoped>
.actions {
  margin-top: 2rem;
}
</style>