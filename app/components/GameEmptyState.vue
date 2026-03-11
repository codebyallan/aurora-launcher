<template>
  <div class="flex-1 flex flex-col items-center justify-center gap-4 text-white/30 select-none">
    <div class="animate-float">
      <UIcon
        name="i-lucide-gamepad-2"
        class="size-16 transition-transform duration-300 hover:scale-110 hover:text-white/50 cursor-default"
      />
    </div>
    <p class="text-xl font-medium transition-all duration-500 delay-150 ease-out starting:opacity-0 starting:translate-y-4">
      No games yet
    </p>
    <p class="text-sm transition-all duration-500 delay-300 ease-out starting:opacity-0 starting:translate-y-4">
      Click the
      <strong class="inline-block animate-pulse-glow font-black mx-1">
        +
      </strong>
      button to add your first game
    </p>
  </div>
</template>
