<template>
  <div class="container">
    <h2 class="no-print">พิมพ์รายงานใบเบิก (แยกตาม รพ.สต.)</h2>
    
    <!-- Options Section -->
    <div class="report-options no-print">
      <div class="form-group">
        <label for="report-period">1. เลือกรอบเบิก:</label>
        <select id="report-period" v-model="selectedPeriod" @change="fetchRequisitionsForPeriod">
          <option :value="null" disabled>-- กรุณาเลือกรอบเบิก --</option>
          <option v-for="period in periods" :key="period.id" :value="period.id">
            {{ period.name }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label for="report-pcu">2. เลือก รพ.สต.:</label>
        <select id="report-pcu" v-model="selectedRequisition" :disabled="!selectedPeriod">
          <option :value="null" disabled>-- กรุณาเลือก รพ.สต. --</option>
          <option v-for="req in requisitionsInPeriod" :key="req.id" :value="req">
            {{ req.pcus_drugcupsabot.name }} (สถานะ: {{ req.status }})
          </option>
        </select>
      </div>
      <div class="action-buttons">
        <button @click="generatePdf" :disabled="!selectedRequisition || isGenerating" class="btn-primary">
          {{ isGenerating ? 'กำลังสร้าง PDF...' : 'สร้าง PDF และพิมพ์' }}
        </button>
        <button @click="exportToExcel" :disabled="!selectedRequisition" class="btn-success">
          ส่งออกเป็น Excel
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>

    <!-- Preview Section -->
    <div v-if="selectedRequisition" class="preview-container no-print">
      <h3>ตัวอย่างก่อนพิมพ์ (ข้อมูลจะถูกจัดรูปแบบใน PDF อัตโนมัติ)</h3>
      <div class="preview-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ลำดับ</th>
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
    <p v-else-if="selectedPeriod && !loading" class="no-data-message">
      กรุณาเลือก รพ.สต. เพื่อดูข้อมูล (หากไม่มีให้เลือก แสดงว่ายังไม่มีใบเบิกที่อนุมัติในรอบนี้)
    </p>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/supabaseClient';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import sarabunBase64 from '@/assets/fonts/sarabun.base64.js?raw';

// =================================================================
// 1. STATE MANAGEMENT
// =================================================================
const loading = ref(false);
const isGenerating = ref(false);
const periods = ref([]);
const requisitionsInPeriod = ref([]);
const selectedPeriod = ref(null);
const selectedRequisition = ref(null);

// =================================================================
// 2. COMPUTED PROPERTIES
// =================================================================
const grandTotal = computed(() => {
  if (!selectedRequisition.value) return 0;
  return selectedRequisition.value.requisition_items_drugcupsabot.reduce((sum, item) => {
    const quantityToUse = item.approved_quantity ?? item.quantity;
    const itemTotal = Number(quantityToUse) * Number(item.price_at_request);
    return sum + itemTotal;
  }, 0);
});

// =================================================================
// 3. DATA FETCHING & EVENT HANDLERS
// =================================================================
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

// =================================================================
// 4. REPORT GENERATION
// =================================================================

/**
 * Generates a multi-page PDF document using jsPDF and jspdf-autotable.
 */
function generatePdf() {
  if (!selectedRequisition.value) return;
  isGenerating.value = true;
  
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // --- Font Setup ---
    doc.addFileToVFS('Sarabun-Regular.ttf', sarabunBase64); 
    doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
    doc.setFont('Sarabun');

    // --- Prepare Data ---
    const pcuName = selectedRequisition.value.pcus_drugcupsabot.name;
    const periodName = selectedRequisition.value.requisition_periods_drugcupsabot.name;
    
    // --- Draw Header ---
    drawPdfHeader(doc, pcuName, periodName);

    // --- Prepare Table Data ---
    const tableData = prepareTableData();
    
    // --- Create Table ---
    autoTable(doc, {
      head: tableData.head,
      body: tableData.body,
      startY: 40,
      theme: 'grid',
      styles: { font: 'Sarabun', fontSize: 10 },
      headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 }, // ลำดับ
        2: { halign: 'center', cellWidth: 20 }, // หน่วยนับ
        3: { halign: 'center', cellWidth: 15 }, // ขอเบิก
        4: { halign: 'center', cellWidth: 15, fontStyle: 'bold' }, // อนุมัติ
        5: { halign: 'right', cellWidth: 20 }, // ราคา
        6: { halign: 'right', cellWidth: 25 }  // มูลค่ารวม
      },
      didDrawPage: (data) => {
        // Add footer with page number on each page
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `หน้า ${data.pageNumber} / ${pageCount}`, 
          doc.internal.pageSize.getWidth() - data.settings.margin.right, 
          doc.internal.pageSize.getHeight() - 10, 
          { align: 'right' }
        );
      }
    });
    
    // --- Draw Signatures ---
    drawPdfSignatures(doc);

    // --- Save File ---
    const fileName = `ใบเบิก_${pcuName}_${periodName}.pdf`;
    doc.save(fileName);

  } catch (err) {
    console.error("Error generating PDF:", err);
    alert("ขออภัย, เกิดข้อผิดพลาดในการสร้างไฟล์ PDF");
  } finally {
    isGenerating.value = false;
  }
}

/**
 * Exports the selected requisition data to an Excel file.
 */
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

// =================================================================
// 5. HELPER FUNCTIONS
// =================================================================

/**
 * Draws the header section on the PDF document.
 * @param {jsPDF} doc The jsPDF instance.
 * @param {string} pcuName The name of the PCU.
 * @param {string} periodName The name of the requisition period.
 */
function drawPdfHeader(doc, pcuName, periodName) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(16);
  doc.text('ใบเบิกเวชภัณฑ์', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`โรงพยาบาลส่งเสริมสุขภาพตำบล ${pcuName}`, pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`สังกัดโรงพยาบาลสระโบสถ์ จังหวัดลพบุรี`, pageWidth / 2, 28, { align: 'center' });
  doc.text(`รอบการเบิก: ${periodName}`, pageWidth / 2, 34, { align: 'center' });
}

/**
 * Prepares the head and body data for the jspdf-autotable.
 * @returns {{head: string[][], body: any[][]}}
 */
function prepareTableData() {
  const head = [
    ['ลำดับ', 'รายการเวชภัณฑ์', 'หน่วยนับ', 'ขอเบิก', 'อนุมัติ', 'ราคา/หน่วย', 'มูลค่ารวม (บาท)']
  ];

  const body = selectedRequisition.value.requisition_items_drugcupsabot.map((item, index) => [
    index + 1,
    item.items_drugcupsabot.name,
    item.items_drugcupsabot.unit_pack,
    item.quantity,
    item.approved_quantity ?? item.quantity,
    formatCurrency(item.price_at_request),
    formatCurrency((item.approved_quantity ?? item.quantity) * item.price_at_request)
  ]);
  
  const totalRow = [
      { content: 'รวมมูลค่าทั้งสิ้น', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(grandTotal.value), styles: { halign: 'right', fontStyle: 'bold' } }
  ];
  body.push(totalRow);

  return { head, body };
}

/**
 * Draws the 2x2 signature section at the end of the PDF document.
 * @param {jsPDF} doc The jsPDF instance.
 */
function drawPdfSignatures(doc) {
  const finalY = doc.lastAutoTable.finalY;
  const pageHeight = doc.internal.pageSize.getHeight();
  let signatureY = finalY + 20;

  if (signatureY > pageHeight - 60) {
    doc.addPage();
    signatureY = 20;
  }

  doc.setFontSize(11);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const col1X = margin;
  const col2X = pageWidth / 2 + 10;
  const textOffsetY = 7;
  const lineLength = (pageWidth / 2) - margin - 20;

  // Row 1
  doc.text('(.................................................)', col1X, signatureY);
  doc.text('ผู้เบิก', col1X + (lineLength / 2), signatureY + textOffsetY, { align: 'center' });
  
  doc.text('(.................................................)', col2X, signatureY);
  doc.text('ผู้จ่าย', col2X + (lineLength / 2), signatureY + textOffsetY, { align: 'center' });

  // Row 2
  signatureY += 25;
  doc.text('(.................................................)', col1X, signatureY);
  doc.text('ผู้รับของ', col1X + (lineLength / 2), signatureY + textOffsetY, { align: 'center' });

  doc.text('(.................................................)', col2X, signatureY);
  doc.text('ผู้อนุมัติ', col2X + (lineLength / 2), signatureY + textOffsetY, { align: 'center' });
}

/**
 * Formats a number into a Thai currency string.
 * @param {number | null | undefined} value The number to format.
 * @returns {string}
 */
function formatCurrency(value) {
  if (isNaN(value) || value === null || value === undefined) return '0.00';
  return Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<style scoped>
/* General Styles */
.container {
  max-width: 1200px;
}
.report-options {
  background-color: var(--light-color);
  padding: 1.5rem;
  border-radius: var(--border-radius);
  margin-bottom: 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-end;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group label {
  margin-bottom: 0.5rem;
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--secondary-color);
}
select {
  padding: 0.5rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  min-width: 250px;
}
.action-buttons {
  display: flex;
  gap: 1rem;
}
.preview-container {
  margin-top: 2rem;
  border: 1px dashed var(--secondary-color);
  padding: 1.5rem;
  background-color: #fafafa;
}
.preview-table-wrapper {
  max-height: 400px;
  overflow-y: auto;
}
.preview-container table {
  width: 100%;
  border-collapse: collapse;
}
.preview-container th, .preview-container td {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
}
.no-data-message {
  padding: 1.5rem;
  text-align: center;
  color: var(--secondary-color);
  background-color: var(--light-color);
  border-radius: var(--border-radius);
}
.bold { font-weight: bold; }
.text-right { text-align: right; }
.text-center { text-align: center; }

/* Hide preview when printing */
@media print {
  .no-print {
    display: none;
  }
}
</style>