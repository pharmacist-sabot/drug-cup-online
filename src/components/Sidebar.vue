<!-- src/components/Sidebar.vue -->
<template>

  <aside class="sidebar no-print" :class="{ 'is-open': isOpen }">
    <div class="sidebar-header">
      <i class="fas fa-pills logo"></i>
      <div class="header-text">
        <span class="title">ระบบเบิกยาออนไลน์</span>
        <span class="subtitle">โรงพยาบาลสระโบสถ์</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <router-link to="/admin/dashboard">
        <i class="fas fa-tachometer-alt"></i>
        <span>แดชบอร์ด</span>
      </router-link>
      <router-link to="/admin/item-management">
        <i class="fas fa-dolly-flatbed"></i>
        <span>จัดการยา</span>
      </router-link>
      <router-link to="/admin/requisition-summary">
        <i class="fas fa-calculator"></i>
        <span>สรุปผลเบิก</span>
      </router-link>
      <router-link to="/admin/reports">
        <i class="fas fa-print"></i>
        <span>พิมพ์รายงาน</span>
      </router-link>
      <router-link to="/admin/accounting-report">
        <i class="fas fa-file-invoice-dollar"></i>
        <span>รายงานบัญชี</span>
      </router-link>
      <router-link to="/admin/settings">
        <i class="fas fa-cog"></i>
        <span>ตั้งค่าระบบ</span>
      </router-link>
    </nav>
  </aside>
</template>

<script setup>

defineProps({
  isOpen: Boolean
});
</script>

<style scoped>
.sidebar {
  width: 260px;
  background-color: var(--surface-color);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  transition: transform 0.3s ease;
  z-index: 1100; 
}

.sidebar-header {
  display: flex;
  align-items: center; 
  gap: 1rem; 
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header .logo {
  font-size: 2rem; 
  color: var(--primary-color);
}

.header-text {
  display: flex;
  flex-direction: column; 
  line-height: 1.3; 
}

.header-text .title {
  font-size: 1.15rem; 
  font-weight: 600;
  color: var(--text-color);
}

.header-text .subtitle {
  font-size: 0.85rem; 
  font-weight: 500;
  color: var(--text-muted);
}

.sidebar-nav {
  padding: 1rem;
  flex-grow: 1;
}

.sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  border-radius: var(--border-radius);
  color: var(--text-muted);
  font-weight: 500;
  text-decoration: none;
  margin-bottom: 0.5rem;
  transition: background-color 0.2s, color 0.2s;
}

.sidebar-nav a i {
  width: 20px;
  text-align: center;
  font-size: 1.1rem;
}

.sidebar-nav a:hover {
  background-color: var(--bg-color);
  color: var(--text-color);
  text-decoration: none;
}

.sidebar-nav a.router-link-exact-active {
  background-color: var(--primary-color);
  color: white;
  box-shadow: var(--box-shadow);
}

@media (max-width: 992px) {
  .sidebar {
    transform: translateX(-100%); 
    box-shadow: var(--box-shadow-lg);
  }
  .sidebar.is-open {
    transform: translateX(0); 
  }
}
</style>