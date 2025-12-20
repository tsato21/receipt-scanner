<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { Reminder } from '~/types';

const toast = useToast();
const reminders = ref<Reminder[]>([]);
const loading = ref(false);
const showDialog = ref(false);

const form = ref<Partial<Reminder>>({
    itemName: '',
    frequencyDays: 30,
    nextRunAt: new Date(),
    enabled: true
});

const fetchReminders = async () => {
    loading.value = true;
    try {
        const data = await $fetch<Reminder[]>('/api/reminders');
        reminders.value = data;
    } catch (e) {
        console.error('Failed to fetch reminders', e);
    } finally {
        loading.value = false;
    }
};

const route = useRoute();

onMounted(async () => {
    await fetchReminders();
    
    // Check for query params (from dashboard)
    if (route.query.itemName) {
        openNew();
        form.value.itemName = route.query.itemName as string;
    }
});

const saveReminder = async () => {
    if (!form.value.itemName) {
        toast.add({ severity: 'warn', summary: '入力不備', detail: '項目名を入力してください', life: 3000 });
        return;
    }

    try {
        await $fetch('/api/reminders', {
            method: 'POST',
            body: form.value
        });
        toast.add({ severity: 'success', summary: '保存しました', life: 3000 });
        showDialog.value = false;
        fetchReminders();
    } catch (e) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '保存に失敗しました', life: 3000 });
    }
};

const editReminder = (reminder: Reminder) => {
    form.value = { ...reminder, nextRunAt: new Date(reminder.nextRunAt) };
    showDialog.value = true;
};

const openNew = () => {
    form.value = { itemName: '', frequencyDays: 30, nextRunAt: new Date(), enabled: true };
    showDialog.value = true;
};

const formatDate = (dateVal: string | Date) => {
    return new Date(dateVal).toLocaleDateString('ja-JP');
};
</script>

<template>
    <div class="max-w-4xl mx-auto">
        <Toast />
        <div class="flex justify-content-between align-items-center mb-4">
            <h1 class="m-0 text-3xl font-bold text-900">通知設定 (LINE)</h1>
            <Button label="新規リマインダー" icon="pi pi-plus" @click="openNew" />
        </div>

        <div class="card p-4 bg-white border-round shadow-1">
            <DataTable :value="reminders" :loading="loading" stripedRows>
                <Column field="itemName" header="項目名" sortable></Column>
                <Column field="frequencyDays" header="頻度 (日)" sortable></Column>
                <Column field="nextRunAt" header="次回予定" sortable>
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.nextRunAt) }}
                    </template>
                </Column>
                <Column field="enabled" header="状態">
                    <template #body="slotProps">
                        <Tag :severity="slotProps.data.enabled ? 'success' : 'secondary'" :value="slotProps.data.enabled ? '有効' : '無効'" />
                    </template>
                </Column>
                <Column header="操作">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" text rounded @click="editReminder(slotProps.data)" />
                    </template>
                </Column>
                <template #empty>通知設定がありません</template>
            </DataTable>
        </div>

        <Dialog v-model:visible="showDialog" :header="form.id ? 'リマインダー編集' : '新規リマインダー'" modal class="p-fluid w-full max-w-30rem">
            <div class="flex flex-column gap-4 py-2">
                <div class="field">
                    <label class="font-bold">対象の項目名</label>
                    <InputText v-model="form.itemName" placeholder="例: トイレットペーパー" autofocus />
                </div>
                <div class="field">
                    <label class="font-bold">通知頻度 (何日おきに通知するか)</label>
                    <div class="flex align-items-center gap-2">
                        <InputNumber v-model="form.frequencyDays" :min="1" suffix=" 日" showButtons />
                    </div>
                </div>
                <div class="field">
                    <label class="font-bold">次回通知日</label>
                    <DatePicker v-model="form.nextRunAt" showIcon dateFormat="yy-mm-dd" />
                </div>
                <div class="flex align-items-center gap-2">
                    <Checkbox v-model="form.enabled" :binary="true" inputId="enabled" />
                    <label for="enabled">通知を有効にする</label>
                </div>
            </div>
            <template #footer>
                <Button label="キャンセル" icon="pi pi-times" text @click="showDialog = false" />
                <Button label="保存" icon="pi pi-check" @click="saveReminder" />
            </template>
        </Dialog>
    </div>
</template>
