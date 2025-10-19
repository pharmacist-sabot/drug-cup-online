<template>
    <div v-if="!auth.isLoggedIn || isPublicPage">
        <router-view />
    </div>
    <AdminLayout v-else-if="auth.isAdmin" />
    <PcuLayout v-else />
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/store/auth";
import AdminLayout from "@/layouts/AdminLayout.vue";
import PcuLayout from "@/layouts/PcuLayout.vue";

const auth = useAuthStore();
const route = useRoute();

const isPublicPage = computed(() => {
    const publicPages = [
        "Login",
        "Home",
        "PrintRequisition",
        "PrintRequisitionSummary",
    ];
    return publicPages.includes(route.name);
});
</script>
