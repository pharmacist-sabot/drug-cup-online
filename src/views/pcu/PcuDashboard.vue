<template>
  <div class="container">
    <h2><i class="fas fa-clinic-medical"></i> หน้าหลัก {{ auth.userPcuName }}</h2>
    
    <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!loading && !error">
      <h3><i class="fas fa-folder-open"></i> รอบการเบิกปัจจุบัน</h3>
      <div v-if="openPeriods.length > 0" class="period-grid">
        <div v-for="period in openPeriods" :key="period.id" class="card period-card">
          <h4>{{ period.name }}</h4>
          <p class="period-dates">
            <i class="far fa-calendar-alt"></i>
            เปิดเบิก: {{ formatDate(period.start_date) }} - {{ formatDate(period.end_date) }}
          </p>
          
          <button 
            v-if="!hasRequisition(period.id)" 
            @click="goToRequisition(period.id, null)" 
            class="btn btn-primary">
            <i class="fas fa-plus"></i> สร้างใบเบิกใหม่
          </button>
          <button 
            v-else-if="getRequisitionStatus(period.id) === 'draft'" 
            @click="goToRequisition(period.id, getRequisitionId(period.id))"
            class="btn btn-warning">
            <i class="fas fa-edit"></i> แก้ไขฉบับร่าง
          </button>
          <div v-else class="submitted-info">
            <i class="fas fa-check-circle"></i>
            <span>ส่งใบเบิกแล้ว (สถานะ: {{ getRequisitionStatus(period.id) }})</span>
          </div>
        </div>
      </div>
      <p v-else>ยังไม่มีรอบการเบิกที่เปิดใช้งาน</p>

      <h3><i class="fas fa-history"></i> ประวัติการเบิก</h3>
      <div v-if="historyRequisitions.length > 0" class="table-wrapper card">
        <table>
          <thead>
            <tr>
              <th>รอบเบิก</th>
              <th>วันที่ส่ง</th>
              <th>สถานะ</th>
              <th class="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in historyRequisitions" :key="req.id">
              <td>{{ req.requisition_periods_drugcupsabot.name }}</td>
              <td>{{ formatSubmitDate(req.submitted_at) }}</td>
              <td><span :class="['status-badge', req.status]">{{ req.status }}</span></td>
              <td class="text-center">
                <router-link :to="{ name: 'RequisitionDetail', params: { requisitionId: req.id } }" class="btn btn-info">
                  <i class="fas fa-search"></i> ดูรายละเอียด
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="card">ยังไม่มีประวัติการเบิก</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/supabaseClient';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const auth = useAuthStore();

const loading = ref(true);
const error = ref(null);
const openPeriods = ref([]);
const existingRequisitions = ref([]);

const historyRequisitions = computed(() => {
  return existingRequisitions.value
    .filter(req => req.status !== 'draft')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
});

onMounted(async () => {
  if (!auth.userPcuId) {
    error.value = "ไม่พบข้อมูล รพ.สต. ของผู้ใช้";
    loading.value = false;
    return;
  }
  
  try {
    const { data: periodsData, error: periodsError } = await supabase
      .from('requisition_periods_drugcupsabot')
      .select('*')
      .eq('status', 'open')
      .order('start_date', { ascending: false });
    if (periodsError) throw periodsError;
    openPeriods.value = periodsData;

    const { data: reqsData, error: reqsError } = await supabase
      .from('requisitions_drugcupsabot')
      .select('id, period_id, status, created_at, submitted_at, requisition_periods_drugcupsabot(name)')
      .eq('pcu_id', auth.userPcuId);
    if (reqsError) throw reqsError;
    existingRequisitions.value = reqsData;
  } catch (err) {
    error.value = 'ไม่สามารถโหลดข้อมูลได้';
    console.error(err);
  } finally {
    loading.value = false;
  }
});

function hasRequisition(periodId) {
  return existingRequisitions.value.some(req => req.period_id === periodId);
}
function getRequisitionStatus(periodId) {
  const req = existingRequisitions.value.find(req => req.period_id === periodId);
  return req ? req.status : null;
}
function getRequisitionId(periodId) {
  const req = existingRequisitions.value.find(req => req.period_id === periodId);
  return req ? req.id : null;
}
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}
function formatSubmitDate(dateString) {
  if (!dateString) return 'ฉบับร่าง';
  return new Date(dateString).toLocaleString('th-TH');
}
function goToRequisition(periodId, requisitionId) {
  router.push({ name: 'RequisitionForm', params: { periodId, requisitionId: requisitionId || 'new' } });
}
</script>

<style scoped>
h2 i, h3 i {
  margin-right: 0.75rem;
  color: var(--primary-color);
}
.period-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}
.period-card {
  display: flex;
  flex-direction: column;
}
.period-card h4 {
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
}
.period-dates {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}
.period-dates i {
  margin-right: 0.5rem;
}
.submitted-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #eaf6ec;
  color: #208139;
  padding: 0.75rem;
  border-radius: var(--border-radius);
  font-weight: 500;
}
.btn-info {
  background-color: var(--info-color);
}
.btn-info:hover {
  background-color: var(--info-hover);
}
.table-wrapper.card {
  padding: 0;
  border: none;
}
.table-wrapper table {
  border-radius: var(--border-radius);
  overflow: hidden;
}
</style>