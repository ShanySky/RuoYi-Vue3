<template>
  <section v-if="artifacts.length || notice" class="artifacts" data-testid="ai-artifacts" aria-label="会话成果">
    <div class="artifact-heading">会话成果 <span>按当前权限下载</span></div>
    <p v-if="notice" class="artifact-notice">{{ notice }}</p>
    <div v-for="file in artifacts" :key="file.id" class="artifact-row">
      <div class="artifact-name">
        <strong>{{ file.name }}</strong>
        <small>{{ size(file.bytes) }} · 保留至 {{ new Date(file.expiresAt).toLocaleString('zh-CN', { hour12: false }) }}</small>
      </div>
      <el-button size="small" link type="primary" :loading="downloading === file.id" @click="download(file)">下载</el-button>
    </div>
  </section>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { saveAs } from 'file-saver'
import { getConversationArtifacts, downloadArtifact } from '@/api/ai/workspace'

const props = defineProps({ conversationId: { type: Number, default: null }, busy: Boolean })
const artifacts = ref([])
const notice = ref('')
const downloading = ref(null)
let controller
let generation = 0
const size = bytes => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MiB` : `${Math.max(1, Math.ceil(bytes / 1024))} KiB`

async function refresh() {
  controller?.abort()
  const current = ++generation
  if (!props.conversationId) { artifacts.value = []; notice.value = ''; return }
  controller = new AbortController()
  try {
    const result = await getConversationArtifacts(props.conversationId, controller.signal)
    if (current !== generation) return
    artifacts.value = result
    notice.value = ''
  } catch (error) {
    if (current !== generation || error.name === 'AbortError') return
    if (artifacts.value.length) notice.value = '成果已到期或当前授权已变化，暂不能读取。'
    artifacts.value = []
  }
}

async function download(file) {
  downloading.value = file.id
  try { saveAs(await downloadArtifact(file.id), file.name) }
  catch (error) { ElMessage.error(error.message || '成果下载失败'); await refresh() }
  finally { downloading.value = null }
}

watch(() => props.conversationId, () => {
  generation++
  controller?.abort()
  artifacts.value = []
  notice.value = ''
  if (!props.busy) void refresh()
}, { immediate: true })
watch(() => props.busy, value => { if (!value) void refresh() })
const timer = setInterval(() => { if (!props.busy) void refresh() }, 60000)
onBeforeUnmount(() => { generation++; controller?.abort(); clearInterval(timer) })
</script>

<style scoped>
.artifacts { padding: 12px; margin: 12px 0; border: 1px solid var(--el-border-color-light); border-radius: 10px; }
.artifact-heading { font-weight: 600; }
.artifact-heading span { margin-left: 6px; color: var(--el-text-color-secondary); font-size: 11px; font-weight: normal; }
.artifact-row { display: flex; gap: 12px; align-items: center; justify-content: space-between; padding-top: 10px; }
.artifact-name { min-width: 0; overflow-wrap: anywhere; }
.artifact-name strong { display: block; font-size: 12px; }
.artifact-name small, .artifact-notice { color: var(--el-text-color-secondary); font-size: 11px; }
</style>
