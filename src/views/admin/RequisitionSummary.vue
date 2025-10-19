<template>
    <div class="container">
        <h2><i class="fas fa-calculator"></i> สรุปประมวลผลใบเบิก</h2>

        <div class="card report-options no-print">
            <div class="form-group">
                <label>1. เลือกรอบเบิกเพื่อประมวลผล</label>
                <select v-model="selectedPeriod" @change="processRequisitions">
                    <option :value="null" disabled>
                        -- กรุณาเลือกรอบเบิก --
                    </option>
                    <option
                        v-for="period in periods"
                        :key="period.id"
                        :value="period.id"
                    >
                        {{ period.name }}
                    </option>
                </select>
            </div>
            <div class="form-group">
                <label>2. กรองข้อมูลตาม รพ.สต.</label>
                <select v-model="selectedPcu" :disabled="!processedData.length">
                    <option value="all">ดูทั้งหมด</option>
                    <option
                        v-for="pcu in pcuList"
                        :key="pcu.id"
                        :value="pcu.id"
                    >
                        {{ pcu.name }}
                    </option>
                </select>
            </div>
        </div>

        <div v-if="loading" class="loading">กำลังประมวลผล...</div>
        <div v-if="error" class="error">{{ error }}</div>

        <div v-if="processedData.length > 0" class="card">
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>รายการ</th>
                            <th
                                class="text-center"
                                v-if="selectedPcu === 'all'"
                            >
                                ยอดรวม (ทุก รพ.สต.)
                            </th>
                            <th class="text-center" v-else>
                                ยอดเบิก ({{ getPcuName(selectedPcu) }})
                            </th>
                            <th
                                class="text-center"
                                v-if="selectedPcu === 'all'"
                                v-for="pcu in pcuList"
                                :key="pcu.id"
                            >
                                {{ pcu.name }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in processedData" :key="item.item_id">
                            <td>{{ item.item_name }}</td>
                            <td class="text-center bold">
                                {{ getDisplayQuantity(item) }}
                            </td>
                            <td
                                class="text-center"
                                v-if="selectedPcu === 'all'"
                                v-for="pcu in pcuList"
                                :key="pcu.id"
                            >
                                {{ item.pcu_breakdown[pcu.id] || 0 }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="print-actions no-print">
                <button @click="printSummary" class="btn btn-primary">
                    <i class="fas fa-print"></i> พิมพ์ใบสรุปยอดรวม
                </button>
            </div>
        </div>

        <div
            v-else-if="!loading && selectedPeriod"
            class="card no-data-message text-center"
        >
            <i class="fas fa-info-circle"></i>
            <p>ไม่พบข้อมูลใบเบิกที่อนุมัติแล้วในรอบนี้</p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/supabaseClient";

const router = useRouter();
const loading = ref(false);
const error = ref(null);
const periods = ref([]);
const pcuList = ref([]);
const selectedPeriod = ref(null);
const selectedPcu = ref("all");
const processedData = ref([]);

onMounted(async () => {
    try {
        const { data: periodsData } = await supabase
            .from("requisition_periods_drugcupsabot")
            .select("id, name")
            .order("start_date", { ascending: false });
        periods.value = periodsData || [];
        const { data: pcusData } = await supabase
            .from("pcus_drugcupsabot")
            .select("id, name")
            .order("name");
        pcuList.value = pcusData || [];
    } catch (err) {
        error.value = "ไม่สามารถโหลดข้อมูลเริ่มต้นได้";
        console.error(err);
    }
});

async function processRequisitions() {
    if (!selectedPeriod.value) return;
    loading.value = true;
    error.value = null;
    processedData.value = [];

    try {
        const { data, error: fetchError } = await supabase
            .from("requisition_items_drugcupsabot")
            .select(
                `
        approved_quantity,
        items_drugcupsabot (id, name, category_order, item_order),
        requisitions_drugcupsabot (pcu_id, status, period_id)
      `,
            )
            .in("requisitions_drugcupsabot.status", ["approved", "fulfilled"])
            .eq("requisitions_drugcupsabot.period_id", selectedPeriod.value);

        if (fetchError) throw fetchError;

        const summary = data.reduce((acc, current) => {
            if (
                !current.requisitions_drugcupsabot ||
                !current.items_drugcupsabot
            ) {
                console.warn("Skipping orphaned requisition item:", current);
                return acc;
            }

            const itemId = current.items_drugcupsabot.id;
            const itemName = current.items_drugcupsabot.name;
            const categoryOrder = current.items_drugcupsabot.category_order;
            const itemOrder = current.items_drugcupsabot.item_order;
            const pcuId = current.requisitions_drugcupsabot.pcu_id;
            const qty = current.approved_quantity || 0;

            if (!acc[itemId]) {
                acc[itemId] = {
                    item_id: itemId,
                    item_name: itemName,
                    total_quantity: 0,
                    pcu_breakdown: {},
                    category_order: categoryOrder,
                    item_order: itemOrder,
                };
            }

            acc[itemId].total_quantity += qty;
            acc[itemId].pcu_breakdown[pcuId] =
                (acc[itemId].pcu_breakdown[pcuId] || 0) + qty;

            return acc;
        }, {});

        processedData.value = Object.values(summary).sort((a, b) => {
            const categoryDiff =
                (a.category_order || 9999) - (b.category_order || 9999);
            if (categoryDiff !== 0) return categoryDiff;

            const itemDiff = (a.item_order || 9999) - (b.item_order || 9999);
            if (itemDiff !== 0) return itemDiff;

            return a.item_name.localeCompare(b.item_name, "th");
        });
    } catch (err) {
        console.error("Error processing requisitions:", err);
        error.value = "เกิดข้อผิดพลาดในการประมวลผลข้อมูลใบเบิก";
    } finally {
        loading.value = false;
    }
}

function getPcuName(pcuId) {
    return pcuList.value.find((p) => p.id === pcuId)?.name || "N/A";
}

function getDisplayQuantity(item) {
    if (selectedPcu.value === "all") {
        return item.total_quantity;
    }
    return item.pcu_breakdown[selectedPcu.value] || 0;
}

function printSummary() {
    if (!selectedPeriod.value) {
        alert("กรุณาเลือกรอบเบิกก่อนพิมพ์");
        return;
    }
    const routeData = router.resolve({
        name: "PrintRequisitionSummary",
        query: { periodId: selectedPeriod.value },
    });
    window.open(routeData.href, "_blank");
}
</script>

<style scoped>
h2 i {
    margin-right: 0.75rem;
    color: var(--primary-color);
}
.report-options {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-bottom: 2rem;
}
.form-group {
    flex: 1 1 300px;
}
.text-center {
    text-align: center;
}
.bold {
    font-weight: 600;
}
.print-actions {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
    text-align: right;
}
.no-data-message i {
    font-size: 2.5rem;
    color: var(--info-color);
    margin-bottom: 1rem;
}
.no-data-message p {
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
}
</style>
