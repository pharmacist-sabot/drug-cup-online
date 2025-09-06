<template>
  <div class="container">
    <h2>Admin Dashboard - จัดการใบเบิก</h2>
    
    <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!loading && !error">
      <h3>ใบเบิกใหม่ (รอการอนุมัติ)</h3>
      <div v-if="submittedRequisitions.length > 0" class="table-container">
        <table>
          <thead>
            <tr>
              <th>รพ.สต.</th>
              <th>รอบเบิก</th>
              <th>วันที่ส่ง</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in submittedRequisitions" :key="req.id">
              <td>{{ req.pcus_drugcupsabot.name }}</td>
              <td>{{ req.requisition_periods_drugcupsabot.name }}</td>
              <td>{{ formatDate(req.submitted_at) }}</td>
              <td><span :class="['status-badge', req.status]">{{ req.status }}</span></td>
              <td>
                <router-link :to="{ name: 'AdminRequisitionDetail', params: { requisitionId: req.id } }" class="btn-sm btn-primary">
                  ตรวจสอบและอนุมัติ
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="no-data-message">ไม่มีใบเบิกใหม่ที่รอการอนุมัติ</p>

      <h3 class="section-divider">รายการที่อนุมัติแล้ว (รอจ่ายยา)</h3>
       <div v-if="approvedRequisitions.length > 0" class="table-container">
        <table>
          <thead>
            <tr>
              <th>รพ.สต.</th>
              <th>รอบเบิก</th>
              <th>วันที่ส่ง</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in approvedRequisitions" :key="req.id">
              <td>{{ req.pcus_drugcupsabot.name }}</td>
              <td>{{ req.requisition_periods_drugcupsabot.name }}</td>
              <td>{{ formatDate(req.submitted_at) }}</td>
              <td><span :class="['status-badge', req.status]">{{ req.status }}</span></td>
              <td>
                <router-link :to="{ name: 'AdminRequisitionDetail', params: { requisitionId: req.id } }" class="btn-sm btn-success">
                  ยืนยันการจ่าย
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="no-data-message">ไม่มีรายการที่อนุมัติแล้วที่รอการจ่าย</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/supabaseClient';

const loading = ref(true);
const error = ref(null);
const requisitions = ref([]); 

const submittedRequisitions = computed(() => {
  return requisitions.value.filter(req => req.status === 'submitted');
});

const approvedRequisitions = computed(() => {
  return requisitions.value.filter(req => req.status === 'approved');
});

onMounted(async () => {
  try {
    const { data, error: fetchError } = await supabase
      .from('requisitions_drugcupsabot')
      .select(`
        id,
        submitted_at,
        status,
        pcus_drugcupsabot ( name ),
        requisition_periods_drugcupsabot ( name )
      `)
      .in('status', ['submitted', 'approved']) 
      .order('submitted_at', { ascending: true }); 

    if (fetchError) throw fetchError;
    requisitions.value = data;
  } catch (err) {
    error.value = "เกิดข้อผิดพลาดในการโหลดข้อมูลใบเบิก";
    console.error(err);
  } finally {
    loading.value = false;
  }
});

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('th-TH');
}
</script>

<style scoped>
.container h2 {
  margin-bottom: 2rem;
}
h3 {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-color);
}
.section-divider {
  margin-top: 3rem;
}
.table-container {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border: 1px solid var(--border-color);
  padding: 0.8rem;
  text-align: left;
  vertical-align: middle;
}
thead {
  background-color: var(--light-color);
}
.status-badge {
  padding: 0.3em 0.7em;
  border-radius: 12px;
  color: white;
  font-size: 0.85rem;
  font-weight: bold;
  text-transform: capitalize;
}
.status-badge.submitted { background-color: var(--warning-color); color: var(--dark-color); }
.status-badge.approved { background-color: var(--primary-color); }

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  color: white;
  text-decoration: none;
  border-radius: var(--border-radius);
  display: inline-block;
  text-align: center;
  border: none;
}
.btn-primary {
  background-color: var(--primary-color);
}
.btn-primary:hover {
  background-color: var(--primary-hover);
}
.btn-success {
  background-color: var(--success-color);
}
.btn-success:hover {
  background-color: #218838;
}

.no-data-message {
  padding: 1.5rem;
  text-align: center;
  color: var(--secondary-color);
  background-color: var(--light-color);
  border: 1px dashed var(--border-color);
  border-radius: var(--border-radius);
}
</style>