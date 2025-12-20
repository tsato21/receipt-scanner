<script setup lang="ts">
import { ref } from 'vue';

const items = ref([
    {
        label: 'レシート登録',
        icon: 'pi pi-camera',
        route: '/'
    },
    {
        label: 'ダッシュボード',
        icon: 'pi pi-chart-bar',
        route: '/dashboard'
    },
    {
        label: '通知設定',
        icon: 'pi pi-bell',
        route: '/notifications'
    }
]);
</script>

<template>
  <div class="min-h-screen surface-ground">
    <Menubar :model="items" class="border-none border-noround shadow-1 sticky top-0 z-5">
        <template #start>
            <div class="flex align-items-center">
                <img src="/favicon.png" alt="Logo" height="40" class="mr-2" />
                <span class="font-bold text-xl hidden sm:inline-block">Receipt Scanner</span>
            </div>
        </template>
        <template #item="{ item, props }">
            <NuxtLink v-if="item.route" v-slot="{ href, navigate, isActive }" :to="item.route" custom>
                <a :href="href" v-bind="props.action" @click="navigate" :class="[{ 'font-bold text-primary': isActive }]">
                    <span :class="item.icon" />
                    <span class="ml-2">{{ item.label }}</span>
                </a>
            </NuxtLink>
        </template>
    </Menubar>
    
    <div class="p-4 sm:p-6">
        <NuxtPage />
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: var(--font-family);
}
</style>
