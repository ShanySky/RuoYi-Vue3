<template>
  <div class="app-container api-governance">
    <h2>后端接口</h2>
    <p class="intro">目录来自当前已部署的业务接口。逐项开放后，助手仍须通过使用者本人的业务权限和数据范围校验。</p>
    <el-input v-model="keyword" placeholder="搜索业务对象、权限或接口路径" clearable class="search" />
    <el-button @click="load">刷新目录</el-button>
    <el-table v-loading="loading" :data="tree" row-key="id" :tree-props="{ children: 'children' }" default-expand-all>
      <el-table-column prop="title" label="模块 / 业务对象 / 动作" min-width="230" />
      <el-table-column label="业务接口" min-width="300">
        <template #default="{ row }"><code v-if="row.path">{{ row.method }} {{ row.path }}</code></template>
      </el-table-column>
      <el-table-column prop="permission" label="原业务权限" min-width="170" />
      <el-table-column label="执行方式" width="120">
        <template #default="{ row }"><span v-if="row.path">{{ row.riskLevel === 'READ' ? '只读' : '确认后写入' }}</span></template>
      </el-table-column>
      <el-table-column label="开放给助手" width="130">
        <template #default="{ row }">
          <el-switch v-if="row.path" v-hasPermi="['ai:api:edit']" :model-value="row.enabled"
            :disabled="!row.supported" :loading="saving === row.id" @change="value => toggle(row, value)" />
        </template>
      </el-table-column>
      <el-table-column label="状态说明" min-width="200">
        <template #default="{ row }">
          <span v-if="row.unsupportedReason">{{ row.unsupportedReason }}</span>
          <el-tag v-else-if="row.contractChanged" type="warning">契约已变化，需重新核查开放</el-tag>
          <span v-else-if="row.path">{{ row.enabled ? '已开放，执行时重新鉴权' : '未开放' }}</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup name="AiApiGovernance">
import { ElMessage } from 'element-plus'
import { listServerApiPolicies, setServerApiPolicy } from '@/api/ai/server'

const rows = ref([])
const loading = ref(false)
const saving = ref(null)
const keyword = ref('')
const tree = computed(() => {
  const modules = new Map()
  const query = keyword.value.trim().toLowerCase()
  for (const row of rows.value) {
    if (query && !`${row.title} ${row.permission} ${row.path}`.toLowerCase().includes(query)) continue
    if (!modules.has(row.module)) modules.set(row.module, { id: `module:${row.module}`, title: row.module, groups: new Map() })
    const module = modules.get(row.module)
    if (!module.groups.has(row.object)) module.groups.set(row.object, {
      id: `object:${row.module}:${row.object}`, title: row.object, children: []
    })
    module.groups.get(row.object).children.push(row)
  }
  return [...modules.values()].map(module => ({ ...module, children: [...module.groups.values()] }))
})

async function load() {
  loading.value = true
  try { rows.value = (await listServerApiPolicies()).data || [] }
  finally { loading.value = false }
}

async function toggle(row, enabled) {
  saving.value = row.id
  try {
    await setServerApiPolicy(row.id, row.fingerprint, enabled)
    row.enabled = enabled
    row.contractChanged = false
    ElMessage.success(enabled ? '已开放该接口，使用者仍须拥有业务权限' : '已停止开放该接口')
  } finally { saving.value = null }
}

onMounted(load)
</script>

<style scoped>
.api-governance h2 { margin-top: 0; }
.intro { color: var(--el-text-color-secondary); line-height: 1.6; }
.search { width: 380px; max-width: 70%; margin: 8px 12px 20px 0; }
</style>
