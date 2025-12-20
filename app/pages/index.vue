<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { Receipt, Store, Category } from '~/types';

const toast = useToast();
const loading = ref(false);

const form = ref<Partial<Receipt> & { selectedStore?: string | Store, categoryName?: string }>({
  date: new Date(),
  items: [],
  total: 0
});

const stores = ref<Store[]>([]);
const categories = ref<Category[]>([]);
const filteredStores = ref<Store[]>([]);
const newCategoryName = ref('');

const categoryOptions = computed(() => {
    return [
        ...categories.value,
        { id: 'NEW', name: '--- 新規追加 ---' }
    ];
});

const fetchMaster = async () => {
  try {
      const { stores: s, categories: c } = await $fetch<{ stores: Store[], categories: Category[] }>('/api/master');
      stores.value = s;
      categories.value = c;
  } catch (e) {
      console.error('Failed to fetch master data', e);
  }
};

onMounted(fetchMaster);

const searchStore = (event: any) => {
    if (!event.query.trim().length) {
        filteredStores.value = [...stores.value];
    } else {
        filteredStores.value = stores.value.filter((store) => {
            return store.name.toLowerCase().startsWith(event.query.toLowerCase());
        });
    }
};

const onStoreSelect = (event: any) => {
   const store = event.value;
   if (store && typeof store === 'object' && 'defaultCategoryId' in store) {
       if (store.defaultCategoryId) {
           form.value.categoryId = store.defaultCategoryId;
       }
   }
};

const takePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    };
    input.click();
};

const customUploader = async (event: any) => {
    const file = event.files[0];
    await processFile(file);
};

const processFile = async (file: File) => {
    loading.value = true;
    try {
        const compressedFile = await compressImage(file);
        
        const formData = new FormData();
        formData.append('image', compressedFile, file.name);

        const data = await $fetch<any>('/api/receipts/analyze', {
            method: 'POST',
            body: formData
        });
        
        console.log('Analysis result:', JSON.stringify(data));
        
        const sanitizeNumber = (val: any) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                return Number(val.replace(/[^0-9.-]/g, '')) || 0;
            }
            return 0;
        };

        form.value.total = sanitizeNumber(data.total);
        form.value.items = (data.items || []).map((item: any) => ({ 
            ...item, 
            price: sanitizeNumber(item.price),
            id: Math.random().toString(36).substr(2, 9) 
        }));
        if (data.date) form.value.date = new Date(data.date);
        
        if (data.storeName) {
           const existing = stores.value.find(s => s.name === data.storeName);
           if (existing) {
               form.value.selectedStore = existing;
               form.value.categoryId = existing.defaultCategoryId || form.value.categoryId;
           } else {
               form.value.selectedStore = data.storeName;
           }
        }
        
        if (data.categoryName) {
            // 解析された名前を常に保持（サーバー側での最終解決用）
            form.value.categoryName = data.categoryName;
            
            // 既存のリストから探す
            const cat = categories.value.find(c => c.name === data.categoryName);
            if (cat) {
                // 見つかれば ID をセット
                form.value.categoryId = cat.id;
            } else {
                // 見つからなければ「新規追加」を選択状態にする
                form.value.categoryId = 'NEW';
                newCategoryName.value = data.categoryName;
            }
        }

        toast.add({ severity: 'success', summary: '解析完了', life: 3000 });
    } catch (e: any) {
        console.error(e);
        toast.add({ severity: 'error', summary: 'Error', detail: '解析に失敗しました', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const scaleSize = MAX_WIDTH / img.width;
                
                if (scaleSize >= 1) {
                     canvas.width = img.width;
                     canvas.height = img.height;
                } else {
                     canvas.width = MAX_WIDTH;
                     canvas.height = img.height * scaleSize;
                }
                
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas is empty'));
                    }
                }, 'image/jpeg', 0.7);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

const save = async () => {
    if (!form.value.total || form.value.total <= 0) {
        toast.add({ severity: 'warn', summary: '入力不備', detail: '合計金額を入力してください', life: 3000 });
        return;
    }

    const payload: any = { ...form.value };
    
    // UIで別のカテゴリが選択された場合、解析時の名前は不要になるので消す
    if (payload.categoryId && !payload.categoryId.startsWith('default_')) {
        delete payload.categoryName;
    }

    // Do not send virtual category IDs, but send the name instead
    if (payload.categoryId === 'NEW') {
        payload.categoryName = newCategoryName.value;
        delete payload.categoryId;
    } else if (payload.categoryId && payload.categoryId.startsWith('default_')) {
        const cat = categories.value.find(c => c.id === payload.categoryId);
        if (cat) payload.categoryName = cat.name;
        delete payload.categoryId;
    }

    // 店舗情報の整理
    if (payload.selectedStore && typeof payload.selectedStore === 'object' && 'id' in payload.selectedStore) {
        payload.storeId = payload.selectedStore.id;
        payload.storeName = payload.selectedStore.name;
    } else if (payload.selectedStore) {
        payload.storeName = payload.selectedStore as string;
        payload.storeId = undefined;
    } else {
        payload.storeName = '不明な店舗';
        payload.storeId = undefined;
    }
    delete payload.selectedStore;

    try {
        console.log('Saving payload:', JSON.stringify(payload));
        await $fetch('/api/receipts', {
            method: 'POST',
            body: payload
        });
        toast.add({ severity: 'success', summary: '保存しました', life: 3000 });
        form.value = { date: new Date(), items: [], total: 0, selectedStore: undefined, categoryId: undefined };
        newCategoryName.value = ''; // Reset
        await fetchMaster();
    } catch (e: any) {
        console.error('Save error:', e);
        toast.add({ severity: 'error', summary: 'Error', detail: '保存に失敗しました', life: 3000 });
    }
};

const addItem = () => {
    if (!form.value.items) form.value.items = [];
    form.value.items.push({ id: Math.random().toString(36).substr(2, 9), name: '', price: 0 });
};
const removeItem = (data: any) => {
    const index = form.value.items?.indexOf(data);
    if (index !== undefined && index > -1) {
        form.value.items?.splice(index, 1);
        recalculateTotal();
    }
};

const onCellEditComplete = (event: any) => {
    const { data, newValue, field } = event;
    data[field] = newValue;
    if (field === 'price') {
        recalculateTotal();
    }
};

const recalculateTotal = () => {
    if (form.value.items && form.value.items.length > 0) {
        const sum = form.value.items.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
        form.value.total = sum;
    }
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
};
</script>

<template>
  <div class="flex justify-content-center">
    <div class="flex flex-column gap-6 w-full max-w-30rem">
        <Toast />
        
        <div class="card flex flex-column gap-3 bg-white p-4 border-round shadow-1">
            <Button label="カメラで撮る" icon="pi pi-camera" class="w-full" @click="takePhoto" />
            <div class="flex align-items-center gap-2">
                <div class="flex-grow-1 border-bottom-1 surface-border"></div>
                <span class="text-sm text-600">または</span>
                <div class="flex-grow-1 border-bottom-1 surface-border"></div>
            </div>
            <FileUpload mode="basic" name="image" customUpload @uploader="customUploader" accept="image/*" auto chooseLabel="ライブラリから選択" class="w-full" />
        </div>

        <div v-if="loading" class="flex justify-content-center">
            <ProgressSpinner />
        </div>

        <div v-else class="card flex flex-column gap-4 p-4 border-round shadow-1 bg-white">
            <h2 class="m-0">レシート登録</h2>
            <div class="grid formgrid p-fluid">
                <div class="field col-12 md:col-3">
                    <label class="font-bold text-sm text-600">日付</label>
                    <DatePicker v-model="form.date" showIcon dateFormat="yy-mm-dd" />
                </div>
                <div class="field col-12 md:col-5">
                    <label class="font-bold text-sm text-600">店舗名</label>
                    <AutoComplete v-model="form.selectedStore" :suggestions="filteredStores" @complete="searchStore" optionLabel="name" @item-select="onStoreSelect" dropdown :forceSelection="false" />
                </div>
                <div class="field col-12 md:col-4">
                    <label class="font-bold text-sm text-primary">合計金額</label>
                    <InputNumber v-model="form.total" mode="currency" currency="JPY" inputClass="text-lg font-bold text-primary" fluid />
                </div>
                
                <div class="field col-12">
                    <div class="surface-100 p-3 border-round">
                        <label class="font-bold block mb-2">カテゴリ設定</label>
                        <div class="grid">
                            <div :class="form.categoryId === 'NEW' ? 'col-12 md:col-6' : 'col-12'">
                                <Select v-model="form.categoryId" :options="categoryOptions" optionLabel="name" optionValue="id" placeholder="カテゴリを選択" class="w-full" />
                            </div>
                            <div v-if="form.categoryId === 'NEW'" class="col-12 md:col-6">
                                <InputText v-model="newCategoryName" placeholder="新規カテゴリ名を入力" class="w-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-column gap-2 mt-2">
                <div class="flex justify-content-between align-items-center mt-2">
                    <label class="font-bold text-lg">明細一覧</label>
                    <Button icon="pi pi-plus" size="small" rounded outlined label="行追加" @click="addItem" />
                </div>
                <DataTable :value="form.items" editMode="cell" @cell-edit-complete="onCellEditComplete" rowKey="id" tableClass="editable-cells-table" showGridlines>
                    <Column field="name" header="商品名">
                        <template #editor="{ data, field }">
                            <InputText v-model="data[field]" fluid autofocus />
                        </template>
                    </Column>
                    <Column field="price" header="金額">
                        <template #body="{ data, field }">
                            {{ formatCurrency(data[field]) }}
                        </template>
                        <template #editor="{ data, field }">
                            <InputNumber v-model="data[field]" mode="currency" currency="JPY" fluid autofocus />
                        </template>
                    </Column>
                    <Column bodyStyle="text-align:center" style="width: 3rem">
                        <template #body="{ data }">
                            <Button icon="pi pi-trash" text severity="danger" @click="removeItem(data)" />
                        </template>
                    </Column>
                    <template #empty>明細なし</template>
                </DataTable>
            </div>

            <div class="flex justify-content-end mt-4">
                <Button label="保存" icon="pi pi-save" @click="save" />
            </div>
        </div>
    </div>
  </div>
</template>