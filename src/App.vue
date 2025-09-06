<template>
  <Navbar />
  <main>
    <router-view />
  </main>
</template>

<script setup>
import Navbar from './components/Navbar.vue'
</script>

<style scoped>
/* No specific styles needed here, all global styles are in main.css */
</style>