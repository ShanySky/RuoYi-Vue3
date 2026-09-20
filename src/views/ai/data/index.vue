<template>
  <div v-loading="loading" class="app-container data-governance">
    <h2>数据查询</h2>
    <p class="intro">选择助手可以查询的表、字段和操作。使用者仍须拥有对应业务权限，查询和统计均遵守其本人数据范围。</p>
    <div class="database-bar" v-if="database">
      <strong>数据库：{{ database.title }}</strong>
      <el-switch v-hasPermi="['ai:data:edit']" :model-value="database.enabled" :loading="saving"
        active-text="开放数据查询" @change="toggleDatabase" />
      <el-button @click="load">刷新结构</el-button>
    </div>
    <div class="columns" v-if="database">
      <aside>
        <el-input v-model="keyword" placeholder="查找表或业务名称" clearable />
        <el-tree :data="tree" node-key="key" :props="{ label: 'label' }" highlight-current
          @node-click="selectTable" :expand-on-click-node="false" />
      </aside>
      <section v-if="selected" class="policy">
        <h3>{{ selected.title }} <small>{{ selected.key }}</small></h3>
        <el-alert v-if="!selected.supported" :title="selected.reason" type="info" :closable="false" />
        <template v-else>
          <el-alert v-if="selected.contractChanged" title="查询或字段结构已变化，原开放已失效，请核对后重新保存。" type="warning" :closable="false" />
          <p class="intro">关联查询需要全部来源表开放。关闭字段后，助手也不能使用该字段筛选、排序或统计；旧结果会随授权变化失效。</p>
          <p v-for="view in selected.views" :key="view.id">{{ view.title }} · 原业务权限：<code>{{ view.permission }}</code></p>
          <el-form label-width="90px">
            <el-form-item label="开放此表"><el-switch v-model="form.enabled" /></el-form-item>
            <el-form-item label="允许操作">
              <el-checkbox-group v-model="form.operations">
                <el-checkbox value="QUERY">明细查询</el-checkbox>
                <el-checkbox value="AGGREGATE">分组统计</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="允许字段">
              <el-checkbox-group v-model="form.fields" class="fields">
                <el-checkbox v-for="column in selected.columns" :key="column.name" :value="column.name" :disabled="!column.supported">
                  {{ column.comment || column.name }} <code>{{ column.name }}</code>
                  <span v-if="!column.supported">（原业务未开放）</span>
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item>
              <el-button v-hasPermi="['ai:data:edit']" type="primary" :loading="saving" @click="save">保存表策略</el-button>
            </el-form-item>
          </el-form>
        </template>
      </section>
      <el-empty v-else description="选择左侧业务表，查看字段和开放策略" />
    </div>
  </div>
</template>

<script setup name="AiDataGovernance">
import { ElMessage } from 'element-plus'
import { listDataPolicies, setDataPolicy } from '@/api/ai/data'

const loading = ref(false)
const saving = ref(false)
const database = ref(null)
const selected = ref(null)
const keyword = ref('')
const form = reactive({ enabled: false, fields: [], operations: [] })
const tree = computed(() => (database.value?.tables || [])
  .filter(row => `${row.key} ${row.title}`.toLowerCase().includes(keyword.value.trim().toLowerCase()))
  .sort((a, b) => Number(b.supported) - Number(a.supported) || a.key.localeCompare(b.key))
  .map(row => ({ ...row, label: `${row.title} · ${row.key}${row.enabled ? ' · 已开放' : ''}` })))

function selectTable(row) {
  selected.value = row
  form.enabled = row.enabled
  form.fields = row.fields.filter(name => row.columns.some(column => column.name === name && column.supported))
  form.operations = [...row.operations]
}

async function load() {
  loading.value = true
  try {
    const key = selected.value?.key
    database.value = (await listDataPolicies()).data
    const row = database.value.tables.find(table => table.key === key)
    if (row) selectTable(row)
  } finally { loading.value = false }
}

async function toggleDatabase(enabled) {
  saving.value = true
  try {
    await setDataPolicy('database', { fingerprint: database.value.fingerprint, enabled, fields: [], operations: [] })
    database.value.enabled = enabled
    ElMessage.success(enabled ? '数据库已开放，仍需逐表配置字段和操作' : '数据库查询已关闭')
  } finally { saving.value = false }
}

async function save() {
  if (form.enabled && (!form.fields.length || !form.operations.length)) {
    ElMessage.warning('开放此表前，请选择允许字段和操作')
    return
  }
  saving.value = true
  try {
    await setDataPolicy(selected.value.key, { fingerprint: selected.value.fingerprint, ...form })
    ElMessage.success('表策略已保存，使用者仍须通过业务授权')
    await load()
  } finally { saving.value = false }
}

onMounted(load)
</script>

<style scoped>
h2 { margin-top: 0; }
.intro { color: var(--el-text-color-secondary); line-height: 1.65; }
.database-bar { display: flex; align-items: center; gap: 24px; margin: 24px 0; flex-wrap: wrap; }
.columns { display: grid; grid-template-columns: minmax(240px, 30%) 1fr; gap: 30px; }
aside { max-height: 70vh; overflow: auto; border-right: 1px solid var(--el-border-color-light); padding-right: 16px; }
.el-tree { margin-top: 14px; }
.policy { min-width: 0; }
h3 small { margin-left: 8px; color: var(--el-text-color-secondary); font-weight: normal; }
.fields { display: flex; flex-direction: column; align-items: flex-start; }
code { margin-left: 6px; }
@media (max-width: 760px) { .columns { grid-template-columns: 1fr; } aside { max-height: 220px; border-right: none; } }
</style>
