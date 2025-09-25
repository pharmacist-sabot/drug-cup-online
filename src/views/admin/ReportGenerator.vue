<template>
  <div class="container">
    <h2><i class="fas fa-print"></i> พิมพ์รายงานใบเบิก (แยกตาม รพ.สต.)</h2>
    
    <div class="card report-options no-print">
      
      <div class="form-group">
        <label for="report-period">1. เลือกรอบเบิก</label>
        <select id="report-period" v-model="selectedPeriod" @change="fetchRequisitionsForPeriod">
          <option :value="null" disabled>-- กรุณาเลือกรอบเบิก --</option>
          <option v-for="period in periods" :key="period.id" :value="period.id">
            {{ period.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="report-pcu">2. เลือก รพ.สต.</label>
        <select id="report-pcu" v-model="selectedRequisition" :disabled="!selectedPeriod">
          <option :value="null" disabled>-- กรุณาเลือก รพ.สต. --</option>
          <option v-for="req in requisitionsInPeriod" :key="req.id" :value="req">
            {{ req.pcus_drugcupsabot.name }} (สถานะ: {{ req.status }})
          </option>
        </select>
      </div>

      <div class="form-group action-buttons-group">
        <label>&nbsp;</label> 
        <div class="action-buttons">
          <button @click="printDocument" :disabled="!selectedRequisition || isGenerating" class="btn btn-primary">
            <i class="fas fa-print"></i>
            {{ isGenerating ? 'กำลังเตรียมพิมพ์...' : 'พิมพ์ใบเบิก' }}
          </button>
          <button @click="exportToExcel" :disabled="!selectedRequisition" class="btn btn-success">
            <i class="fas fa-file-excel"></i>
            ส่งออกเป็น Excel
          </button>
        </div>
      </div>

    </div>
    
    <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>

    <div v-if="selectedRequisition" class="card preview-container no-print">
      <h3><i class="fas fa-eye"></i> ตัวอย่างข้อมูลก่อนพิมพ์</h3>
      <p class="text-muted">ข้อมูลจะถูกจัดรูปแบบตามระเบียบในหน้าพิมพ์จริง</p>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th class="text-center">ลำดับ</th>
              <th>รายการเวชภัณฑ์</th>
              <th class="text-center">ขอเบิก</th>
              <th class="text-center">อนุมัติ</th>
              <th class="text-right">มูลค่ารวม (ที่อนุมัติ)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in selectedRequisition.requisition_items_drugcupsabot" :key="item.id">
              <td class="text-center">{{ index + 1 }}</td>
              <td>{{ item.items_drugcupsabot.name }}</td>
              <td class="text-center">{{ item.quantity }}</td>
              <td class="text-center bold">{{ item.approved_quantity ?? item.quantity }}</td>
              <td class="text-right">{{ formatCurrency((item.approved_quantity ?? item.quantity) * item.price_at_request) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="text-right bold">รวมมูลค่าทั้งสิ้น</td>
              <td class="text-right bold">{{ formatCurrency(grandTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    <div v-else-if="selectedPeriod && !loading" class="card no-data-message text-center">
      <i class="fas fa-info-circle"></i>
      <p>กรุณาเลือก รพ.สต. เพื่อดูข้อมูล</p>
      <small>หากไม่มี รพ.สต. ให้เลือก อาจเป็นเพราะยังไม่มีใบเบิกที่อนุมัติหรือจ่ายแล้วในรอบนี้</small>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/supabaseClient';
import { utils, writeFile } from 'xlsx';

const router = useRouter();
const loading = ref(false);
const isGenerating = ref(false);
const periods = ref([]);
const requisitionsInPeriod = ref([]);
const selectedPeriod = ref(null);
const selectedRequisition = ref(null);

const grandTotal = computed(() => {
  if (!selectedRequisition.value) return 0;
  return selectedRequisition.value.requisition_items_drugcupsabot.reduce((sum, item) => {
    const quantityToUse = item.approved_quantity ?? item.quantity;
    const itemTotal = Number(quantityToUse) * Number(item.price_at_request);
    return sum + itemTotal;
  }, 0);
});

onMounted(async () => {
  try {
    const { data } = await supabase
      .from('requisition_periods_drugcupsabot')
      .select('id, name')
      .order('start_date', { ascending: false });
    periods.value = data || [];
  } catch (error) {
    console.error("Error fetching periods:", error);
  }
});

async function fetchRequisitionsForPeriod() {
  selectedRequisition.value = null;
  requisitionsInPeriod.value = [];
  if (!selectedPeriod.value) return;

  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('requisitions_drugcupsabot')
      .select(`
        id, status,
        pcus_drugcupsabot (name),
        requisition_periods_drugcupsabot (name),
        requisition_items_drugcupsabot (
          quantity, approved_quantity, price_at_request,
          items_drugcupsabot (name, unit_pack)
        )
      `)
      .in('status', ['approved', 'fulfilled'])
      .eq('period_id', selectedPeriod.value);
    
    if (error) throw error;
    requisitionsInPeriod.value = data;
  } catch (err) {
    console.error("Error fetching requisitions:", err);
    alert("ไม่สามารถโหลดข้อมูลใบเบิกได้");
  } finally {
    loading.value = false;
  }
}

function printDocument() {
  if (!selectedRequisition.value) {
    alert("กรุณาเลือกใบเบิกที่ต้องการพิมพ์");
    return;
  }
  isGenerating.value = true;

  const routeData = router.resolve({
    name: 'PrintRequisition',
    query: { id: selectedRequisition.value.id }
  });

  window.open(routeData.href, '_blank');
  
  setTimeout(() => {
    isGenerating.value = false;
  }, 1000);
}

function exportToExcel() {
  if (!selectedRequisition.value) return;
  
  const pcuName = selectedRequisition.value.pcus_drugcupsabot.name;
  const periodName = selectedRequisition.value.requisition_periods_drugcupsabot.name;

  const dataForExport = selectedRequisition.value.requisition_items_drugcupsabot.map((item, index) => ({
    'ลำดับ': index + 1,
    'รายการ': item.items_drugcupsabot.name,
    'หน่วยนับ': item.items_drugcupsabot.unit_pack,
    'จำนวนที่ขอ': item.quantity,
    'จำนวนที่อนุมัติ': item.approved_quantity ?? item.quantity,
    'ราคาต่อหน่วย': item.price_at_request,
    'มูลค่ารวม': (item.approved_quantity ?? item.quantity) * item.price_at_request
  }));

  const worksheet = utils.json_to_sheet(dataForExport);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, `ใบเบิก ${pcuName}`);
  writeFile(workbook, `ใบเบิก_${pcuName}_${periodName}.xlsx`);
}

function formatCurrency(value) {
  if (isNaN(value) || value === null || value === undefined) return '0.00';
  return Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<style scoped>
h2 i, h3 i {
  margin-right: 0.75rem;
  color: var(--primary-color);
}

.report-options {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.form-group {
  flex: 1 1 250px;
}

.action-buttons-group {
  flex: 0 1 auto; 
  margin-left: auto; 
}
.action-buttons {
  display: flex;
  gap: 1rem;
}

.preview-container {
  margin-top: 2rem;
}

.preview-container h3 {
  margin-top: 0;
}

.preview-container .text-muted {
  margin-top: -0.5rem;
  margin-bottom: 1.5rem;
}

.preview-table-wrapper {
  max-height: 400px;
  overflow-y: auto;
}

.no-data-message {
  padding: 2rem;
}

.no-data-message i {
  font-size: 2.5rem;
  color: var(--info-color);
  margin-bottom: 1rem;
}

.no-data-message p {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.no-data-message small {
  color: var(--text-muted);
}
</style>