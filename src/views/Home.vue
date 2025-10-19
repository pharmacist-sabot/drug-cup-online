<template>
    <div class="home-wrapper">
        <div class="card home-card">
            <h2>ยินดีต้อนรับสู่<br />ระบบเบิกยาออนไลน์</h2>
            <p class="welcome-text">คุณ {{ auth.profile?.username }}</p>

            <div v-if="!auth.isAdmin" class="action-box">
                <p>คุณเข้าสู่ระบบในฐานะผู้ใช้งาน รพ.สต.</p>
                <button @click="goTo('/pcu/dashboard')" class="btn btn-primary">
                    <i class="fas fa-clinic-medical"></i>
                    ไปยังหน้าแดชบอร์ด รพ.สต.
                </button>
            </div>

            <div v-if="auth.isAdmin" class="action-box">
                <p>คุณเข้าสู่ระบบในฐานะผู้ดูแลระบบ (Admin)</p>
                <button
                    @click="goTo('/admin/dashboard')"
                    class="btn btn-primary"
                >
                    <i class="fas fa-user-shield"></i>
                    ไปยังหน้าแดชบอร์ดผู้ดูแลระบบ
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useAuthStore } from "@/store/auth";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();

function goTo(path) {
    router.push(path);
}
</script>

<style scoped>
.home-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 150px);
}

.home-card {
    max-width: 500px;
    width: 100%;
    text-align: center;
    padding: 2.5rem;
    border: none;
    box-shadow: var(--box-shadow-lg);
}

.home-card h2 {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--primary-color);
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0.5rem;
}

.welcome-text {
    font-size: 1.2rem;
    color: var(--text-muted);
    margin-bottom: 2rem;
}

.action-box {
    border-top: 1px solid var(--border-color);
    padding-top: 1.5rem;
    margin-top: 1.5rem;
}

.action-box p {
    color: var(--text-muted);
    margin-bottom: 1rem;
}

.action-box .btn {
    width: 100%;
    padding: 0.75rem;
    font-size: 1.1rem;
}

button {
    width: 100%;
    margin-top: 1rem;
    padding: 0.75rem;
    font-size: 1.1rem;
    justify-content: center;
}

button span {
    display: inline;
}
</style>
