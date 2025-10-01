<!-- src/views/Register.vue -->
<template>
  <div class="register-wrapper">
    <div class="card register-container">
      <div class="register-header">
        <i class="fas fa-user-plus"></i>
        <h1>สร้างบัญชีใหม่</h1>
        <p>สำหรับบุคลากร รพ.สต. ในเครือข่ายโรงพยาบาลสระโบสถ์</p>
      </div>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">ชื่อ-นามสกุล</label>
          <input 
            type="text" 
            id="username" 
            v-model="form.username" 
            required 
            placeholder="เช่น สมชาย ใจดี"
            :disabled="loading"
          >
        </div>
        
        <div class="form-group">
          <label for="email">อีเมล</label>
          <input 
            type="email" 
            id="email" 
            v-model="form.email" 
            required 
            placeholder="name@example.com"
            :disabled="loading"
          >
        </div>
        
        <div class="form-group">
          <label for="password">รหัสผ่าน</label>
          <input 
            type="password" 
            id="password" 
            v-model="form.password" 
            required 
            placeholder="อย่างน้อย 6 ตัวอักษร"
            :disabled="loading"
          >
        </div>

        <div class="form-group">
          <label for="pcu">หน่วยบริการ (รพ.สต.) ของคุณ</label>
          <select 
            id="pcu" 
            v-model="form.pcu_id" 
            required 
            :disabled="isPcuLoading || loading"
          >
            <option v-if="isPcuLoading" disabled value="">กำลังโหลดรายชื่อ รพ.สต....</option>
            <option v-else disabled value="">-- กรุณาเลือก รพ.สต. --</option>
            <option 
              v-for="pcu in pcuList" 
              :key="pcu.id" 
              :value="pcu.id"
            >
              {{ pcu.name }}
            </option>
          </select>
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit" class="btn btn-primary" :disabled="loading">
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-check-circle"></i>
          <span>{{ loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน' }}</span>
        </button>
      </form>

      <div class="login-link">
        มีบัญชีอยู่แล้ว? <router-link to="/login">เข้าสู่ระบบที่นี่</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '@/supabaseClient';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const authStore = useAuthStore();
const pcuList = ref([]);
const isPcuLoading = ref(true);
const loading = ref(false);
const errorMessage = ref('');
const form = ref({
  username: '',
  email: '',
  password: '',
  pcu_id: '' 
});

async function fetchPcuList() {
  try {
    isPcuLoading.value = true;
    const { data, error } = await supabase
      .from('pcus_drugcupsabot')
      .select('id, name')
      .order('name');
    
    if (error) throw error;

    pcuList.value = data;
  } catch (err) {
    console.error('Error fetching PCU list:', err);
    errorMessage.value = 'ไม่สามารถโหลดรายชื่อ รพ.สต. ได้ กรุณาลองใหม่อีกครั้ง';
  } finally {
    isPcuLoading.value = false;
  }
}

onMounted(() => {
  fetchPcuList();
});

async function handleRegister() {
  if (!form.value.pcu_id) {
    errorMessage.value = "กรุณาเลือก รพ.สต. ของคุณ";
    return;
  }
  
  const isValidPcu = pcuList.value.some(pcu => pcu.id === form.value.pcu_id);
  if (!isValidPcu) {
    errorMessage.value = "ข้อมูล รพ.สต. ไม่ถูกต้อง โปรดเลือกใหม่อีกครั้ง";
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: form.value.email,
      password: form.value.password,
      options: {
        data: {
          username: form.value.username.trim(),
          pcu_id: form.value.pcu_id 
        }
      }
    });
    
    if (error) throw error;

    if (data.session) {
      await authStore.login(form.value.email, form.value.password);
      router.push('/');
    } else {
      errorMessage.value = "กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันการลงทะเบียน";
    }

  } catch (error) {
    console.error('Registration error:', error);
    if (error.message.includes('User already registered')) {
      errorMessage.value = 'อีเมลนี้มีการลงทะเบียนแล้ว';
    } else if (error.message.includes('PCU does not exist')) {
      errorMessage.value = 'ข้อมูล รพ.สต. ไม่ถูกต้อง กรุณาเลือกใหม่อีกครั้ง';
    } else {
      errorMessage.value = 'เกิดข้อผิดพลาด: ' + error.message;
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.register-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem 0;
  background: linear-gradient(135deg, #F5F1FF 0%, #E6F7FF 100%);
}
.register-container {
  width: 100%;
  max-width: 480px;
  text-align: center;
  padding: 2.5rem;
  animation: fade-in 0.5s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.register-header i {
  font-size: 3rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}
.register-header h1 {
  font-size: 1.75rem;
  border: none;
  margin-bottom: 0.5rem;
}
.register-header p {
  color: var(--text-muted);
  margin-bottom: 2rem;
}
form .btn {
  width: 100%;
  margin-top: 1.5rem;
  padding: 0.8rem;
}
.error-message {
  color: var(--danger-color);
  background-color: #fbebee;
  border: 1px solid var(--danger-color);
  border-radius: var(--border-radius);
  padding: 0.75rem;
  margin-top: 1rem;
  font-size: 0.9rem;
}
.login-link {
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: var(--text-muted);
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
</style>