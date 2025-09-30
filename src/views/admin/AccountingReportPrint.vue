<template>
  <div class="print-container landscape" v-if="!loading && reportData.length > 0">
    <div class="page">

      <div class="header">
        <div class="header-title-section">
          <h2 class="bold text-center">รายงานสรุปมูลค่าการเบิกจ่ายยาของ รพ.สต.</h2>
          <h3 class="text-center">โรงพยาบาลสระโบสถ์</h3>
        </div>
        <div class="sub-header">
          <span><b>ประจำรอบเบิก:</b> {{ periodInfo?.name }}</span>
          <span><b>วันที่พิมพ์:</b> {{ formatDate(new Date()) }}</span>
        </div>
      </div>

      <!-- Data table -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 10%;">ลำดับ</th>
              <th style="width: 50%;">หน่วยบริการ (รพ.สต.)</th>
              <th class="text-right" style="width: 20%;">มูลค่ารวม (บาท)</th>
              <th style="width: 20%;">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(pcu, index) in reportData" :key="pcu.pcu_id">
              <td class="text-center">{{ index + 1 }}</td>
              <td>{{ pcu.pcu_name }}</td>
              <td class="text-right bold">{{ formatCurrency(pcu.total_value) }}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="summary-and-signature no-break">
        <table>
          <tfoot>
            <tr>
              <td colspan="2" class="text-right bold">รวมทั้งสิ้น</td>
              <td class="text-right bold">{{ formatCurrency(grandTotal) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <hr class="divider" />

        <div class="signature-section">
          <div class="signature-box">
            <p>..........................................</p>
            <p>(นายสุรเดช ประถมศักดิ์)</p>
            <p>ผู้จัดทำรายงาน</p>
          </div>
          <div class="signature-box">
            <p>..........................................</p>
            <p>(นางสาวเบญจวรรณ สำอางศิริ)</p>
            <p>ผู้ตรวจสอบ</p>
          </div>
        </div>
      </div>

    </div>
  </div>
  <div v-else class="loading">
    กำลังเตรียมข้อมูลสำหรับพิมพ์...
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '@/supabaseClient';

const route = useRoute();
const loading = ref(true);
const reportData = ref([]);
const periodInfo = ref(null);
const periodId = route.query.periodId;

const grandTotal = computed(() => {
  return reportData.value.reduce((sum, pcu) => sum + pcu.total_value, 0);
});

onMounted(async () => {
  if (!periodId) {
    document.body.innerHTML = 'ไม่พบ ID ของรอบเบิก';
    return;
  }
  try {
    const { data: periodData } = await supabase
      .from('requisition_periods_drugcupsabot')
      .select('name').eq('id', periodId).single();
    periodInfo.value = periodData;

    const { data, error: fetchError } = await supabase.rpc('get_accounting_summary_by_period', {
      period_id_param: periodId
    });
    if (fetchError) throw fetchError;
    reportData.value = data;

    setTimeout(() => window.print(), 500);
  } catch (err) {
    console.error("Error fetching print data:", err);
    document.body.innerHTML = `เกิดข้อผิดพลาด: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

function formatDate(date) {
  return date.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
function formatCurrency(value) {
  if (isNaN(value) || value === null) return '0.00';
  return Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<style scoped>
body { background-color: #eee; margin: 0; }
.print-container {
  font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
  font-size: 12pt; 
  color: #000;
  line-height: 1.4;
}
.page {
  background: white; width: 297mm; min-height: 210mm;
  padding: 15mm; margin: 0 auto; box-sizing: border-box;
  display: flex; flex-direction: column;
}
.text-center { text-align: center; }
.text-right { text-align: right; }
.bold { font-weight: bold; }

.header { margin-bottom: 1.5rem; }
.header-title-section h2 {
  font-size: 16pt; margin: 0 0 2px 0; 
}
.header-title-section h3 {
  font-size: 14pt; margin-bottom: 1rem; font-weight: 500;
}
.sub-header {
  display: flex; justify-content: space-between;
  border-top: 1px solid #333; border-bottom: 1px solid #333;
  padding: 6px 0; font-size: 11pt;
}

.table-wrapper { width: 100%; }
table {
  width: 100%; border-collapse: collapse; 
  border: 1px solid #000;
}
th, td { 
  border: 1px solid #000; padding: 6px 8px; 
  vertical-align: middle; 
}
th { font-weight: bold; }
tfoot td { background-color: #f2f2f2; }

.summary-and-signature {
  margin-top: 16px;
  page-break-before: avoid;
  page-break-inside: avoid;
}
.no-break {
  page-break-inside: avoid;
  break-inside: avoid;
}

.divider {
  border: none;
  border-top: 1px dashed #444;
  margin: 20px 0;
}

.signature-section {
  display: flex; justify-content: space-around;
  text-align: center; margin-top: 20px;
  page-break-inside: avoid; 
}
.signature-box {
  flex: 1;
}
.signature-box p { margin: 4px 0; }

@media print {
  .page { margin: 0; box-shadow: none; }
}
</style>