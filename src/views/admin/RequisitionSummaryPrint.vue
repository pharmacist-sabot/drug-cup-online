<template>
  <div class="print-container landscape" v-if="processedData.length > 0">
    <div class="page">

      <div class="header">
        <h2 class="bold">ใบสรุปยอดรวมการเบิกเวชภัณฑ์</h2>
        <div class="sub-header">
          <span>รอบการเบิก: <u>{{ periodInfo?.name }}</u></span>
          <span>วันที่พิมพ์: <u>{{ formatDate(new Date()) }}</u></span>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รายการ</th>
              <th class="center">หน่วยนับ</th>
              <th class="center">ยอดรวมทั้งหมด</th>
              <th v-for="pcu in pcuList" :key="pcu.id" class="center pcu-header">{{ pcu.name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in processedData" :key="item.item_id">
              <td class="center">{{ index + 1 }}</td>
              <td>{{ item.item_name }}</td>
              <td class="center">{{ item.unit_pack }}</td>
              <td class="center bold total-col">{{ item.total_quantity }}</td>
              <td v-for="pcu in pcuList" :key="pcu.id" class="center">
                {{ item.pcu_breakdown[pcu.id] || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <div v-else class="loading">
    กำลังเตรียมข้อมูลสำหรับพิมพ์...
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '@/supabaseClient';

const route = useRoute();
const processedData = ref([]);
const periodInfo = ref(null);
const pcuList = ref([]);
const loading = ref(true);

const periodId = route.query.periodId;

onMounted(async () => {
  if (!periodId) {
    document.body.innerHTML = 'ไม่พบ ID ของรอบเบิก';
    return;
  }

  try {
    const { data: periodData } = await supabase.from('requisition_periods_drugcupsabot').select('name').eq('id', periodId).single();
    periodInfo.value = periodData;

    const { data: pcusData } = await supabase.from('pcus_drugcupsabot').select('id, name').order('name');
    pcuList.value = pcusData;

    const { data, error } = await supabase
      .from('requisition_items_drugcupsabot')
      .select(`
        approved_quantity,
        items_drugcupsabot (id, name, unit_pack, category_order, item_order),
        requisitions_drugcupsabot (pcu_id, status, period_id)
      `)
      .in('requisitions_drugcupsabot.status', ['approved', 'fulfilled'])
      .eq('requisitions_drugcupsabot.period_id', periodId);
      
    if (error) throw error;
    
    const summary = data.reduce((acc, current) => {
      if (!current.requisitions_drugcupsabot || !current.items_drugcupsabot) {
        console.warn('Skipping orphaned requisition item during print process:', current);
        return acc; 
      }
      
      const itemId = current.items_drugcupsabot.id;
      const itemName = current.items_drugcupsabot.name;
      const unitPack = current.items_drugcupsabot.unit_pack;
      const categoryOrder = current.items_drugcupsabot.category_order;
      const itemOrder = current.items_drugcupsabot.item_order;
      const pcuId = current.requisitions_drugcupsabot.pcu_id;
      const qty = current.approved_quantity || 0;

      if (!acc[itemId]) {
        acc[itemId] = {
          item_id: itemId,
          item_name: itemName,
          unit_pack: unitPack,
          total_quantity: 0,
          pcu_breakdown: {},
          category_order: categoryOrder,
          item_order: itemOrder,
        };
      }
      
      acc[itemId].total_quantity += qty;
      acc[itemId].pcu_breakdown[pcuId] = (acc[itemId].pcu_breakdown[pcuId] || 0) + qty;
      
      return acc;
    }, {});

    processedData.value = Object.values(summary).sort((a, b) => {
      const categoryDiff = (a.category_order || 9999) - (b.category_order || 9999);
      if (categoryDiff !== 0) return categoryDiff;

      const itemDiff = (a.item_order || 9999) - (b.item_order || 9999);
      if (itemDiff !== 0) return itemDiff;
      
      return a.item_name.localeCompare(b.item_name, 'th');
    });

    setTimeout(() => {
      window.print();
    }, 500);

  } catch (err) {
    console.error("Error processing requisitions for print:", err);
    document.body.innerHTML = `เกิดข้อผิดพลาด: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
</script>

<style>
@media print {
  @page landscape {
    size: A4 landscape;
  }
  .landscape { page: landscape; }
}
</style>

<style scoped>
/* A4 page styles in landscape */
body {
  background-color: #eee;
  margin: 0;
  padding: 0;
}
.print-container {
  font-family: 'Sarabun', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #000;
}
.page {
  background: white;
  width: 297mm;
  min-height: 210mm;
  padding: 15mm;
  margin: 10mm auto;
  box-sizing: border-box;
}

/* Header */
.header {
  margin-bottom: 20px;
  text-align: center;
}
.header .bold {
  font-size: 22px;
  font-weight: bold;
}
.sub-header {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 16px;
}
u {
  text-decoration: none;
  border-bottom: 1px dotted #000;
}

/* Table */
table {
  width: 100%;
  border-collapse: collapse;
  border: 2px solid #000;
}
th, td {
  border: 1px solid #000;
  padding: 6px;
  text-align: left;
  vertical-align: top;
}
th {
  text-align: center;
  font-weight: bold;
}
td.center, th.center {
  text-align: center;
}
.total-col {
  background-color: #f2f2f2;
}
.pcu-header {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  white-space: nowrap;
}

/* Print-specific styles */
@media print {
  body, .page {
    margin: 0;
    box-shadow: none;
  }
  .print-container {
    font-size: 9pt;
  }
  .page {
    padding: 10mm 15mm;
  }
  thead {
    display: table-header-group;
  }
  tr {
    page-break-inside: avoid;
  }
}
</style>