<!-- src/components/Navbar.vue -->
<template>
    <nav class="navbar no-print">
        <div class="navbar-container">
            <router-link to="/" class="navbar-brand">
                <i class="fas fa-pills"></i>

                <span class="brand-text">ระบบเบิกยาออนไลน์</span>
                <span class="brand-subtext"> โรงพยาบาลสระโบสถ์</span>
            </router-link>

            <button
                class="hamburger-menu"
                @click="toggleMenu"
                aria-label="Toggle navigation"
            >
                <i class="fas fa-bars"></i>
            </button>

            <div
                class="nav-links"
                v-if="auth.isLoggedIn"
                :class="{ 'is-open': isMenuOpen }"
            >
                <router-link to="/pcu/dashboard" @click="closeMenu">
                    <i class="fas fa-tachometer-alt"></i> หน้าหลัก รพ.สต.
                </router-link>

                <div class="user-info">
                    <i class="fas fa-user-circle"></i>
                    <div class="user-details">
                        <span class="username">{{
                            auth.profile?.username
                        }}</span>
                        <span class="role">{{ auth.userPcuName }}</span>
                    </div>
                    <button
                        @click="handleLogout"
                        class="btn-logout"
                        title="ออกจากระบบ"
                    >
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    </nav>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();
const isMenuOpen = ref(false);

function toggleMenu() {
    isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
    isMenuOpen.value = false;
}

async function handleLogout() {
    await auth.logout();
    closeMenu();
    router.push("/login");
}
</script>

<style scoped>
.navbar {
    background-color: var(--surface-color);
    box-shadow: var(--box-shadow);
    padding: 0.75rem 1.5rem;
    position: sticky;
    top: 0;
    z-index: 1000;
}

.navbar-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
}

.navbar-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--primary-color);
    text-decoration: none;
    z-index: 10;
}

.navbar-brand:hover {
    text-decoration: none;
    opacity: 0.8;
}

.nav-links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    transition:
        transform 0.3s ease-out,
        opacity 0.3s ease-out;
}

.nav-links a {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-muted);
    text-decoration: none;
    padding: 0.5rem 0.75rem;
    border-radius: var(--border-radius);
    transition:
        background-color 0.2s,
        color 0.2s;
    font-weight: 500;
}

.nav-links a:hover,
.nav-links a.router-link-exact-active {
    background-color: var(--bg-color);
    color: var(--primary-color);
    text-decoration: none;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-left: 1.5rem;
    border-left: 1px solid var(--border-color);
    color: var(--text-color);
}

.user-info .fa-user-circle {
    font-size: 2rem;
    color: var(--secondary-color);
}

.user-details {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
}

.user-details .username {
    font-weight: 600;
}
.user-details .role {
    font-size: 0.8rem;
    color: var(--text-muted);
}

.btn-logout {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.5rem;
    padding: 0.5rem;
    border-radius: 50%;
    line-height: 1;
    transition:
        color 0.2s,
        background-color 0.2s;
    color: var(--text-muted);
}
.btn-logout:hover {
    color: var(--danger-color);
    background-color: rgba(211, 47, 47, 0.1);
}

/* Hamburger Menu */
.hamburger-menu {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.5rem;
    color: var(--primary-color);
    padding: 0.5rem;
    z-index: 10;
}

/* Responsive Styles */
@media (max-width: 820px) {
    .brand-subtext {
        display: none;
    }

    .hamburger-menu {
        display: block;
    }

    .nav-links {
        position: absolute;
        top: calc(100% + 10px);
        left: 0;
        right: 0;
        background-color: var(--surface-color);
        box-shadow: var(--box-shadow-lg);
        border-radius: var(--border-radius);
        padding: 1rem;
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
        opacity: 0;
        transform: translateY(-10px);
        pointer-events: none;
    }

    .nav-links.is-open {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
    }

    .nav-links a {
        justify-content: center;
        padding: 0.8rem;
    }

    .user-info {
        flex-direction: column;
        border-left: none;
        padding-left: 0;
        padding-top: 1rem;
        margin-top: 0.5rem;
        border-top: 1px solid var(--border-color);
        width: 100%;
        gap: 1rem;
    }

    .user-details {
        text-align: center;
    }
}
</style>
