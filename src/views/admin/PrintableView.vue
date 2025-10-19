<template>
    <div class="print-container portrait" v-if="requisition">
        <div class="page">
            <!-- Header -->
            <div class="header">
                <div class="top-header">
                    <span class="bold">ใบเบิกพัสดุ</span>
                </div>
                <div class="sub-header sub-header-center">
                    <span>(ยาและวัสดุเภสัชกรรม)</span>
                </div>

                <div class="info-header">
                    <div class="info-left">
                        งาน
                        <u
                            >โรงพยาบาลส่งเสริมสุขภาพตำบล
                            {{ requisition.pcus_drugcupsabot.name }}</u
                        >
                    </div>
                    <div class="info-right">
                        วันที่ <u>{{ formatDate(new Date()) }}</u>
                    </div>
                </div>

                <div class="to-header">
                    <p>ถึง หัวหน้าหน่วยงานพัสดุ</p>
                </div>

                <div class="desc-header">
                    <p>
                        ข้าพเจ้าขอเบิกพัสดุ (ยาและวัสดุเภสัชกรรม)
                        ตามรายการข้างล่างนี้เพื่อใช้ในงานราชการ
                        โรงพยาบาลส่งเสริมสุขภาพตำบล
                        <u>{{ requisition.pcus_drugcupsabot.name }}</u>
                        และมอบให้
                        <u>{{
                            personnel?.receiver_name ||
                            "....................................................."
                        }}</u>
                        เป็นผู้รับสิ่งของตามใบเบิกนี้
                    </p>
                </div>
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
                        <tr
                            v-for="(
                                item, index
                            ) in requisition.requisition_items_drugcupsabot"
                            :key="item.id"
                        >
                            <td class="center">{{ index + 1 }}</td>
                            <td>{{ item.items_drugcupsabot.name }}</td>
                            <td class="center">
                                {{ item.approved_quantity ?? item.quantity }}
                            </td>
                            <td class="center">
                                {{ item.items_drugcupsabot.unit_pack }}
                            </td>
                            <td></td>
                        </tr>
                        <tr v-for="n in emptyRows" :key="'empty-' + n">
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
                    <p>
                        ลงชื่อ ..........................................
                        ผู้เบิก
                    </p>
                    <p>
                        ({{
                            personnel?.requester_name ||
                            "....................................................."
                        }})
                    </p>
                    <p>
                        ตำแหน่ง
                        {{
                            personnel?.requester_position ||
                            "................................................."
                        }}
                    </p>
                </div>
                <div class="signature-box">
                    <p>
                        ลงชื่อ ..........................................
                        ผู้รับของ
                    </p>
                    <p>
                        ({{
                            personnel?.receiver_name ||
                            "....................................................."
                        }})
                    </p>
                    <p>
                        ตำแหน่ง
                        {{
                            personnel?.receiver_position ||
                            "................................................."
                        }}
                    </p>
                </div>
                <div class="signature-box">
                    <p>
                        ลงชื่อ ..........................................
                        ผู้อนุมัติ
                    </p>
                    <p>(นายกิตติคุณ เขียวขำ)</p>
                    <p>ตำแหน่ง เภสัชกรปฏิบัติการ</p>
                </div>
                <div class="signature-box">
                    <p>
                        ลงชื่อ ..........................................
                        ผู้จ่าย
                    </p>
                    <p>(นางสาวศศิธร เสนา)</p>
                    <p>ตำแหน่ง เจ้าพนักงานเภสัชกรรมชำนาญงาน</p>
                </div>
            </div>
        </div>
    </div>

    <div v-else class="loading">กำลังเตรียมข้อมูลสำหรับพิมพ์...</div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "@/supabaseClient";

const route = useRoute();
const requisition = ref(null);
const personnel = ref(null);
const loading = ref(true);
const requisitionId = route.query.id;

const emptyRows = computed(() => {
    if (!requisition.value) return 0;
    const itemCount = requisition.value.requisition_items_drugcupsabot.length;
    return Math.max(0, 1 - itemCount);
});

onMounted(async () => {
    if (!requisitionId) {
        document.body.innerHTML = "ไม่พบ ID ของใบเบิก";
        return;
    }

    try {
        const { data: requisitionData, error: requisitionError } =
            await supabase
                .from("requisitions_drugcupsabot")
                .select(
                    `
        id, status, submitted_at,
        pcus_drugcupsabot (id, name),
        requisition_periods_drugcupsabot (name),
        requisition_items_drugcupsabot (
          quantity, approved_quantity,
          items_drugcupsabot (name, unit_pack)
        )
      `,
                )
                .eq("id", requisitionId)
                .single();

        if (requisitionError) throw requisitionError;
        requisition.value = requisitionData;

        if (requisitionData && requisitionData.pcus_drugcupsabot?.id) {
            const pcuId = requisitionData.pcus_drugcupsabot.id;
            const { data: personnelData, error: personnelError } =
                await supabase
                    .from("pcu_personnel_drugcupsabot")
                    .select("*")
                    .eq("pcu_id", pcuId)
                    .single();

            if (personnelError && personnelError.code !== "PGRST116") {
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
    return date.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}
</script>

<style>
@media print {
    @page portrait {
        size: A4 portrait;
    }
    .portrait {
        page: portrait;
    }
}
</style>

<style scoped>
body {
    background-color: #eee;
    margin: 0;
    padding: 0;
    font-family: "Sarabun", sans-serif;
    color: #000;
}

.print-container {
    font-size: 14.5px;
    line-height: 1.4;
    color: #000;
}

.page {
    background: #fff;
    width: 210mm;
    min-height: 297mm;
    padding: 15mm 20mm;
    margin: 10mm auto;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.15);
    box-sizing: border-box;
    position: relative;
}

/* Header */
.header {
    margin-bottom: 10px;
}
.top-header {
    display: flex;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
}
.sub-header-center {
    text-align: center;
    font-size: 16px;
    margin-bottom: 10px;
}
.info-header {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    margin-bottom: 10px;
}
.to-header {
    font-size: 14.5px;
    margin-bottom: 5px;
}
.desc-header {
    margin-bottom: 15px;
}
.desc-header p {
    margin: 0;
    text-indent: 32px;
}

u {
    text-decoration: none;
    border-bottom: 1px dotted #000;
    padding-bottom: 1px;
}

/* Table */
.table-wrapper {
    margin-top: 15px;
}

table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #000;
    font-size: 13px;
}
th,
td {
    border: 1px solid #000;
    padding: 6px 8px;
    vertical-align: top;
}
th {
    background: #f8f8f8;
    font-weight: 600;
    text-align: center;
}
td.center {
    text-align: center;
}

/* Signature Section 2×2 grid */
.signature-section {
    margin-top: 40px;
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* 2 คอลัมน์ */
    grid-template-rows: repeat(2, auto); /* 2 แถว */
    gap: 30px 50px; /* ระยะห่างระหว่างคอลัมน์และแถว (ปรับได้ตามต้องการ) */
    text-align: center;
    page-break-inside: avoid;
}

.signature-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
}

.signature-box p {
    margin: 6px 0;
    font-size: 13.5px;
}

@media print {
    .signature-section {
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(2, auto);
        gap: 25px 40px;
        page-break-before: auto;
    }
}

@media print {
    @page {
        size: A4 portrait;
        margin: 12mm 14mm;
    }
    body,
    html {
        background: #fff !important;
    }
    .page {
        margin: 0;
        box-shadow: none;
        width: auto;
        min-height: auto;
        padding: 0;
    }
    .print-container {
        font-size: 12pt;
        line-height: 1.35;
    }
    thead {
        display: table-header-group;
    }
    tfoot {
        display: table-footer-group;
    }
    tr,
    td,
    th,
    .signature-box {
        page-break-inside: avoid;
    }
    .signature-section {
        page-break-before: auto;
    }
    table {
        page-break-after: auto;
    }
}

@media (max-width: 768px) {
    .page {
        width: 100%;
        margin: 0;
        padding: 10px;
        box-shadow: none;
    }
    .signature-section {
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(2, auto);
        gap: 25px 40px;
        page-break-before: auto;
    }
    .signature-box {
        width: 100%;
    }
}
</style>
