<script setup lang="ts">
defineProps<{
    imageUrl?: string
    itemKey?: string | number
}>()
</script>

<template>
    <div class="absolute inset-0 z-0">
        <Transition enter-active-class="transition-opacity duration-700 ease-in-out" enter-from-class="opacity-0"
            enter-to-class="opacity-100" leave-active-class="transition-opacity duration-700 ease-in-out"
            leave-from-class="opacity-100" leave-to-class="opacity-0">
            <img :key="itemKey" :src="imageUrl" class="absolute inset-0 w-full h-full object-cover" alt="Background">
        </Transition>
        <div class="absolute inset-0 bg-linear-to-r from-black/80 via-black/30 to-transparent" />
        <div class="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
    </div>
</template>