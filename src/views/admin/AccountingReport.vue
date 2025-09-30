<!-- src/views/admin/AccountingReport.vue -->
<template>
  <div class="container">
    <h2><i class="fas fa-file-invoice-dollar"></i> รายงานมูลค่าทางบัญชี</h2>
    <p class="text-muted">สรุปมูลค่าการเบิกจ่ายของแต่ละ รพ.สต. ตามรอบเบิกเพื่อส่งมอบให้ฝ่ายบัญชี</p>

    <div class="card report-options no-print">
      <div class="form-group">
        <label for="report-period">1. เลือกรอบเบิกเพื่อดูรายงาน</label>
        <select id="report-period" v-model="selectedPeriod" @change="generateReport">
          <option :value="null" disabled>-- กรุณาเลือกรอบเบิก --</option>
          <option v-for="period in periods" :key="period.id" :value="period.id">
            {{ period.name }}
          </option>
        </select>
      </div>
      <div class="form-group action-buttons-group">
        <label>&nbsp;</label>
        <button @click="printReport" :disabled="!selectedPeriod || reportData.length === 0" class="btn btn-primary">
          <i class="fas fa-print"></i> พิมพ์รายงาน
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">กำลังประมวลผลข้อมูล...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="reportData.length > 0" class="card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th class="text-center">ลำดับ</th>
              <th>หน่วยบริการ (รพ.สต.)</th>
              <th class="text-right">มูลค่ารวม (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(pcu, index) in reportData" :key="pcu.pcu_id">
              <td class="text-center">{{ index + 1 }}</td>
              <td>{{ pcu.pcu_name }}</td>
              <td class="text-right bold">{{ formatCurrency(pcu.total_value) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="text-right bold">มูลค่ารวมทั้งสิ้น</td>
              <td class="text-right bold">{{ formatCurrency(grandTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    
    <div v-else-if="!loading && selectedPeriod" class="card no-data-message text-center">
      <i class="fas fa-info-circle"></i>
      <p>ไม่พบข้อมูลใบเบิกที่อนุมัติแล้วในรอบนี้</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/supabaseClient';

const router = useRouter();
const loading = ref(false);
const error = ref(null);
const periods = ref([]);
const selectedPeriod = ref(null);
const reportData = ref([]);

const grandTotal = computed(() => {
  return reportData.value.reduce((sum, pcu) => sum + pcu.total_value, 0);
});

onMounted(async () => {
  try {
    const { data } = await supabase
      .from('requisition_periods_drugcupsabot')
      .select('id, name')
      .order('start_date', { ascending: false });
    periods.value = data || [];
  } catch (err) {
    console.error("Error fetching periods:", err);
  }
});

async function generateReport() {
  if (!selectedPeriod.value) return;
  loading.value = true;
  error.value = null;
  reportData.value = [];

  try {
    const { data, error: fetchError } = await supabase.rpc('get_accounting_summary_by_period', {
      period_id_param: selectedPeriod.value
    });

    if (fetchError) throw fetchError;

    reportData.value = data;
  } catch (err) {
    error.value = 'เกิดข้อผิดพลาดในการประมวลผล: ' + err.message;
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function printReport() {
  if (!selectedPeriod.value) return;
  const routeData = router.resolve({
    name: 'AccountingReportPrint',
    query: { periodId: selectedPeriod.value }
  });
  window.open(routeData.href, '_blank');
}

function formatCurrency(value) {
  if (isNaN(value) || value === null) return '0.00';
  return Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<style scoped>
h2 i {
  margin-right: 0.75rem;
  color: var(--primary-color);
}
.report-options {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.form-group {
  flex-grow: 1;
}
.action-buttons-group {
  flex-grow: 0;
}
.no-data-message i {
  font-size: 2.5rem;
  color: var(--info-color);
  margin-bottom: 1rem;
}
.no-data-message p {
  font-size: 1.1rem;
  font-weight: 500;
}
</style>