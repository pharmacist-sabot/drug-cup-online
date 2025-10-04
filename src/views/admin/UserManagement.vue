<!-- src/views/admin/UserManagement.vue -->
<template>
  <div class="container">
    <h2><i class="fas fa-user-check"></i> จัดการการอนุมัติผู้ใช้งาน</h2>
    <p class="text-muted">อนุมัติหรือปฏิเสธคำขอลงทะเบียนเข้าใช้งานระบบจากบุคลากร รพ.สต.</p>

    <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!loading" class="card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ชื่อ-นามสกุล</th>
              <th>อีเมล</th>
              <th>หน่วยบริการ (รพ.สต.)</th>
              <th>วันที่ลงทะเบียน</th>
              <th class="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in pendingUsers" :key="user.id">
              <td>{{ user.username }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.pcus_drugcupsabot?.name || 'N/A' }}</td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td class="text-center action-buttons">
                <button @click="updateUserStatus(user.id, 'approved')" class="btn btn-success btn-sm">
                  <i class="fas fa-check"></i> อนุมัติ
                </button>
                <button @click="updateUserStatus(user.id, 'rejected')" class="btn btn-danger btn-sm">
                  <i class="fas fa-times"></i> ปฏิเสธ
                </button>
              </td>
            </tr>
            <tr v-if="pendingUsers.length === 0">
              <td colspan="5" class="text-center text-muted" style="padding: 2rem;">ไม่มีคำขอลงทะเบียนใหม่</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '@/supabaseClient';

const loading = ref(true);
const error = ref(null);
const pendingUsers = ref([]);

async function fetchPendingUsers() {
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('profiles_drugcupsabot')
      .select(`
        id,
        username,
        email,
        created_at,
        pcus_drugcupsabot ( name )
      `)
      .eq('status', 'pending');

    if (fetchError) throw fetchError;
    pendingUsers.value = data;
  } catch (err) {
    console.error('Error fetching pending users:', err);
    error.value = 'ไม่สามารถโหลดข้อมูลผู้ใช้ที่รอการอนุมัติได้';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchPendingUsers();
});

async function updateUserStatus(userId, newStatus) {
  const confirmationText = newStatus === 'approved' 
    ? 'คุณต้องการอนุมัติผู้ใช้งานนี้ใช่หรือไม่?'
    : 'คุณต้องการปฏิเสธผู้ใช้งานนี้ใช่หรือไม่?';
    
  if (!confirm(confirmationText)) return;

  try {
    const { error: updateError } = await supabase
      .from('profiles_drugcupsabot')
      .update({ status: newStatus })
      .eq('id', userId);

    if (updateError) throw updateError;

    alert(`อัปเดตสถานะผู้ใช้เรียบร้อยแล้ว`);
    
    await fetchPendingUsers();
  } catch (err) {
    console.error('Error updating user status:', err);
    alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + err.message);
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<style scoped>
h2 i {
  margin-right: 0.75rem;
  color: var(--primary-color);
}
.action-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}
.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
}
</style>