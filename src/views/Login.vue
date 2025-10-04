<template>
  <div class="login-wrapper">
    <div class="card login-container">
      <div class="login-header">
        <i class="fas fa-hospital-user"></i>
        <h1>เข้าสู่ระบบ</h1>
        <p>ระบบเบิกยาออนไลน์ โรงพยาบาลสระโบสถ์</p>
      </div>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">อีเมล</label>
          <input type="email" id="email" v-model="email" required placeholder="name@example.com">
        </div>
        <div class="form-group">
          <label for="password">รหัสผ่าน</label>
          <input type="password" id="password" v-model="password" required placeholder="********">
        </div>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          <i class="fas fa-sign-in-alt"></i>
          <span>{{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}</span>
        </button>
        <div class="register-link">
          ยังไม่มีบัญชี? <router-link to="/register">ลงทะเบียนที่นี่</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');
const authStore = useAuthStore();
const router = useRouter();

async function handleLogin() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await authStore.login(email.value, password.value);
    router.push('/');
  } catch (error) {
    errorMessage.value = error.message; 
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center; 
  align-items: center; 
  flex-grow: 1;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  height: 100vh; 
  background: linear-gradient(135deg, #F5F1FF 0%, #E6F7FF 100%);
}

.login-container {
  width: 100%;
  max-width: 420px;
  text-align: center;
  padding: 2.5rem;
  border: none;
  box-shadow: var(--box-shadow-lg); 
  animation: fade-in 0.5s ease-out; 
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header .fa-hospital-user {
  font-size: 3rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.login-header h1 {
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
  border: none; 
}

.login-header p {
  color: var(--text-muted);
  margin-bottom: 2rem;
}

button {
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  font-size: 1.1rem;
  justify-content: center; 
}

button span {
  display: inline;
}

.error-message {
  color: var(--danger-color);
  margin-top: 1rem;
  font-size: 0.9rem;
}

.register-link {
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}

@media (max-width: 480px) {
  .login-container {
    padding: 2rem 1.5rem;
    margin: 0 1rem;
  }
}
</style>