<template>
  <div v-loading="loading" class="app-container workspace-policy">
    <h2>工作空间</h2>
    <p>允许助手在独立任务空间中处理数据、生成文档和表格。使用者需另有工作空间使用权限，业务数据仍按本人授权读取。</p>
    <template v-if="policy">
      <div class="policy-bar">
        <el-switch v-hasPermi="['ai:workspace:edit']" :model-value="policy.enabled" :loading="saving" active-text="开放工作空间" @change="save" />
        <el-tag :type="environment.ready ? 'success' : 'warning'">{{ environment.ready ? '隔离环境可用' : '隔离环境未就绪' }}</el-tag>
        <el-button @click="load">刷新状态</el-button>
      </div>
      <el-alert v-if="!environment.ready" :title="environment.message || '资源保护或环境服务不可用，当前不能执行任务。'" type="warning" :closable="false" />
      <el-descriptions v-else :column="2" border>
        <el-descriptions-item label="活动任务">{{ environment.tasks }} / {{ limits.globalTasks }}；每人最多 {{ limits.userTasks }}</el-descriptions-item>
        <el-descriptions-item label="临时任务空间">{{ mib(limits.taskBytes) }}；最多 {{ limits.taskNodes }} 个文件节点</el-descriptions-item>
        <el-descriptions-item label="单任务成果">{{ mib(limits.taskArtifactBytes) }}；最多 {{ limits.taskArtifacts }} 件</el-descriptions-item>
        <el-descriptions-item label="个人成果总量">{{ mib(limits.userArtifactBytes) }}；最多 {{ limits.userArtifacts }} 件</el-descriptions-item>
        <el-descriptions-item label="系统成果用量">{{ mib(environment.artifactBytes) }} / {{ mib(limits.globalArtifactBytes) }}</el-descriptions-item>
        <el-descriptions-item label="系统成果数量">{{ environment.artifactCount }} / {{ limits.globalArtifacts }}</el-descriptions-item>
      </el-descriptions>
      <p class="retention">单件成果最多 8 MiB，保留 24 小时。任务结束后清理临时文件；下载时重新核对当前业务授权。关闭后停止活动环境，既有成果也不可继续访问。</p>
    </template>
  </div>
</template>

<script setup name="AiWorkspaceGovernance">
import { ElMessage } from 'element-plus'
import { getWorkspacePolicy, setWorkspacePolicy } from '@/api/ai/workspace'
const loading = ref(false)
const saving = ref(false)
const policy = ref(null)
const environment = computed(() => policy.value?.environment || {})
const limits = computed(() => environment.value.limits || {})
const mib = bytes => `${((bytes || 0) / 1024 / 1024).toFixed(1)} MiB`
async function load() {
  loading.value = true
  try { policy.value = (await getWorkspacePolicy()).data }
  finally { loading.value = false }
}
async function save(enabled) {
  saving.value = true
  try {
    await setWorkspacePolicy({ enabled, revision: policy.value.revision })
    ElMessage.success(enabled ? '工作空间已开放，使用权限仍按用户核对' : '工作空间已关闭，活动环境将被回收')
    await load()
  } finally { saving.value = false }
}
onMounted(load)
</script>

<style scoped>
h2 { margin-top: 0; }
p { color: var(--el-text-color-secondary); line-height: 1.7; max-width: 900px; }
.policy-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 24px; margin: 24px 0; }
.retention { margin-top: 24px; }
</style>
