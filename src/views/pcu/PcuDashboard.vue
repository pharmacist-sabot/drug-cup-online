<template>
  <div class="container">
    <h2>หน้าหลัก {{ auth.userPcuName }}</h2>
    
    <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!loading && !error">
      <h3>รอบการเบิกปัจจุบัน</h3>
      <!-- ส่วนนี้เหมือนเดิม -->
      <div v-if="openPeriods.length > 0">
        <div v-for="period in openPeriods" :key="period.id" class="period-card">
          <h4>{{ period.name }}</h4>
          <p>เปิดเบิก: {{ formatDate(period.start_date) }} - {{ formatDate(period.end_date) }}</p>
          
          <button 
            v-if="!hasRequisition(period.id)" 
            @click="goToRequisition(period.id, null)" 
            class="btn-primary">
            สร้างใบเบิกใหม่
          </button>
          <button 
            v-else-if="getRequisitionStatus(period.id) === 'draft'" 
            @click="goToRequisition(period.id, getRequisitionId(period.id))"
            class="btn-warning">
            แก้ไขฉบับร่าง
          </button>
          <button v-else class="btn-success" disabled>
            ส่งใบเบิกแล้ว (สถานะ: {{ getRequisitionStatus(period.id) }})
          </button>
        </div>
      </div>
      <p v-else>ยังไม่มีรอบการเบิกที่เปิดใช้งาน</p>

      <!-- ===== ส่วนที่เพิ่มเข้ามา: ตารางประวัติการเบิก ===== -->
      <h3>ประวัติการเบิก</h3>
      <div v-if="historyRequisitions.length > 0" class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>รอบเบิก</th>
              <th>วันที่ส่ง</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in historyRequisitions" :key="req.id">
              <td>{{ req.requisition_periods_drugcupsabot.name }}</td>
              <td>{{ formatSubmitDate(req.submitted_at) }}</td>
              <td>
                <span :class="['status-badge', req.status]">{{ req.status }}</span>
              </td>
              <td>
                <router-link :to="{ name: 'RequisitionDetail', params: { requisitionId: req.id } }" class="btn-view">
                  ดูรายละเอียด
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else>ยังไม่มีประวัติการเบิก</p>
      <!-- ===== จบส่วนที่เพิ่มเข้ามา ===== -->

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue' // เพิ่ม computed
import { useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const error = ref(null)
const openPeriods = ref([])
const existingRequisitions = ref([])

// computed property ใหม่สำหรับกรองเฉพาะประวัติ
const historyRequisitions = computed(() => {
  return existingRequisitions.value
    .filter(req => req.status !== 'draft') // ไม่แสดงฉบับร่างในประวัติ
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // เรียงตามล่าสุด
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
      .order('start_date', { ascending: false })
    if (periodsError) throw periodsError
    openPeriods.value = periodsData

    // ปรับปรุง query ให้ join ตาราง period มาด้วย
    const { data: reqsData, error: reqsError } = await supabase
      .from('requisitions_drugcupsabot')
      .select('id, period_id, status, created_at, submitted_at, requisition_periods_drugcupsabot ( name )')
      .eq('pcu_id', auth.userPcuId)
    if (reqsError) throw reqsError
    existingRequisitions.value = reqsData

  } catch (err) {
    error.value = 'ไม่สามารถโหลดข้อมูลได้'
    console.error(err)
  } finally {
    loading.value = false
  }
})

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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ฟังก์ชันใหม่สำหรับจัดรูปแบบวันที่ส่ง
function formatSubmitDate(dateString) {
  if (!dateString) return 'ฉบับร่าง';
  return new Date(dateString).toLocaleString('th-TH');
}

function goToRequisition(periodId, requisitionId) {
  router.push({ name: 'RequisitionForm', params: { periodId, requisitionId: requisitionId || 'new' } })
}
</script>

<style scoped>
/* ... style เดิม ... */
.period-card {
  background-color: var(--light-color);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  margin-bottom: 1rem;
  border-radius: var(--border-radius);
}
h3 {
  margin-top: 2rem;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
  margin-bottom: 1.5rem;
}
.btn-warning {
  background-color: var(--warning-color);
  color: var(--dark-color);
}
.btn-warning:hover {
  background-color: #e0a800;
}
.btn-success[disabled] {
  cursor: not-allowed;
  opacity: 0.7;
}

/* Style ใหม่สำหรับตารางประวัติ */
.table-wrapper {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
th, td {
  padding: 0.8rem;
  border: 1px solid var(--border-color);
  text-align: left;
  vertical-align: middle;
}
thead {
  background-color: var(--light-color);
}
.status-badge {
  padding: 0.25em 0.6em;
  border-radius: 10px;
  color: white;
  font-size: 0.8rem;
  text-transform: capitalize;
}
.status-badge.draft { background-color: var(--secondary-color); }
.status-badge.submitted { background-color: var(--warning-color); color: var(--dark-color); }
.status-badge.approved { background-color: var(--primary-color); }
.status-badge.fulfilled { background-color: var(--success-color); }

.btn-view {
  background-color: var(--primary-color);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: var(--border-radius);
  text-decoration: none;
  font-size: 0.9rem;
  display: inline-block;
  transition: background-color 0.2s;
}
.btn-view:hover {
  background-color: var(--primary-hover);
}
</style>