<template>
  <div class="container">
    <h2><i class="fas fa-cog"></i> ตั้งค่าระบบ</h2>

    <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!loading">
      <h3><i class="fas fa-users"></i> ตั้งค่าบุคลากรประจำ รพ.สต.</h3>
      <p class="text-muted">ข้อมูลนี้จะถูกนำไปใช้ในใบเบิกของแต่ละ รพ.สต. โดยอัตโนมัติ</p>
      
      <div class="settings-grid">
        <div v-for="pcu in pcuSettings" :key="pcu.pcu_id" class="card">
          <h4>{{ pcu.pcu_name }}</h4>
          <form @submit.prevent="savePcuPersonnel(pcu)">
            <div class="form-group">
              <label>ชื่อผู้เบิก (เช่น ผอ.รพ.สต.)</label>
              <input type="text" v-model="pcu.requester_name" placeholder="ชื่อ-นามสกุล">
            </div>
            <div class="form-group">
              <label>ตำแหน่งผู้เบิก</label>
              <input type="text" v-model="pcu.requester_position" placeholder="ตำแหน่ง">
            </div>
            <hr>
            <div class="form-group">
              <label>ชื่อผู้รับของ</label>
              <input type="text" v-model="pcu.receiver_name" placeholder="ชื่อ-นามสกุล">
            </div>
            <div class="form-group">
              <label>ตำแหน่งผู้รับของ</label>
              <input type="text" v-model="pcu.receiver_position" placeholder="ตำแหน่ง">
            </div>
            <div class="action-footer">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> บันทึกข้อมูล {{ pcu.pcu_name }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '@/supabaseClient';

const loading = ref(true);
const error = ref(null);
const pcuSettings = ref([]);

onMounted(async () => {
  await fetchSettings();
});

async function fetchSettings() {
  loading.value = true;
  error.value = null;
  try {

    const { data: pcus, error: pcuError } = await supabase
      .from('pcus_drugcupsabot')
      .select('id, name')
      .order('name');
    if (pcuError) throw pcuError;

    const { data: personnel, error: personnelError } = await supabase
      .from('pcu_personnel_drugcupsabot')
      .select('*');
    if (personnelError) throw personnelError;

    const settings = pcus.map(pcu => {
      const existingPersonnel = personnel.find(p => p.pcu_id === pcu.id);
      return {
        pcu_id: pcu.id,
        pcu_name: pcu.name,
        id: existingPersonnel?.id || null,
        requester_name: existingPersonnel?.requester_name || '',
        requester_position: existingPersonnel?.requester_position || '',
        receiver_name: existingPersonnel?.receiver_name || '',
        receiver_position: existingPersonnel?.receiver_position || '',
      };
    });
    pcuSettings.value = settings;

  } catch (err) {
    error.value = "ไม่สามารถโหลดข้อมูลการตั้งค่าได้: " + err.message;
    console.error(err);
  } finally {
    loading.value = false;
  }
}

async function savePcuPersonnel(pcu) {
  try {
    const upsertData = {
      pcu_id: pcu.pcu_id,
      requester_name: pcu.requester_name,
      requester_position: pcu.requester_position,
      receiver_name: pcu.receiver_name,
      receiver_position: pcu.receiver_position,
    };

    const { error: upsertError } = await supabase
      .from('pcu_personnel_drugcupsabot')
      .upsert(upsertData, { onConflict: 'pcu_id' });

    if (upsertError) throw upsertError;

    alert(`บันทึกข้อมูลของ ${pcu.pcu_name} เรียบร้อยแล้ว`);
    await fetchSettings(); 
  } catch (err) {
    alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    console.error(err);
  }
}
</script>

<style scoped>
h2 i, h3 i {
  margin-right: 0.75rem;
  color: var(--primary-color);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.card h4 {
  font-size: 1.25rem;
  margin-top: 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.5rem;
}

.action-footer {
  margin-top: 1.5rem;
  text-align: right;
}

hr {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 1.5rem 0;
}
</style>