<template>
    <div class="container">
        <h2><i class="fas fa-dolly-flatbed"></i> จัดการรายการยาและเวชภัณฑ์</h2>

        <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
        <div v-if="error" class="error">{{ error }}</div>

        <div v-if="!loading" class="card">
            <div class="toolbar">
                <input
                    type="text"
                    v-model="searchTerm"
                    placeholder="ค้นหารายการ..."
                    class="search-input"
                />
                <button @click="openAddItemModal" class="btn btn-success">
                    <i class="fas fa-plus"></i>
                    <span>เพิ่มรายการใหม่</span>
                </button>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th class="col-name">ชื่อรายการ</th>
                            <th class="col-price text-right">ราคา</th>
                            <th class="col-unit">หน่วยนับ</th>
                            <th class="col-notes">หมายเหตุ</th>
                            <th class="col-status text-center">สถานะเบิกได้</th>
                            <th class="col-actions text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in filteredItems" :key="item.id">
                            <td>
                                <input
                                    type="text"
                                    v-model="item.name"
                                    class="form-control-table"
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    step="0.01"
                                    v-model.number="item.price_per_unit"
                                    class="form-control-table text-right"
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    v-model="item.unit_pack"
                                    class="form-control-table"
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    v-model="item.notes"
                                    class="form-control-table"
                                />
                            </td>
                            <td class="text-center">
                                <label class="switch">
                                    <input
                                        type="checkbox"
                                        v-model="item.is_available"
                                    />
                                    <span class="slider round"></span>
                                </label>
                            </td>
                            <td class="text-center">
                                <button
                                    @click="updateItem(item)"
                                    class="btn btn-primary btn-sm"
                                >
                                    <i class="fas fa-save"></i>
                                    <span>บันทึก</span>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div
            v-if="showAddItemModal"
            class="modal-overlay"
            @click.self="showAddItemModal = false"
        >
            <div class="modal-content card">
                <h3>
                    <i class="fas fa-plus-circle"></i>
                    เพิ่มรายการยา/เวชภัณฑ์ใหม่
                </h3>
                <form @submit.prevent="handleAddItem">
                    <div class="form-group">
                        <label for="name"
                            >ชื่อรายการ <span class="required">*</span></label
                        >
                        <input
                            type="text"
                            id="name"
                            v-model="newItem.name"
                            required
                        />
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="price"
                                >ราคาต่อหน่วย
                                <span class="required">*</span></label
                            >
                            <input
                                type="number"
                                id="price"
                                step="0.01"
                                min="0"
                                v-model.number="newItem.price_per_unit"
                                required
                            />
                        </div>
                        <div class="form-group">
                            <label for="unit_pack">หน่วยนับ</label>
                            <input
                                type="text"
                                id="unit_pack"
                                v-model="newItem.unit_pack"
                            />
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="category"
                            >หมวดหมู่ <span class="required">*</span></label
                        >
                        <select
                            id="category"
                            v-model="newItem.category"
                            required
                        >
                            <option disabled value="">
                                -- เลือกหมวดหมู่ --
                            </option>
                            <option
                                v-for="cat in uniqueCategories"
                                :key="cat"
                                :value="cat"
                            >
                                {{ cat }}
                            </option>
                            <option value="--new--">
                                -- เพิ่มหมวดหมู่ใหม่ --
                            </option>
                        </select>
                    </div>
                    <div
                        v-if="newItem.category === '--new--'"
                        class="form-group"
                    >
                        <label for="new_category_name"
                            >ชื่อหมวดหมู่ใหม่
                            <span class="required">*</span></label
                        >
                        <input
                            type="text"
                            id="new_category_name"
                            v-model="newCategoryName"
                            required
                        />
                    </div>
                    <div class="modal-actions">
                        <button
                            type="button"
                            class="btn btn-secondary"
                            @click="showAddItemModal = false"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            class="btn btn-success"
                            :disabled="isSubmitting"
                        >
                            <i class="fas fa-plus"></i>
                            <span>{{
                                isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มรายการ"
                            }}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "@/supabaseClient";

const loading = ref(true);
const isSubmitting = ref(false);
const error = ref(null);
const items = ref([]);
const searchTerm = ref("");
const showAddItemModal = ref(false);
const newCategoryName = ref("");

const newItem = ref({
    name: "",
    price_per_unit: 0,
    unit_pack: "",
    category: "",
    is_active: true,
    is_available: true,
    notes: null,
});

const uniqueCategories = computed(() => {
    if (!items.value) return [];
    const categories = items.value.map((item) => item.category);
    return [...new Set(categories)].sort();
});

onMounted(async () => {
    await fetchItems();
});

async function fetchItems() {
    try {
        loading.value = true;
        const { data, error: fetchError } = await supabase
            .from("items_drugcupsabot")
            .select("*")
            .order("category_order", { ascending: true, nullsFirst: false })
            .order("item_order", { ascending: true, nullsFirst: false })
            .order("name", { ascending: true });

        if (fetchError) throw fetchError;
        items.value = data;
    } catch (err) {
        error.value = "ไม่สามารถโหลดข้อมูลรายการยาได้: " + err.message;
        console.error(err);
    } finally {
        loading.value = false;
    }
}

const filteredItems = computed(() => {
    if (!searchTerm.value) return items.value;
    return items.value.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.value.toLowerCase()),
    );
});

async function updateItem(item) {
    try {
        const {
            id,
            created_at,
            category,
            category_order,
            item_order,
            ...updateData
        } = item;

        const { error: updateError } = await supabase
            .from("items_drugcupsabot")
            .update(updateData)
            .eq("id", id);

        if (updateError) throw updateError;
        alert(`อัปเดตรายการ "${item.name}" เรียบร้อยแล้ว`);
    } catch (err) {
        alert("เกิดข้อผิดพลาดในการอัปเดต: " + err.message);
        console.error(err);
    }
}

function openAddItemModal() {
    newItem.value = {
        name: "",
        price_per_unit: 0,
        unit_pack: "",
        category: "",
        is_active: true,
        is_available: true,
        notes: null,
    };
    newCategoryName.value = "";
    showAddItemModal.value = true;
}

async function handleAddItem() {
    isSubmitting.value = true;
    try {
        let finalCategory = newItem.value.category;
        if (finalCategory === "--new--") {
            if (!newCategoryName.value.trim()) {
                alert("กรุณากรอกชื่อหมวดหมู่ใหม่");
                return;
            }
            finalCategory = newCategoryName.value.trim();
        }

        const dataToInsert = { ...newItem.value, category: finalCategory };
        if (dataToInsert.notes === "") dataToInsert.notes = null;

        const existingCategory = items.value.find(
            (item) => item.category === finalCategory,
        );

        if (existingCategory) {
            dataToInsert.category_order = existingCategory.category_order;
            const maxItemOrder = items.value
                .filter((item) => item.category === finalCategory)
                .reduce((max, item) => Math.max(max, item.item_order || 0), 0);
            dataToInsert.item_order = maxItemOrder + 1;
        } else {
            const maxCategoryOrder = items.value.reduce(
                (max, item) => Math.max(max, item.category_order || 0),
                0,
            );
            dataToInsert.category_order = maxCategoryOrder + 1;
            dataToInsert.item_order = 1;
        }

        const { data, error: insertError } = await supabase
            .from("items_drugcupsabot")
            .insert(dataToInsert)
            .select();

        if (insertError) throw insertError;

        alert(`เพิ่มรายการ "${data[0].name}" สำเร็จ`);
        showAddItemModal.value = false;
        await fetchItems();
    } catch (err) {
        alert("เกิดข้อผิดพลาดในการเพิ่มรายการ: " + err.message);
        console.error(err);
    } finally {
        isSubmitting.value = false;
    }
}
</script>

<style scoped>
table {
    table-layout: fixed;
    width: 100%;
}

.col-name {
    width: auto;
}
.col-price {
    width: 120px;
}
.col-unit {
    width: 120px;
}
.col-notes {
    width: 25%;
}
.col-status {
    width: 130px;
}
.col-actions {
    width: 120px;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 1rem;
}
.search-input {
    max-width: 400px;
}
.form-control-table {
    width: 100%;
    padding: 0.4rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background-color: transparent;
}
.form-control-table:focus {
    outline: 1px solid var(--primary-color);
    background-color: white;
}
.btn-sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
}

/* Toggle Switch Styles */
.switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
}
.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}
.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
}
.slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
}
input:checked + .slider {
    background-color: var(--success-color);
}
input:checked + .slider:before {
    transform: translateX(26px);
}
.slider.round {
    border-radius: 34px;
}
.slider.round:before {
    border-radius: 50%;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}
.modal-content {
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 2rem;
}
.modal-content h3 {
    margin-top: 0;
    text-align: center;
}
.modal-content h3 i {
    color: var(--success-color);
}
.modal-actions {
    margin-top: 2rem;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
}
.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}
.required {
    color: var(--danger-color);
}

@media (max-width: 992px) {
    table {
        table-layout: auto;
        min-width: 800px;
    }

    th,
    td {
        white-space: nowrap;
    }

    th.col-name,
    td:first-child,
    th.col-notes,
    td:nth-child(4) {
        white-space: normal;
    }
}

@media (max-width: 768px) {
    .toolbar {
        flex-direction: column;
        align-items: stretch;
    }
    .search-input {
        max-width: 100%;
    }
    .toolbar .btn {
        justify-content: center;
    }

    .toolbar .btn span,
    .btn-sm span,
    .modal-actions .btn span {
        display: inline;
    }

    .modal-content {
        padding: 1.5rem 1rem;
    }
    .form-grid {
        grid-template-columns: 1fr;
    }
}
</style>
