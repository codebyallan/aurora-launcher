<script setup lang="ts">
defineProps<{
    title: string
    time: string
}>()

defineEmits<{
    (e: 'add-game'): void
}>()
</script>

<template>
    <div class="w-full flex justify-between items-center px-8 md:px-16 xl:px-24 mb-6">
        <div class="flex items-center gap-6">
            <h1 class="text-xl font-medium tracking-wide text-white">
                {{ title }}
            </h1>
        </div>
        <div class="flex items-center gap-6">
            <button
                class="w-10 h-10 rounded-full bg-white/10 hover:bg-white hover:text-black flex items-center justify-center text-white border border-white/20 transition-all shadow-lg cursor-pointer"
                @click="$emit('add-game')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                    stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            </button>
            <p class="text-lg font-medium text-white tracking-wide drop-shadow-md">
                {{ time }}
            </p>
        </div>
    </div>
</template>