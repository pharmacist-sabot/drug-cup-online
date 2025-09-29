<template>
  <div class="print-container portrait" v-if="requisition">
    <div class="page">
      <!-- Header -->
      <div class="header">
        <div class="top-header">
          <span class="bold">ใบเบิกพัสดุ</span>
        </div>
        <div class="sub-header">
          <span>ส่วนราชการ <u>โรงพยาบาลสระโบสถ์ คลังเวชภัณฑ์</u></span>
          <span>วันที่ <u>{{ formatDate(new Date()) }}</u></span>
        </div>
      </div>

      <!-- Body -->
      <div class="body-content">
        <p>
          เรียน <u>ผู้อำนวยการโรงพยาบาลสระโบสถ์</u>
        </p>
        <p class="indent">
          ด้วย <u>โรงพยาบาลส่งเสริมสุขภาพตำบล {{ requisition.pcus_drugcupsabot.name }}</u> มีความประสงค์ขอเบิกพัสดุตามรายการต่อไปนี้ เพื่อใช้ในราชการ
          สำหรับ <u>{{ requisition.requisition_periods_drugcupsabot.name }}</u>
        </p>
      </div>

      <!-- Items Table -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รายการ</th>
              <th>จำนวน</th>
              <th>หน่วยนับ</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in requisition.requisition_items_drugcupsabot" :key="item.id">
              <td class="center">{{ index + 1 }}</td>
              <td>{{ item.items_drugcupsabot.name }}</td>
              <td class="center">{{ item.approved_quantity ?? item.quantity }}</td>
              <td class="center">{{ item.items_drugcupsabot.unit_pack }}</td>
              <td></td>
            </tr>

            <tr v-for="n in emptyRows" :key="'empty-'+n">
              <td>&nbsp;</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer / Signatures -->
      <div class="signature-section">
        <div class="signature-box">
          <p>ลงชื่อ .......................................... ผู้เบิก</p>
          <p>({{ personnel?.requester_name || '.....................................................' }})</p>
          <p>ตำแหน่ง {{ personnel?.requester_position || '.................................................' }}</p>
        </div>
        <div class="signature-box">
          <p>ลงชื่อ .......................................... ผู้รับของ</p>
          <p>({{ personnel?.receiver_name || '.....................................................' }})</p>
          <p>ตำแหน่ง {{ personnel?.receiver_position || '.................................................' }}</p>
        </div>
        <div class="signature-box">
          <p>ลงชื่อ .......................................... ผู้อนุมัติ</p>
          <p>(นายกิตติคุณ เขียวขำ)</p>
          <p>ตำแหน่ง เภสัชกรปฏิบัติการ</p>
        </div>
        <div class="signature-box">
          <p>ลงชื่อ .......................................... ผู้จ่าย</p>
          <p>(นางสาวศศิธร เสนา)</p>
          <p>ตำแหน่ง เจ้าพนักงานเภสัชกรรมชำนาญงาน</p>
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
const requisition = ref(null);
const personnel = ref(null); 
const loading = ref(true);
const requisitionId = route.query.id;

const emptyRows = computed(() => {
  if (!requisition.value) return 0;
  const itemCount = requisition.value.requisition_items_drugcupsabot.length;
  return Math.max(0, 15 - itemCount);
});

onMounted(async () => {
  if (!requisitionId) {
    document.body.innerHTML = 'ไม่พบ ID ของใบเบิก';
    return;
  }

  try {
    const { data: requisitionData, error: requisitionError } = await supabase
      .from('requisitions_drugcupsabot')
      .select(`
        id, status, submitted_at,
        pcus_drugcupsabot (id, name),
        requisition_periods_drugcupsabot (name),
        requisition_items_drugcupsabot (
          quantity, approved_quantity,
          items_drugcupsabot (name, unit_pack)
        )
      `)
      .eq('id', requisitionId)
      .single();

    if (requisitionError) throw requisitionError;
    requisition.value = requisitionData;

    if (requisitionData && requisitionData.pcus_drugcupsabot?.id) {
      const pcuId = requisitionData.pcus_drugcupsabot.id;
      
      const { data: personnelData, error: personnelError } = await supabase
        .from('pcu_personnel_drugcupsabot')
        .select('*')
        .eq('pcu_id', pcuId)
        .single(); 
      
      if (personnelError && personnelError.code !== 'PGRST116') {
        throw personnelError;
      }
      
      personnel.value = personnelData; 
    }

    setTimeout(() => {
      window.print();
    }, 500); 

  } catch (err) {
    console.error("Error fetching data for printing:", err);
    document.body.innerHTML = `เกิดข้อผิดพลาด: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
</script>

<style>
@media print {
  @page portrait {
    size: A4 portrait;
  }
  .portrait { page: portrait; }
}
</style>

<!-- Scoped styles for this component -->
<style scoped>
/* A4 page styles */
body {
  background-color: #eee;
  margin: 0;
  padding: 0;
}
.print-container {
  font-family: 'Sarabun', sans-serif;
  font-size: 16px; 
  line-height: 1.6;
  color: #000;
}
.page {
  background: white;
  width: 210mm;
  min-height: 297mm;
  padding: 20mm;
  margin: 10mm auto;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

/* Header */
.header {
  margin-bottom: 20px;
}
.top-header {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  position: relative;
  margin-bottom: 20px;
}
.top-header .bold {
  font-size: 24px;
  font-weight: bold;
}
.sub-header {
  display: flex;
  justify-content: space-between;
}

/* Body */
.body-content p {
  margin: 10px 0;
}
.indent {
  text-indent: 50px;
}
u {
  text-decoration: none;
  border-bottom: 1px dotted #000;
}

/* Table */
.table-wrapper {
  margin-top: 20px;
}
table {
  width: 100%;
  border-collapse: collapse;
  border: 2px solid #000;
}
th, td {
  border: 1px solid #000;
  padding: 8px;
  text-align: left;
  vertical-align: top;
}
th {
  text-align: center;
  font-weight: bold;
}
td.center {
  text-align: center;
}

/* Signature */
.signature-section {
  margin-top: 40px;
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  row-gap: 40px; 
  column-gap: 20px; 
  text-align: center;
}
.signature-box {
  width: 100%; 
}
.signature-box p {
  margin: 5px 0 30px 0;
}

@media print {
  body, .page {
    margin: 0;
    box-shadow: none;
  }
  .print-container {
    font-size: 11pt; 
    line-height: 1.5;
  }
  .page {
    padding: 15mm 20mm; 
  }

  thead {
    display: table-header-group; 
  }

  tfoot {
    display: table-footer-group;
  }

  tr, .signature-box {
    page-break-inside: avoid;
  }

  .signature-section {
    page-break-before: auto; 
  }
}
</style>