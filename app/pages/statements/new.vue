<template>
  <div class="surface-card p-4 border-round shadow-1 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">明細CSVの取り込み</h1>

    <!-- Step 1: Upload & Config -->
    <div v-if="step === 1">
      <div class="field mb-4">
        <div class="flex justify-content-between align-items-end mb-2">
            <label class="font-bold block">対象期間 (任意)</label>
            <div class="flex align-items-center">
                <Checkbox v-model="is20thClosing" :binary="true" inputId="closing20" @change="handleClosingChange" />
                <label for="closing20" class="ml-2 text-sm cursor-pointer">20日締めとしてセット</label>
            </div>
        </div>
        <div class="flex gap-2 align-items-center">
            <Calendar v-model="startDate" dateFormat="yy/mm/dd" showIcon placeholder="開始日" class="w-full" />
            <span>~</span>
            <Calendar v-model="endDate" dateFormat="yy/mm/dd" showIcon placeholder="終了日" class="w-full" />
            <Button icon="pi pi-times" class="p-button-secondary p-button-outlined" @click="resetDate" v-tooltip="'日付をクリア'" v-if="startDate || endDate" />
        </div>
        <small class="block mt-1 text-gray-500">家計簿データ(レシート)を検索する範囲を指定します。指定しない場合はCSVの日付範囲を使用します。</small>
      </div>

      <p class="mb-3">カード会社や銀行からダウンロードしたCSVファイルを選択してください。</p>
      
      <div class="flex align-items-center justify-content-center w-full">
          <label for="dropzone-file" class="flex flex-column align-items-center justify-content-center w-full h-10rem border-2 border-dashed border-primary-500 border-round cursor-pointer hover:surface-50">
              <div class="flex flex-column align-items-center justify-content-center pt-5 pb-6">
                  <i class="pi pi-cloud-upload text-4xl text-primary-500 mb-3"></i>
                  <p class="mb-2 text-sm text-gray-500"><span class="font-semibold">クリックしてアップロード</span></p>
                  <p class="text-xs text-gray-500">CSV形式のみ</p>
              </div>
              <input id="dropzone-file" type="file" class="hidden" accept=".csv" @change="handleFileSelect" />
          </label>
      </div>
    </div>

    <!-- Step 2: Mapping (Only if unknown format) -->
    <div v-if="step === 2">
      <Message severity="info" :closable="false" class="mb-4">
        新しいフォーマットのCSVです。列のマッピングを設定してください。
      </Message>

      <div class="field">
        <label class="font-bold">フォーマット名</label>
        <InputText v-model="formatName" class="w-full" placeholder="例: 楽天カード" />
      </div>

      <div class="grid">
        <div class="col-12 md:col-4 field">
          <label>日付の列</label>
          <Dropdown v-model="mapping.dateColumn" :options="csvHeaders" class="w-full" placeholder="選択してください" />
        </div>
        <div class="col-12 md:col-4 field">
          <label>金額の列</label>
          <Dropdown v-model="mapping.amountColumn" :options="csvHeaders" class="w-full" placeholder="選択してください" />
        </div>
        <div class="col-12 md:col-4 field">
          <label>明細名の列</label>
          <Dropdown v-model="mapping.descColumn" :options="csvHeaders" class="w-full" placeholder="選択してください" />
        </div>
      </div>

      <div class="flex justify-content-end gap-2 mt-4">
        <Button label="キャンセル" class="p-button-secondary" @click="step = 1" />
        <Button label="解析を実行" @click="executeAnalyze" :disabled="!isValidMapping" />
      </div>
    </div>

    <!-- Step 3: Confirmation (If format detected) -->
    <div v-if="step === 3">
      <Message severity="success" :closable="false" class="mb-4">
        フォーマット「{{ detectedFormatName }}」として認識されました。
      </Message>
      <div class="flex justify-content-end gap-2 mt-4">
        <Button label="戻る" class="p-button-secondary" @click="step = 1" />
        <Button label="解析を実行" @click="executeAnalyze" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="processing" class="fixed top-0 left-0 w-full h-full flex align-items-center justify-content-center" style="background: rgba(255,255,255,0.8); z-index: 1000;">
      <ProgressSpinner />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StatementFormat } from '~/types';

interface PreflightResponse {
    header: string[];
    headerSignature: string;
    detectedFormat: StatementFormat | null;
}

interface AnalyzeResponse {
    id: string;
    [key: string]: any;
}

const step = ref(1);
const processing = ref(false);
const selectedFile = ref<File | null>(null);
const startDate = ref<Date | null>(null);
const endDate = ref<Date | null>(null);
const is20thClosing = ref(false);
const csvHeaders = ref<string[]>([]);
const formatName = ref('');
const detectedFormatName = ref('');
const mapping = ref({
  dateColumn: '',
  amountColumn: '',
  descColumn: ''
});
const router = useRouter();

const handleClosingChange = () => {
  if (is20thClosing.value) {
    const today = new Date();
    // End date: 20th of current month
    const end = new Date(today.getFullYear(), today.getMonth(), 20);
    // Start date: 21st of previous month
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 21);
    
    startDate.value = start;
    endDate.value = end;
  }
};

const resetDate = () => {
  startDate.value = null;
  endDate.value = null;
  is20thClosing.value = false;
};

const isValidMapping = computed(() => {
  return formatName.value && mapping.value.dateColumn && mapping.value.amountColumn && mapping.value.descColumn;
});

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  selectedFile.value = input.files[0];
  await preflight();
};

const preflight = async () => {
  if (!selectedFile.value) return;
  
  processing.value = true;
  const formData = new FormData();
  formData.append('file', selectedFile.value);
  
  try {
    const data = await $fetch<PreflightResponse>('/api/statements/preflight', {
      method: 'POST',
      body: formData
    });
    
    csvHeaders.value = data.header;
    
    if (data.detectedFormat) {
      detectedFormatName.value = data.detectedFormat.name;
      step.value = 3;
    } else {
      step.value = 2;
    }
  } catch (e) {
    alert('ファイルの読み込みに失敗しました');
    step.value = 1;
  } finally {
    processing.value = false;
  }
};

const executeAnalyze = async () => {
  if (!selectedFile.value) return;
  
  processing.value = true;
  const formData = new FormData();
  formData.append('file', selectedFile.value);
  
  if (startDate.value) {
    formData.append('startDate', startDate.value.toISOString());
  }
  if (endDate.value) {
    formData.append('endDate', endDate.value.toISOString());
  }
  
  if (step.value === 2) {
    formData.append('mapping', JSON.stringify(mapping.value));
    formData.append('formatName', formatName.value);
  }
  
  try {
    const data = await $fetch<AnalyzeResponse>('/api/statements/analyze', {
      method: 'POST',
      body: formData
    });
    
    router.push(`/statements/${data.id}`);
  } catch (e) {
    alert('解析に失敗しました');
  } finally {
    processing.value = false;
  }
};
</script>
