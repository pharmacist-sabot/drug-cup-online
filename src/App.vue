<template>
  <Navbar v-if="$route.name !== 'Login'" />
  <main>
    <router-view />
  </main>
</template>

<script setup>
import Navbar from './components/Navbar.vue'
</script>
