<template>
  <div class="container">
    <h2>{{ isEditing ? 'แก้ไขใบเบิก' : 'สร้างใบเบิกใหม่' }} - {{ periodInfo?.name }}</h2>
    
    <div class="toolbar">
      <input type="text" v-model="searchTerm" placeholder="ค้นหารายการยา..." class="search-input">
    </div>
    
    <div v-if="loading" class="loading">กำลังโหลดรายการ...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <form @submit.prevent="submitForm" v-if="!loading && !error">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ประเภท</th>
              <th>รายการเวชภัณฑ์</th>
              <th>หน่วย</th>
              <th>ราคา</th>
              <th>จำนวนเบิก</th>
              <th>มูลค่า</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              <td>{{ item.item_order }}</td>
              <td>{{ item.category }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.unit_pack }}</td>
              <td class="text-right">{{ formatCurrency(item.price_per_unit) }}</td>
              <td>
                <input 
                  type="number" 
                  min="0"
                  class="quantity-input" 
                  v-model.number="requisitionData[item.id]"
                  @input="updateTotal"
                  @focus="$event.target.select()"
                >
              </td>
              <td class="text-right">{{ formatCurrency(calculateValue(item)) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6" class="text-right bold">รวมมูลค่าทั้งหมด</td>
              <td class="text-right bold">{{ formatCurrency(totalValue) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="form-actions">
        <button type="button" @click="saveDraft" class="btn-secondary" :disabled="isSubmitting">
          {{ isSubmitting ? 'กำลังบันทึก...' : 'บันทึกฉบับร่าง' }}
        </button>
        <button type="submit" class="btn-success" :disabled="isSubmitting">
          {{ isSubmitting ? 'กำลังส่ง...' : 'ส่งใบเบิก' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import { useAuthStore } from '@/store/auth'

const props = defineProps({
  periodId: String,
  requisitionId: String // รับ ID ของใบเบิกจาก URL
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
    // 1. Load period info
    const { data: periodData, error: periodError } = await supabase
      .from('requisition_periods_drugcupsabot')
      .select('name')
      .eq('id', props.periodId)
      .single()
    if (periodError) throw periodError
    periodInfo.value = periodData

    // 2. Load all active items
    const { data: itemsData, error: itemsError } = await supabase
      .from('items_drugcupsabot')
      .select('*')
      .eq('is_active', true)
      .order('category_order', { ascending: true }) 
      .order('item_order', { ascending: true }); 
    if (itemsError) throw itemsError
    items.value = itemsData

    // 3. If editing, load existing draft data
    if (isEditing.value) {
      const { data: existingData, error: draftError } = await supabase
        .from('requisition_items_drugcupsabot')
        .select('item_id, quantity')
        .eq('requisition_id', props.requisitionId)
      
      if (draftError) throw draftError

      if (existingData) {
        existingData.forEach(item => {
          requisitionData.value[item.item_id] = item.quantity
        })
        updateTotal()
      }
    }
  } catch (err) {
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
  const quantity = requisitionData.value[item.id] || 0
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

    // --- Logic จัดการ Header ของใบเบิก (สร้างใหม่หรือใช้ของเดิม) ---
    if (!isEditing.value) {
      const { data: newHeader, error: headerError } = await supabase
        .from('requisitions_drugcupsabot')
        .insert({
          pcu_id: auth.userPcuId,
          period_id: props.periodId,
          requester_id: auth.userProfile.id,
          status: 'draft' // เริ่มต้นเป็น draft เสมอ
        })
        .select('id')
        .single();
      
      if (headerError) throw headerError;
      currentRequisitionId = newHeader.id;
    }

    // --- Logic จัดการ Items (ลบของเก่าทิ้งทั้งหมด แล้วใส่ของใหม่) ---
    // 1. ลบรายการเก่าทั้งหมดของใบเบิกนี้ (ง่ายที่สุดสำหรับการ update)
    const { error: deleteError } = await supabase
      .from('requisition_items_drugcupsabot')
      .delete()
      .eq('requisition_id', currentRequisitionId);
    if (deleteError) throw deleteError;

    // 2. เตรียมรายการใหม่ที่จะใส่เข้าไป
    const itemsToInsert = Object.entries(requisitionData.value)
      .filter(([_, quantity]) => quantity > 0 && quantity !== null)
      .map(([itemId, quantity]) => {
        const itemDetails = items.value.find(i => i.id == itemId);
        return {
          requisition_id: currentRequisitionId,
          item_id: Number(itemId),
          quantity: quantity,
          price_at_request: itemDetails.price_per_unit
        };
      });

    // 3. ใส่รายการใหม่เข้าไป (ถ้ามี)
    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('requisition_items_drugcupsabot')
        .insert(itemsToInsert);
      if (insertError) throw insertError;
    }

    // 4. อัปเดตสถานะของใบเบิกหลัก (Header)
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
  if (confirm('คุณต้องการยืนยันการส่งใบเบิกนี้ใช่หรือไม่? เมื่อส่งแล้วจะไม่สามารถแก้ไขได้อีก (ยกเว้น Admin)')) {
    saveRequisition('submitted');
  }
}

</script>

<style scoped>
.toolbar {
  margin-bottom: 1.5rem;
}
.search-input {
  width: 100%;
  max-width: 400px;
}
.table-wrapper {
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  text-align: left;
}
thead {
  background-color: var(--light-color);
  position: sticky;
  top: 0;
  z-index: 1;
}
.quantity-input {
  width: 80px;
  text-align: center;
}
.text-right {
  text-align: right;
}
.bold {
  font-weight: bold;
}
tfoot {
  background-color: #e9ecef;
  position: sticky;
  bottom: 0;
}
.form-actions {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
.btn-secondary {
  background-color: var(--secondary-color);
}
.btn-secondary:hover {
  background-color: #5a6268;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>