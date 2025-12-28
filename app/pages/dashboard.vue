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
const is20thClosing = ref(false);
const totalSpending = ref(0);
const periodOffset = ref(0); // 0 = Current, -1 = Prev, 1 = Next

const periodOptions = [
    { label: '1ヶ月', value: '1m' },
    { label: '3ヶ月', value: '3m' },
    { label: '1年', value: '1y' },
    { label: '全期間', value: 'all' },
    { label: 'カスタム', value: 'custom' }
];

const periodLabel = computed(() => {
    if (!startDate.value || !endDate.value) return '';
    return `${formatDate(startDate.value)} 〜 ${formatDate(endDate.value)}`;
});

const calculateRange = () => {
    // Only calculate for navigation-supported periods
    if (!['1m', '3m', '1y'].includes(period.value)) return null;

    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (is20thClosing.value) {
        // Accounting Period Logic (20th Closing)
        // Determine "Current Accounting Month" start
        // If today > 20, AccMonth starts 21st of This Month.
        // If today <= 20, AccMonth started 21st of Last Month.
        let baseYear = now.getFullYear();
        let baseMonth = now.getMonth(); // 0-11
        
        if (now.getDate() <= 20) {
            baseMonth -= 1;
        }
        
        // Apply Offset
        // 1m: Offset by 1 month
        // 3m: Offset by 3 months
        // 1y: Offset by 1 year
        let monthsToAdd = 0;
        if (period.value === '1m') monthsToAdd = 1;
        if (period.value === '3m') monthsToAdd = 3;
        if (period.value === '1y') monthsToAdd = 12;
        
        const targetMonthIndex = baseMonth + (periodOffset.value * monthsToAdd);
        
        // Start Date: 21st of target base month
        start = new Date(baseYear, targetMonthIndex, 21);
        
        // End Date: 
        // 1m: 20th of (start + 1 month)
        // 3m: 20th of (start + 3 months)
        // 1y: 20th of (start + 12 months)
        end = new Date(start.getFullYear(), start.getMonth() + monthsToAdd, 20);
        
    } else {
        // Standard Calendar Logic
        // 1m: Calendar Month (1st - Last)
        // 3m: 3 Calendar Months
        // 1y: Calendar Year (Jan 1 - Dec 31)? Or 12 Months?
        // Let's use "Months" logic relative to current month.
        
        let monthsToAdd = 0;
        if (period.value === '1m') monthsToAdd = 1;
        if (period.value === '3m') monthsToAdd = 3;
        if (period.value === '1y') monthsToAdd = 12;

        // Base: Start of current month
        const baseStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Shift by offset
        start = new Date(baseStart.getFullYear(), baseStart.getMonth() + (periodOffset.value * monthsToAdd), 1);
        
        // End: Start + Duration - 1 day (End of the range)
        end = new Date(start.getFullYear(), start.getMonth() + monthsToAdd, 0);
        
        // Special case: If Offset 0 (Current) and we want to cap at Today? 
        // Usually dashboard shows "up to now" for current period, but "full range" for navigation context is okay too.
        // The backend `custom` range query handles explicit dates strictly.
        // Let's strictly use the calculated range so "Next" doesn't show future data (it will be empty).
        // But for UX, showing "Dec 1 - Dec 31" when today is Dec 28 is fine.
        end.setHours(23, 59, 59, 999);
    }
    
    return { start, end };
};

const changeOffset = (delta: number) => {
    periodOffset.value += delta;
    fetchData(); // fetchData will call calculateRange
};

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
        
        // Determine Dates
        if (period.value === 'custom') {
            // Use manual pickers
            if (startDate.value && endDate.value) {
                url = `/api/receipts?startDate=${startDate.value.toISOString()}&endDate=${endDate.value.toISOString()}`;
            }
        } else if (['1m', '3m', '1y'].includes(period.value)) {
            // Calculate explicit range with offset
            const range = calculateRange();
            if (range) {
                startDate.value = range.start;
                endDate.value = range.end;
                url = `/api/receipts?startDate=${range.start.toISOString()}&endDate=${range.end.toISOString()}`;
            }
        }
        
        // Note: is20thClosing is handled inside calculateRange now, so we don't need &closingDay query param
        // because we are sending explicit start/end dates.
        
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

watch([period, trendType], () => {
    if (period.value === 'custom') return; // Handled by date pickers
    periodOffset.value = 0; // Reset offset on mode change
    fetchData();
});

// Watch pickers for custom mode
watch([startDate, endDate], () => {
    if (period.value === 'custom') fetchData();
});

watch(is20thClosing, () => {
    fetchData();
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

const deleteReceipt = async () => {
    if (!selectedReceipt.value) return;
    if (!confirm('本当にこのレシートを削除しますか？\n（復元はできません）')) return;

    try {
        await $fetch(`/api/receipts/${selectedReceipt.value.id}`, { method: 'DELETE' });
        showDetailDialog.value = false;
        selectedReceipt.value = null;
        await fetchData(); // Refresh list and charts
    } catch (e) {
        console.error('Failed to delete receipt', e);
        alert('削除に失敗しました');
    }
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
                
                <div v-if="['1m', '3m', '1y'].includes(period)" class="flex align-items-center gap-2">
                    <Button icon="pi pi-chevron-left" text rounded @click="changeOffset(-1)" />
                    <span class="font-bold white-space-nowrap">{{ periodLabel }}</span>
                    <Button icon="pi pi-chevron-right" text rounded @click="changeOffset(1)" :disabled="periodOffset === 0" />
                </div>
                
                <div v-if="['1m', '3m', '1y'].includes(period)" class="flex align-items-center">
                    <Checkbox v-model="is20thClosing" :binary="true" inputId="closing20" @change="fetchData" />
                    <label for="closing20" class="ml-2 text-sm cursor-pointer select-none">クレカ用20日締め</label>
                </div>

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
            
            <div class="flex justify-content-end mt-4">
                <Button label="削除" icon="pi pi-trash" severity="danger" text @click="deleteReceipt" />
            </div>
        </div>
    </Dialog>
  </div>
</template>
