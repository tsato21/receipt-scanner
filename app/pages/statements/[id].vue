<template>
  <div v-if="statement">
    <div class="mb-4 flex justify-content-between align-items-center">
      <div>
          <Button icon="pi pi-arrow-left" label="戻る" class="p-button-text pl-0" @click="router.push('/statements')" />
          <h1 class="text-2xl font-bold mt-2">{{ statement.title }}</h1>
          <div class="text-gray-500">
            {{ formatDate(statement.rangeStart) }} ~ {{ formatDate(statement.rangeEnd) }}
          </div>
      </div>
      <Button icon="pi pi-trash" label="削除" class="p-button-danger p-button-outlined" @click="confirmDelete" />
    </div>

    <!-- Summary -->
    <div class="grid mb-5">
      <div class="col-12 md:col-4">
        <div class="surface-card p-4 border-round shadow-1 border-left-3 border-blue-500">
          <div class="text-gray-500 mb-1">明細合計</div>
          <div class="text-2xl font-bold">{{ formatCurrency(statement.summary.totalAmount) }}</div>
        </div>
      </div>
      <div class="col-12 md:col-4">
        <div class="surface-card p-4 border-round shadow-1 border-left-3 border-green-500">
          <div class="text-gray-500 mb-1">登録済 (一致)</div>
          <div class="text-2xl font-bold text-green-600">{{ formatCurrency(statement.summary.matchedAmount) }}</div>
        </div>
      </div>
      <div class="col-12 md:col-4">
        <div class="surface-card p-4 border-round shadow-1 border-left-3 border-red-500">
          <div class="text-gray-500 mb-1">未登録 (不一致)</div>
          <div class="text-2xl font-bold text-red-600">{{ formatCurrency(statement.summary.unmatchedAmount) }}</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <Tabs value="0">
        <TabList>
            <Tab value="0">未登録 (不一致)</Tab>
            <Tab value="1">登録済 (一致)</Tab>
        </TabList>
        <TabPanels>
            <TabPanel value="0">
                 <DataTable :value="unmatchedItems" stripedRows responsiveLayout="scroll">
                    <Column field="date" header="日付">
                    <template #body="{ data }">{{ data.date }}</template>
                    </Column>
                    <Column field="description" header="利用店名/内容"></Column>
                    <Column field="amount" header="金額">
                    <template #body="{ data }">
                        <span class="font-bold">{{ formatCurrency(data.amount) }}</span>
                    </template>
                    </Column>
                </DataTable>
            </TabPanel>
            <TabPanel value="1">
                 <DataTable :value="matchedItems" stripedRows responsiveLayout="scroll">
                    <Column field="date" header="日付">
                        <template #body="{ data }">{{ data.date }}</template>
                    </Column>
                    <Column field="description" header="利用店名/内容"></Column>
                    <Column field="amount" header="金額">
                    <template #body="{ data }">
                        {{ formatCurrency(data.amount) }}
                    </template>
                    </Column>
                </DataTable>
            </TabPanel>
        </TabPanels>
    </Tabs>

  </div>
  <div v-else-if="pending" class="flex justify-content-center p-5">
      <ProgressSpinner />
  </div>
  <div v-else class="text-center p-5">
      <p>データが見つかりません</p>
  </div>
</template>

<script setup lang="ts">
import type { Statement } from '~/types';

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const { data: statement, pending } = await useFetch<Statement>(`/api/statements/${id}`);

const unmatchedItems = computed(() => statement.value?.items.filter(i => i.status === 'unmatched') || []);
const matchedItems = computed(() => statement.value?.items.filter(i => i.status === 'matched') || []);

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('ja-JP');
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
};

const confirmDelete = async () => {
    if (!confirm('本当に削除しますか？')) return;
    
    try {
        await $fetch(`/api/statements/${id}`, { method: 'DELETE' });
        router.push('/statements');
    } catch (e) {
        alert('削除に失敗しました');
    }
};
</script>
