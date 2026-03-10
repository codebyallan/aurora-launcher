<script setup lang="ts">
import { useHideCursorOnController } from './composables/useHideCursorOnController'

useHideCursorOnController()
</script>

<template>
  <UApp>
    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
