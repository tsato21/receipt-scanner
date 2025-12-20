<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Receipt, Category } from '~/types';

const receipts = ref<Receipt[]>([]);
const categories = ref<Category[]>([]);
const selectedReceipt = ref<Receipt | null>(null);
const showDetailDialog = ref(false);

const chartDataBar = ref();
const chartOptionsBar = ref();
const chartDataPie = ref();
const chartOptionsPie = ref();

const period = ref('1m');
const trendType = ref('daily'); // 'daily' or 'monthly'
const startDate = ref<Date | null>(null);
const endDate = ref<Date | null>(null);
const totalSpending = ref(0);

const periodOptions = [
    { label: '1ヶ月', value: '1m' },
    { label: '3ヶ月', value: '3m' },
    { label: '1年', value: '1y' },
    { label: '全期間', value: 'all' },
    { label: 'カスタム', value: 'custom' }
];

const trendOptions = [
    { label: '日別', value: 'daily' },
    { label: '月別', value: 'monthly' }
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
};

const formatDate = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleDateString('ja-JP');
};

const fetchData = async () => {
    try {
        let url = `/api/receipts?period=${period.value}`;
        if (period.value === 'custom' && startDate.value && endDate.value) {
            url = `/api/receipts?startDate=${startDate.value.toISOString()}&endDate=${endDate.value.toISOString()}`;
        }
        
        const [receiptsData, masterData] = await Promise.all([
            $fetch<Receipt[]>(url),
            $fetch<{ categories: Category[] }>('/api/master')
        ]);
        
        receipts.value = receiptsData;
        categories.value = masterData.categories;
        
        // Calculate Total
        totalSpending.value = receiptsData.reduce((acc, r) => acc + r.total, 0);
        
        processCharts(receiptsData, masterData.categories);
    } catch (e) {
        console.error("Failed to load dashboard data", e);
    }
};

onMounted(fetchData);

watch([period, startDate, endDate, trendType], () => {
    if (period.value !== 'custom' || (startDate.value && endDate.value)) {
        fetchData();
    }
});

const viewDetails = (receipt: Receipt) => {
    selectedReceipt.value = receipt;
    showDetailDialog.value = true;
};

const registerReminder = (itemName: string) => {
    navigateTo({
        path: '/notifications',
        query: {
            itemName: itemName
        }
    });
};

const getCategoryName = (id: string) => {
    const cat = categories.value.find(c => c.id === id);
    return cat ? cat.name : '未分類';
};

const processCharts = (data: Receipt[], cats: Category[]) => {
    // Pie Chart: Category
    const catMap: Record<string, number> = {};
    data.forEach(r => {
        const catId = r.categoryId || 'unknown';
        if (!catMap[catId]) catMap[catId] = 0;
        catMap[catId] += r.total;
    });
    
    const pieLabels: string[] = [];
    const pieValues: number[] = [];
    const pieColors: string[] = [];
    
    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };
    
    Object.keys(catMap).forEach(id => {
        const cat = cats.find(c => c.id === id);
        pieLabels.push(cat ? cat.name : '未分類');
        pieValues.push(catMap[id]);
        pieColors.push(getRandomColor());
    });
    
    chartDataPie.value = {
        labels: pieLabels,
        datasets: [{
            data: pieValues,
            backgroundColor: pieColors
        }]
    };
    
    chartOptionsPie.value = {
        plugins: {
            legend: {
                labels: {
                    usePointStyle: true
                }
            }
        }
    };
    
    // Bar Chart: Trend (Daily or Monthly)
    const trendMap: Record<string, number> = {};
    data.forEach(r => {
        const dateObj = new Date(r.date);
        let key = '';
        if (trendType.value === 'daily') {
            key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        } else {
            key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (!trendMap[key]) trendMap[key] = 0;
        trendMap[key] += r.total;
    });
    
    const trendLabels = Object.keys(trendMap).sort();
    
    chartDataBar.value = {
        labels: trendLabels,
        datasets: [{
            label: trendType.value === 'daily' ? '日別支出' : '月別支出',
            data: trendLabels.map(k => trendMap[k]),
            backgroundColor: '#3B82F6'
        }]
    };
    
    chartOptionsBar.value = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value: any) => formatCurrency(value)
                }
            }
        }
    };
};
</script>

<template>
  <div class="surface-ground min-h-screen p-4">
    <div class="max-w-6xl mx-auto flex flex-column gap-6">
        <div class="flex flex-column md:flex-row md:align-items-center justify-content-between gap-4">
            <h1 class="m-0 text-3xl font-bold text-900">ダッシュボード</h1>
            <div class="flex flex-wrap gap-3 align-items-center">
                <SelectButton v-model="period" :options="periodOptions" optionLabel="label" optionValue="value" :allowEmpty="false" />
                <div v-if="period === 'custom'" class="flex align-items-center gap-2">
                    <DatePicker v-model="startDate" placeholder="開始日" showIcon dateFormat="yy-mm-dd" :maxDate="endDate || undefined" />
                    <span>〜</span>
                    <DatePicker v-model="endDate" placeholder="終了日" showIcon dateFormat="yy-mm-dd" :minDate="startDate || undefined" />
                </div>
            </div>
        </div>

                <div class="grid">

                    <div class="col-12">

                        <div class="card p-4 bg-primary text-primary-contrast border-round shadow-2 flex justify-content-between align-items-center">

                            <div>

                                <div class="text-lg opacity-80 mb-1">選択期間の合計支出</div>

                                <div class="text-4xl font-bold">{{ formatCurrency(totalSpending) }}</div>

                            </div>

                            <i class="pi pi-wallet text-5xl opacity-50"></i>

                        </div>

                    </div>

                    

                    <div class="col-12 md:col-8">

                        <div class="card p-4 bg-white border-round shadow-1 h-full">

                            <div class="flex justify-content-between align-items-center mb-4">

                                <h3 class="m-0 text-900">支出推移</h3>

                                <SelectButton v-model="trendType" :options="trendOptions" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" />

                            </div>

                            <div class="h-20rem">

                                <Chart type="bar" :data="chartDataBar" :options="chartOptionsBar" class="h-full" />

                            </div>

                        </div>

                    </div>

                    <div class="col-12 md:col-4">

                        <div class="card p-4 bg-white border-round shadow-1 h-full">

                            <h3 class="mt-0 mb-4">カテゴリ内訳</h3>

                            <div class="flex justify-content-center">

                                <Chart type="pie" :data="chartDataPie" :options="chartOptionsPie" class="w-full max-w-15rem" />

                            </div>

                        </div>

                    </div>

                </div>

                

                <div class="card p-4 bg-white border-round shadow-1">

        
            <h3 class="mt-0 mb-4">履歴一覧 (クリックで詳細)</h3>
            <DataTable 
                :value="receipts" 
                paginator 
                :rows="10" 
                stripedRows 
                tableStyle="min-width: 50rem"
                @row-click="(e) => viewDetails(e.data)"
                class="cursor-pointer"
            >
                <Column field="date" header="日付" sortable>
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.date) }}
                    </template>
                </Column>
                <Column field="storeName" header="店舗名" sortable></Column>
                <Column field="categoryId" header="カテゴリ" sortable>
                    <template #body="slotProps">
                        {{ getCategoryName(slotProps.data.categoryId) }}
                    </template>
                </Column>
                <Column field="total" header="合計金額" sortable>
                    <template #body="slotProps">
                        {{ formatCurrency(slotProps.data.total) }}
                    </template>
                </Column>
                <Column header="明細数">
                     <template #body="slotProps">
                        {{ slotProps.data.items?.length || 0 }} 点
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>

    <Dialog v-model:visible="showDetailDialog" header="レシート詳細" modal :style="{ width: '90vw', maxWidth: '500px' }">
        <div v-if="selectedReceipt" class="flex flex-column gap-4">
            <div class="grid">
                <div class="col-6">
                    <div class="text-500 font-bold mb-1 text-sm">日付</div>
                    <div class="text-900">{{ formatDate(selectedReceipt.date) }}</div>
                </div>
                <div class="col-6">
                    <div class="text-500 font-bold mb-1 text-sm">カテゴリ</div>
                    <div class="text-900">{{ getCategoryName(selectedReceipt.categoryId) }}</div>
                </div>
                <div class="col-12">
                    <div class="text-500 font-bold mb-1 text-sm">店舗名</div>
                    <div class="text-900 text-lg">{{ selectedReceipt.storeName }}</div>
                </div>
            </div>

            <Divider class="my-0" />

            <div>
                <div class="font-bold mb-3 flex justify-content-between align-items-center">
                    <span>明細</span>
                    <span class="text-primary text-xl">{{ formatCurrency(selectedReceipt.total) }}</span>
                </div>
                <ul class="list-none p-0 m-0 flex flex-column gap-3">
                    <li v-for="(item, index) in selectedReceipt.items" :key="index" class="flex justify-content-between align-items-center border-bottom-1 surface-border pb-2">
                        <div class="flex align-items-center gap-2">
                            <Button icon="pi pi-bell" size="small" text rounded v-tooltip.top="'通知登録'" @click="registerReminder(item.name)" />
                            <span class="text-900">{{ item.name }}</span>
                        </div>
                        <span class="text-700">{{ formatCurrency(item.price) }}</span>
                    </li>
                </ul>
            </div>
        </div>
    </Dialog>
  </div>
</template>
