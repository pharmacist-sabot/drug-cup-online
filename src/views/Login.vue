<template>
  <div class="login-wrapper">
    <div class="login-container">
      <h1>เข้าสู่ระบบ</h1>
      <p>ระบบเบิกยาออนไลน์ โรงพยาบาลสระโบสถ์</p>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">อีเมล</label>
          <input type="email" id="email" v-model="email" required>
        </div>
        <div class="form-group">
          <label for="password">รหัสผ่าน</label>
          <input type="password" id="password" v-model="password" required>
        </div>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const authStore = useAuthStore()
const router = useRouter()

async function handleLogin() {
  loading.value = true
  errorMessage.value = ''
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (error) {
    errorMessage.value = error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}
.login-container {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
  background: white;
  box-shadow: var(--box-shadow);
  border-radius: var(--border-radius);
  text-align: center;
}
h1 {
  margin-bottom: 0.5rem;
}
p {
  color: var(--secondary-color);
  margin-bottom: 2rem;
}
button {
  width: 100%;
  margin-top: 1rem;
}
.error-message {
  color: var(--danger-color);
  margin-top: 1rem;
  font-size: 0.9rem;
}
</style>