<template>
  <div class="print-container" v-if="!loading && periodInfo">
    <div class="page">
      <div class="memo-header">
        <div class="krut-container">
          <img src="/krut.png" alt="ตราครุฑ" class="krut-image">
        </div>
        <div class="title-container">
          <div class="memo-title">บันทึกข้อความ</div>
        </div>
      </div>

      <div class="memo-body">
        <p>
          <span class="label">ส่วนราชการ</span>
          โรงพยาบาลสระโบสถ์ กลุ่มงานเภสัชกรรม โทร ๐๓๖-๗๗๖๒๔๐ ต่อ ๑๐๔
        </p>

        <div class="header-line">
          <p><span class="label">ที่</span> ลบ ๐๐๓๓.๓๐๒/พิเศษ</p>
          <p><span class="label">วันที่</span> {{ formatDate(new Date()) }}</p>
        </div>

        <p><span class="label">เรื่อง</span> ขออนุมัติเบิกจ่ายยาให้แก่รพ.สต.</p>

        <p><span class="label">เรียน</span> ผู้อำนวยการโรงพยาบาลสระโบสถ์</p>

        <p class="indent">
          ด้วยกลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค มีความประสงค์จะเบิกจ่ายยาและเวชภัณฑ์ประจำรอบเบิก
          {{ periodInfo.name }} ให้แก่โรงพยาบาลส่งเสริมสุขภาพตำบล (รพ.สต.) 
          ในเครือข่าย เพื่อใช้ในการดำเนินงานบริการด้านสาธารณสุข 
          โดยมีรายละเอียดมูลค่าการเบิกจ่ายของแต่ละแห่ง ดังนี้
        </p>

        <div class="pcu-list">
          <p v-for="(pcu, index) in reportData" :key="pcu.pcu_id">
            {{ index + 1 }}. รพ.สต. {{ pcu.pcu_name }}เป็นเงิน {{ formatCurrency(pcu.total_value) }} บาท
          </p>
          <p>
            รวมเป็นเงินทั้งสิ้น {{ formatCurrency(grandTotal) }} บาท ({{ bahtText(grandTotal) }})
          </p>
        </div>

        <p class="indent">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</p>
        <div class="signatures">
          <div class="sender">
            <p>..........................................</p>
            <p>(นายสุรเดช ประถมศักดิ์)</p>
            <p>เภสัชกรชำนาญการ</p>
            <p>หัวหน้ากลุ่มงานเภสัชกรรมฯ</p>
          </div>

          <div class="approver">
            <p class="approval-checkbox">( ) อนุมัติ ( ) ไม่อนุมัติ</p>
            <p>..........................................</p>
            <p>(นายพงษ์จุมพฏ นิยมพฤกษ์)</p>
            <p>นายแพทย์ปฏิบัติการ รักษาการในตำแหน่ง</p>
            <p>ผู้อำนวยการโรงพยาบาลสระโบสถ์</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="loading">กำลังเตรียมเอกสาร...</div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '@/supabaseClient';

const route = useRoute();
const loading = ref(true);
const periodInfo = ref(null);
const reportData = ref([]);
const periodId = route.query.periodId;

const grandTotal = computed(() => reportData.value.reduce((sum, pcu) => sum + pcu.total_value, 0));

onMounted(async () => {
  if (!periodId) {
    document.body.innerHTML = 'ไม่พบ ID ของรอบเบิก';
    return;
  }
  try {
    const { data: periodData } = await supabase
      .from('requisition_periods_drugcupsabot')
      .select('name')
      .eq('id', periodId)
      .single();

    periodInfo.value = periodData;

    const { data, error } = await supabase.rpc('get_accounting_summary_by_period', {
      period_id_param: periodId,
    });
    if (error) throw error;

    reportData.value = data.sort((a, b) =>
      a.pcu_name.localeCompare(b.pcu_name, 'th')
    );

    setTimeout(() => window.print(), 500);
  } catch (err) {
    document.body.innerHTML = `เกิดข้อผิดพลาด: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

function formatDate(date) {
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
function formatCurrency(value) {
  return Number(value).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function bahtText(number) {
  const num = Number(number);
  if (isNaN(num)) return '';
  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  if (integerPart === '0' && decimalPart === '00') return 'ศูนย์บาทถ้วน';
  const bahtTextInteger = convert(integerPart) + 'บาท';
  const bahtTextDecimal =
    decimalPart === '00' ? 'ถ้วน' : convert(decimalPart) + 'สตางค์';
  return bahtTextInteger + bahtTextDecimal;
}
function convert(numberString) {
  const txtNumArr = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const txtDigitArr = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  let output = '';
  const len = numberString.length;
  for (let i = 0; i < len; i++) {
    const digit = parseInt(numberString[i]);
    const pos = len - 1 - i;
    if (digit > 0) {
      if (pos === 1 && digit === 1) output += '';
      else if (pos === 1 && digit === 2) output += 'ยี่';
      else if (pos === 0 && digit === 1 && len > 1) output += 'เอ็ด';
      else output += txtNumArr[digit];
      output += txtDigitArr[pos];
    }
  }
  return output || 'ศูนย์';
}
</script>

<style scoped>
body {
  background: #eee;
  margin: 0;
}

.print-container {
  font-family: 'Sarabun', sans-serif;
  color: #000;
  line-height: 1.6;
  font-size: 14pt;
}

.page {
  background: white;
  width: 210mm;
  min-height: 297mm;
  margin: 1cm auto;
  padding: 0cm 2cm 2cm 1.5cm;
  box-sizing: border-box;
}

.memo-header {
  display: flex;
  align-items: center;
  margin-bottom: 1cm;
}

.krut-container {
  width: 80px;
  text-align: left;
}

.krut-image {
  width: 80px;
  height: auto;
}

.title-container {
  flex-grow: 1;
  text-align: center;
}

.memo-title {
  font-size: 18pt;
  font-weight: bold;
}

.memo-body p {
  margin: 0.2cm 0;
}

.label {
  font-weight: bold;
  margin-right: 0.5em;
}

.header-line {
  display: flex;
  justify-content: space-between;
}

.indent {
  text-indent: 2cm;
}

.pcu-list {
  margin-left: 2cm;
  margin-top: 0.5cm;
}

.bold {
  font-weight: bold;
}

.signatures {
  margin-top: 1cm;
}

.sender { 
  width: 45%;
  text-align: center;
  margin-left: 50%;
}

.approver { 
  width: 45%;
  text-align: center;
  margin-top: 2cm;
}

.approval-checkbox {
  text-align: center;
  margin-bottom: 0.3cm;
}

@media print {
  body {
    background: none;
  }
  .page {
    box-shadow: none;
    margin: 0;
  }
  .print-container {
    font-size: 13pt;
  }
}
</style>