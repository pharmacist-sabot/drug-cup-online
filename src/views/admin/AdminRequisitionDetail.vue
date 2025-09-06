<template>
  <div class="container">
    <div class="header-actions no-print">
      <router-link to="/admin/dashboard" class="back-link">&larr; กลับไปหน้า Dashboard</router-link>
    </div>

    <div v-if="loading" class="loading">กำลังโหลดข้อมูลใบเบิก...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!loading && requisition" class="requisition-details">
      <div class="printable-header">
        <h2 class="no-print">รายละเอียดใบเบิก</h2>
        <h3 class="print-only">ใบเบิกเวชภัณฑ์</h3>
      </div>
      
      <div class="summary-grid">
        <div><strong>รพ.สต.:</strong><p>{{ requisition.pcus_drugcupsabot.name }}</p></div>
        <div><strong>รอบเบิก:</strong><p>{{ requisition.requisition_periods_drugcupsabot.name }}</p></div>
        <div><strong>สถานะ:</strong><p><span :class="['status-badge', requisition.status]">{{ requisition.status }}</span></p></div>
        <div><strong>วันที่ส่ง:</strong><p>{{ formatDate(requisition.submitted_at) }}</p></div>
      </div>

      <h3>รายการที่เบิก <span class="no-print">(สามารถแก้ไขจำนวนที่อนุมัติได้)</span></h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รายการเวชภัณฑ์</th>
              <th class="text-center">จำนวนที่ขอเบิก</th>
              <th class="text-center">จำนวนที่อนุมัติ</th>
              <th class="text-right">ราคาต่อหน่วย</th>
              <th class="text-right">มูลค่าที่อนุมัติ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(reqItem, index) in editableItems" :key="reqItem.id">
              <td>{{ index + 1 }}</td>
              <td>{{ reqItem.items_drugcupsabot.name }}</td>
              <td class="text-center">{{ reqItem.quantity }}</td>
              <td>
                <input 
                  type="number" 
                  class="quantity-input" 
                  v-model.number="reqItem.approved_quantity"
                  min="0"
                  @focus="$event.target.select()"
                />
              </td>
              <td class="text-right">{{ formatCurrency(reqItem.price_at_request) }}</td>
              <td class="text-right">{{ formatCurrency((reqItem.approved_quantity || 0) * reqItem.price_at_request) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="text-right bold">มูลค่ารวมที่อนุมัติ</td>
              <td class="text-right bold">{{ formatCurrency(grandTotalApproved) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="admin-actions no-print">
        <h3>จัดการใบเบิก</h3>
        <button @click="saveAndApprove" :disabled="isUpdating" class="btn-primary">
          {{ isUpdating ? 'กำลังบันทึก...' : 'บันทึกและอนุมัติ (Approve)' }}
        </button>
        <button @click="fulfillRequisition" :disabled="isUpdating || requisition.status !== 'approved'" class="btn-success">
          {{ isUpdating ? 'กำลังบันทึก...' : 'ยืนยันการจ่าย (Fulfilled)' }}
        </button>
        <p v-if="requisition.status !== 'approved'" class="hint">
          * ต้องอนุมัติใบเบิกก่อนจึงจะยืนยันการจ่ายได้
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/supabaseClient';

const props = defineProps({
  requisitionId: String
});

const loading = ref(true);
const error = ref(null);
const requisition = ref(null);
const editableItems = ref([]);
const isUpdating = ref(false);

async function fetchRequisition() {
  try {
    loading.value = true;
    error.value = null; // Clear previous errors

    const { data, error: fetchError } = await supabase
      .from('requisitions_drugcupsabot')
      .select(`
        *, 
        pcus_drugcupsabot(name), 
        requisition_periods_drugcupsabot(name),
        requisition_items_drugcupsabot(
          *, 
          items_drugcupsabot(name, unit_pack)
        )
      `)
      .eq('id', props.requisitionId)
      .single();

    if (fetchError) throw fetchError;
    
    requisition.value = data;
    
    // Create a deep copy of items to allow editing without affecting the original data immediately
    // If 'approved_quantity' is null (first time), use the requested 'quantity' as the default value
    editableItems.value = data.requisition_items_drugcupsabot.map(item => ({
      ...item,
      approved_quantity: item.approved_quantity ?? item.quantity 
    }));

  } catch (err) {
    error.value = 'ไม่สามารถโหลดข้อมูลได้: ' + err.message;
    console.error(err);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchRequisition);

const grandTotalApproved = computed(() => {
  if (!editableItems.value) return 0;
  return editableItems.value.reduce((sum, item) => {
    const quantity = item.approved_quantity || 0;
    const price = item.price_at_request || 0;
    return sum + (Number(quantity) * Number(price));
  }, 0);
});

async function saveAndApprove() {
  if (!confirm('ยืนยันการบันทึกและอนุมัติใบเบิกนี้? การกระทำนี้จะอัปเดตจำนวนที่อนุมัติทั้งหมด')) return;
  
  isUpdating.value = true;
  try {
    // 1. Prepare the data payload for the RPC function
    const itemsToUpdate = editableItems.value.map(item => ({
      id: item.id,
      approved_quantity: item.approved_quantity || 0 // Ensure we don't send null
    }));

    // 2. Call the 'update_approved_quantities' database function via RPC
    const { error: rpcError } = await supabase.rpc('update_approved_quantities', {
      items_data: itemsToUpdate
    });
    if (rpcError) throw rpcError;

    // 3. Update the status of the main requisition to 'approved'
    const { error: reqError } = await supabase
      .from('requisitions_drugcupsabot')
      .update({ status: 'approved' })
      .eq('id', props.requisitionId);
    if (reqError) throw reqError;

    alert('บันทึกและอนุมัติใบเบิกเรียบร้อย');
    await fetchRequisition(); // Reload data to reflect changes

  } catch (err) {
    alert('เกิดข้อผิดพลาด: ' + err.message);
    console.error(err);
  } finally {
    isUpdating.value = false;
  }
}

async function fulfillRequisition() {
  if (!confirm('ยืนยันการจ่ายเวชภัณฑ์ตามจำนวนที่อนุมัติแล้วใช่หรือไม่?')) return;
  
  isUpdating.value = true;
  try {
    const { error: reqError } = await supabase
      .from('requisitions_drugcupsabot')
      .update({ status: 'fulfilled' })
      .eq('id', props.requisitionId);
    if (reqError) throw reqError;

    alert('ยืนยันการจ่ายเวชภัณฑ์เรียบร้อย');
    await fetchRequisition(); // Reload data

  } catch (err) {
    alert('เกิดข้อผิดพลาด: ' + err.message);
    console.error(err);
  } finally {
    isUpdating.value = false;
  }
}

// Helper functions for formatting
function formatDate(dateString) { 
  if (!dateString) return 'N/A'; 
  return new Date(dateString).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }); 
}
function formatCurrency(value) { 
  if (isNaN(value) || value === null) return '0.00'; 
  return Number(value).toLocaleString('th-TH', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }); 
}
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}
.header-actions {
  margin-bottom: 1.5rem;
}
.back-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: bold;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  background-color: var(--light-color);
  padding: 1.5rem;
  border-radius: var(--border-radius);
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
}
.summary-grid p {
  margin: 0;
  font-weight: 600;
}
.status-badge {
  padding: 0.3em 0.7em;
  border-radius: 12px;
  color: white;
  font-size: 0.9rem;
  font-weight: bold;
  text-transform: capitalize;
}
.status-badge.draft { background-color: var(--secondary-color); }
.status-badge.submitted { background-color: var(--warning-color); color: var(--dark-color); }
.status-badge.approved { background-color: var(--primary-color); }
.status-badge.fulfilled { background-color: var(--success-color); }

.table-wrapper {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 0.8rem;
  border: 1px solid var(--border-color);
  vertical-align: middle;
}
thead {
  background-color: var(--light-color);
}
.text-right { text-align: right; }
.text-center { text-align: center; }
.bold { font-weight: bold; }
tfoot {
  background-color: #e9ecef;
  font-weight: bold;
}
.quantity-input {
  width: 80px;
  text-align: center;
  padding: 0.4rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}
.quantity-input:focus {
  outline: 2px solid var(--primary-color);
  border-color: var(--primary-color);
}
.admin-actions {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #f0f8ff;
  border: 1px solid var(--primary-color);
  border-radius: var(--border-radius);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.hint {
  font-size: 0.85rem;
  color: var(--secondary-color);
  margin: 0;
}
</style>