<template>
  <div class="container">
    <div class="header-actions no-print">
      <router-link to="/admin/dashboard" class="btn btn-secondary">
        <i class="fas fa-arrow-left"></i> กลับไปหน้า Dashboard
      </router-link>
    </div>

    <div v-if="loading" class="loading">กำลังโหลดข้อมูลใบเบิก...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!loading && requisition">

      <div class="card requisition-summary">
        <div class="summary-header">
          <h2><i class="fas fa-file-invoice-dollar"></i> รายละเอียดใบเบิก</h2>
          <span :class="['status-badge', requisition.status]">{{ requisition.status }}</span>
        </div>
        <div class="summary-grid">
          <div><strong>รพ.สต.:</strong><p>{{ requisition.pcus_drugcupsabot.name }}</p></div>
          <div><strong>รอบเบิก:</strong><p>{{ requisition.requisition_periods_drugcupsabot.name }}</p></div>
          <div><strong>วันที่ส่ง:</strong><p>{{ formatDate(requisition.submitted_at) }}</p></div>
        </div>
      </div>
      
      <h3><i class="fas fa-list-ol"></i> รายการที่เบิก</h3>
      <div class="table-wrapper card">
        <table>
          <thead>
            <tr>
              <th class="text-center">ลำดับ</th>
              <th>รายการเวชภัณฑ์</th>
              <th class="text-center">จำนวนขอเบิก</th>
              <th class="text-center">จำนวนอนุมัติ</th>
              <th class="text-right">ราคา/หน่วย</th>
              <th class="text-right">มูลค่าที่อนุมัติ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(reqItem, index) in editableItems" :key="reqItem.id">
              <td class="text-center">{{ index + 1 }}</td>
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
              <td class="text-right bold">{{ formatCurrency((reqItem.approved_quantity || 0) * reqItem.price_at_request) }}</td>
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

      <div class="card admin-actions no-print">
        <h3><i class="fas fa-cogs"></i> จัดการใบเบิก</h3>
        <div class="action-buttons">
          <button @click="saveAndApprove" :disabled="isUpdating" class="btn btn-primary">
            <i class="fas fa-check-double"></i>
            {{ isUpdating ? 'กำลังบันทึก...' : 'บันทึกและอนุมัติ (Approve)' }}
          </button>
          <button @click="fulfillRequisition" :disabled="isUpdating || requisition.status !== 'approved'" class="btn btn-success">
            <i class="fas fa-dolly"></i>
            {{ isUpdating ? 'กำลังบันทึก...' : 'ยืนยันการจ่าย (Fulfilled)' }}
          </button>
        </div>
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
    error.value = null;

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
    const itemsToUpdate = editableItems.value.map(item => ({
      id: item.id,
      approved_quantity: item.approved_quantity || 0
    }));

    const { error: rpcError } = await supabase.rpc('update_approved_quantities', {
      items_data: itemsToUpdate
    });
    if (rpcError) throw rpcError;

    const { error: reqError } = await supabase
      .from('requisitions_drugcupsabot')
      .update({ status: 'approved' })
      .eq('id', props.requisitionId);
    if (reqError) throw reqError;

    alert('บันทึกและอนุมัติใบเบิกเรียบร้อย');
    await fetchRequisition();

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
    await fetchRequisition();

  } catch (err) {
    alert('เกิดข้อผิดพลาด: ' + err.message);
    console.error(err);
  } finally {
    isUpdating.value = false;
  }
}

function formatDate(dateString) { 
  if (!dateString) return 'N/A'; 
  return new Date(dateString).toLocaleString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }); 
}
function formatCurrency(value) { 
  if (isNaN(value) || value === null) return '0.00'; 
  return Number(value).toLocaleString('th-TH', { 
    minimumFractionDigits: 2, maximumFractionDigits: 2 
  }); 
}
</script>

<style scoped>
.header-actions {
  margin-bottom: 1.5rem;
}
.requisition-summary {
  margin-bottom: 2rem;
}
.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.summary-header h2 {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
}
.summary-grid p {
  margin: 0;
  font-weight: 600;
}
.summary-grid strong {
  font-weight: 500;
  color: var(--text-muted);
}
h2 i, h3 i {
  margin-right: 0.75rem;
  color: var(--primary-color);
}
.table-wrapper {
  padding: 0;
  border: none;
}
.quantity-input {
  width: 90px;
  text-align: center;
}
.admin-actions {
  margin-top: 2rem;
}
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}
.hint {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-top: 1rem;
  margin-bottom: 0;
}
</style>