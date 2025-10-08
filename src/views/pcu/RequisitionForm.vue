<template>
  <div class="container">
    <h2><i class="fas fa-file-signature"></i> {{ isEditing ? 'แก้ไขใบเบิก' : 'สร้างใบเบิกใหม่' }}</h2>
    <p class="text-muted">{{ periodInfo?.name }}</p>
    
    <div class="toolbar card">
      <div class="form-group">
        <label for="search"><i class="fas fa-search"></i> ค้นหารายการ</label>
        <input type="text" id="search" v-model="searchTerm" placeholder="พิมพ์ชื่อยาเพื่อค้นหา..." class="search-input">
      </div>
    </div>
    
    <div v-if="loading" class="loading">กำลังโหลดรายการ...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <form @submit.prevent="submitForm" v-if="!loading && !error">
      <div class="table-wrapper card">
        <table>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ประเภท</th>
              <th>รายการเวชภัณฑ์</th>
              <th>หน่วยนับ</th>
              <th class="text-right">ราคา</th>
              <th class="text-center">คงเหลือ</th>
              <th class="text-center">จำนวนเบิก</th>
              <th class="text-right">มูลค่า</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id" :class="{ 'locked-item': !item.is_available }">
              <td class="text-center">{{ item.item_order }}</td>
              <td>{{ item.category }}</td>
              <td>
                {{ item.name }}

                <span v-if="!item.is_available && item.notes" class="item-note">
                  ({{ item.notes }})
                </span>
              </td>
              <td class="text-center">{{ item.unit_pack }}</td>
              <td class="text-right">{{ formatCurrency(item.price_per_unit) }}</td>
              <td class="text-center">
                <input 
                  type="number"
                  min="0"
                  class="quantity-input"
                  v-model.number="requisitionData[item.id].onHand"
                  @focus="$event.target.select()"
                  :disabled="!item.is_available"
                >
              </td>
              <td class="text-center">
                <input 
                  type="number" 
                  min="0"
                  class="quantity-input" 
                  v-model.number="requisitionData[item.id].quantity"
                  @input="updateTotal"
                  @focus="$event.target.select()"
                  :disabled="!item.is_available" 
                >
              </td>
              <td class="text-right">{{ formatCurrency(calculateValue(item)) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7" class="text-right bold">รวมมูลค่าทั้งหมด</td>
              <td class="text-right bold">{{ formatCurrency(totalValue) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="form-actions">
        <button type="button" @click="saveDraft" class="btn btn-secondary" :disabled="isSubmitting">
          <i class="fas fa-save"></i>
          {{ isSubmitting ? 'กำลังบันทึก...' : 'บันทึกฉบับร่าง' }}
        </button>
        <button type="submit" class="btn btn-success" :disabled="isSubmitting">
          <i class="fas fa-paper-plane"></i>
          {{ isSubmitting ? 'กำลังส่ง...' : 'ส่งใบเบิก' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import { useAuthStore } from '@/store/auth'

const props = defineProps({
  periodId: String,
  requisitionId: String
})

const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const isSubmitting = ref(false)
const error = ref(null)
const items = ref([])
const periodInfo = ref(null)
const requisitionData = ref({})
const totalValue = ref(0)
const searchTerm = ref('')

const isEditing = computed(() => props.requisitionId && props.requisitionId !== 'new')

onMounted(async () => {
  try {
    const { data: periodData, error: periodError } = await supabase
      .from('requisition_periods_drugcupsabot')
      .select('name')
      .eq('id', props.periodId)
      .single()
    if (periodError) throw periodError
    periodInfo.value = periodData

    const { data: itemsData, error: itemsError } = await supabase
      .from('items_drugcupsabot')
      .select('*')
      .eq('is_active', true)
      .order('category_order', { ascending: true }) 
      .order('item_order', { ascending: true }); 
    if (itemsError) throw itemsError
    items.value = itemsData

    items.value.forEach(item => {
      requisitionData.value[item.id] = { quantity: null, onHand: null };
    });

    if (isEditing.value) {
      const { data: existingData, error: draftError } = await supabase
        .from('requisition_items_drugcupsabot')
        .select('item_id, quantity, on_hand_quantity')
        .eq('requisition_id', props.requisitionId)
      
      if (draftError) throw draftError

      if (existingData) {
        existingData.forEach(item => {
          if (requisitionData.value[item.item_id]) {
            requisitionData.value[item.item_id].quantity = item.quantity;
            requisitionData.value[item.item_id].onHand = item.on_hand_quantity;
          }
        })
        updateTotal()
      }
    }
  } catch (err)
 {
    error.value = 'ไม่สามารถโหลดข้อมูลได้: ' + err.message
    console.error(err)
  } finally {
    loading.value = false
  }
})

const filteredItems = computed(() => {
  if (!searchTerm.value) return items.value
  return items.value.filter(item => 
    item.name.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
})

function calculateValue(item) {
  if (!item.is_available) {
    if (requisitionData.value[item.id]?.quantity) {
      requisitionData.value[item.id].quantity = 0;
    }
    return 0;
  }
  const quantity = requisitionData.value[item.id]?.quantity || 0
  return quantity * item.price_per_unit
}

function updateTotal() {
  totalValue.value = items.value.reduce((sum, item) => {
    return sum + calculateValue(item)
  }, 0)
}

function formatCurrency(value) {
  if (isNaN(value) || value === null) return '0.00'
  return Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function saveRequisition(status) {
  if (!auth.userProfile || !auth.userPcuId) {
    alert("ข้อมูลผู้ใช้ไม่สมบูรณ์");
    return;
  }
  isSubmitting.value = true;

  try {
    let currentRequisitionId = isEditing.value ? props.requisitionId : null;

    if (!isEditing.value) {
      const { data: newHeader, error: headerError } = await supabase
        .from('requisitions_drugcupsabot')
        .insert({
          pcu_id: auth.userPcuId,
          period_id: props.periodId,
          requester_id: auth.userProfile.id,
          status: 'draft'
        })
        .select('id')
        .single();
      
      if (headerError) throw headerError;
      currentRequisitionId = newHeader.id;
    }

    const { error: deleteError } = await supabase
      .from('requisition_items_drugcupsabot')
      .delete()
      .eq('requisition_id', currentRequisitionId);
    if (deleteError) throw deleteError;

    const itemsToInsert = Object.entries(requisitionData.value)
      .filter(([itemId, entry]) => {
        const itemDetails = items.value.find(i => i.id == itemId);
        return entry.quantity > 0 && entry.quantity !== null && itemDetails && itemDetails.is_available;
      })
      .map(([itemId, entry]) => {
        const itemDetails = items.value.find(i => i.id == itemId);
        return {
          requisition_id: currentRequisitionId,
          item_id: Number(itemId),
          quantity: entry.quantity,
          on_hand_quantity: entry.onHand,
          price_at_request: itemDetails.price_per_unit
        };
      });

    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('requisition_items_drugcupsabot')
        .insert(itemsToInsert);
      if (insertError) throw insertError;
    }

    const { error: updateStatusError } = await supabase
      .from('requisitions_drugcupsabot')
      .update({
        status: status,
        submitted_at: status === 'submitted' ? new Date().toISOString() : null
      })
      .eq('id', currentRequisitionId);
    if (updateStatusError) throw updateStatusError;

    alert(`ใบเบิกถูก "${status === 'submitted' ? 'ส่ง' : 'บันทึก'}" เรียบร้อยแล้ว`);
    router.push('/pcu/dashboard');

  } catch (err) {
    alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    console.error(err);
  } finally {
    isSubmitting.value = false;
  }
}

function saveDraft() {
  saveRequisition('draft');
}

function submitForm() {
  if (confirm('คุณต้องการยืนยันการส่งใบเบิกนี้ใช่หรือไม่? เมื่อส่งแล้วจะไม่สามารถแก้ไขได้อีก')) {
    saveRequisition('submitted');
  }
}
</script>

<style scoped>
h2 {
  border: none;
  padding-bottom: 0;
  margin-bottom: 0.25rem;
}
h2 i {
  color: var(--primary-color);
  margin-right: 0.75rem;
}
.text-muted {
  margin-top: 0;
  margin-bottom: 2rem;
  color: var(--text-muted);
}
.toolbar {
  margin-bottom: 1.5rem;
}
.toolbar .form-group {
  margin-bottom: 0;
}
.search-input {
  max-width: 400px;
}
.table-wrapper {
  max-height: 60vh;
  overflow-y: auto;
  border: none; 
  padding: 0;
}
table thead {
  position: sticky;
  top: 0;
  z-index: 1;
}

table thead th {
  background-color: var(--surface-color);
}

.quantity-input {
  width: 90px;
  text-align: center;
}
.form-actions {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
td.text-center, th.text-center {
  text-align: center;
}

.locked-item {
  background-color: #f8f9fa; 
  color: #adb5bd; 
}
.locked-item .quantity-input {
  background-color: #e9ecef; 
  cursor: not-allowed; 
}
.item-note {
  font-weight: bold;
  color: var(--danger-color); 
  margin-left: 0.5rem;
  font-size: 0.9em;
}

@media (max-width: 768px) {
  h2 {
    font-size: 1.4rem; 
  }

  .table-wrapper {
    max-height: 65vh; 
  }

  th, td {
    padding: 0.8rem 0.6rem;
    font-size: 0.9rem; 
    white-space: nowrap; 
  }

  th:nth-child(3),
  td:nth-child(3) {
    min-width: 200px; 
    white-space: normal;
  }

  .quantity-input {
    width: 75px; 
    padding: 0.5rem;
  }

  .item-note {
    display: block; 
    margin-left: 0;
    margin-top: 0.25rem;
    white-space: normal;
  }
}
</style>