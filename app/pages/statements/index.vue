<template>
  <div>
    <div class="flex justify-content-between align-items-center mb-4">
      <h1 class="text-2xl font-bold m-0">利用明細一覧</h1>
      <Button label="新規取り込み" icon="pi pi-plus" @click="router.push('/statements/new')" />
    </div>

    <div v-if="pending" class="text-center">
      <ProgressSpinner />
    </div>
    
    <div v-else-if="error" class="text-red-500">
      <p>読み込みに失敗しました: {{ error.message }}</p>
    </div>

    <div v-else-if="!statements || statements.length === 0" class="text-center p-5 surface-card border-round">
      <p class="text-color-secondary">まだ明細が登録されていません</p>
    </div>

    <div v-else class="grid">
      <div v-for="item in statements" :key="item.id" class="col-12 md:col-6 lg:col-4">
        <Card class="cursor-pointer hover:shadow-4 hover:surface-50 transition-all transition-duration-200" @click="router.push(`/statements/${item.id}`)">
          <template #title>
            <div class="text-xl">{{ item.title }}</div>
          </template>
          <template #subtitle>
            {{ formatDate(item.createdAt) }} 取り込み
          </template>
          <template #content>
            <div class="flex flex-column gap-2">
              <div class="flex justify-content-between">
                <span>合計金額:</span>
                <span class="font-bold">{{ formatCurrency(item.summary.totalAmount) }}</span>
              </div>
              <div class="flex justify-content-between text-red-500">
                <span>未登録額:</span>
                <span class="font-bold">{{ formatCurrency(item.summary.unmatchedAmount) }}</span>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Statement } from '~/types';

const router = useRouter();
const { data: statements, pending, error } = await useFetch<Statement[]>('/api/statements');

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('ja-JP');
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
};
</script>
