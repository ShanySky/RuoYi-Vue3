<template>
  <div class="app-container prompt-page">
    <div class="heading"><div><h2>提示词管理</h2><p>System Prompt 与 Compaction Prompt 来自数据库；关闭自定义内容时 Runtime 使用内置默认内容。</p></div></div>
    <el-card v-for="item in prompts" :key="item.promptType" shadow="never" class="prompt-card">
      <template #header><div class="card-head"><div><strong>{{ label(item.promptType) }}</strong><div class="meta">版本 {{ item.versionNo }} · 最近修改 {{ item.updateBy || item.createBy || '-' }}</div></div><el-switch v-model="item.enabledUi" active-text="启用自定义内容" /></div></template>
      <el-input v-model="item.content" type="textarea" :rows="14" maxlength="50000" show-word-limit />
      <div class="vars">可用变量：{{ variables(item.promptType) }}</div>
      <div class="actions"><el-button type="primary" @click="save(item)">保存</el-button><el-button @click="restore(item)">恢复系统默认</el-button></div>
    </el-card>
  </div>
</template>
<script setup name="AiPrompts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { listAiPrompts, updateAiPrompt, restoreDefaultAiPrompt } from '@/api/ai/config'
const prompts = ref([])
function label(type){ return type === 'SYSTEM' ? 'System Prompt' : 'Compaction Prompt' }
function variables(type){ return type === 'SYSTEM' ? '{{currentUser}}、{{route}}' : '{{conversationId}}、{{modelCode}}' }
async function load(){ const res=await listAiPrompts(); prompts.value=(res.data||[]).map(x=>({...x,enabledUi:x.enabled==='0'})) }
async function save(item){ const res=await updateAiPrompt(item.promptType,item.content,item.enabledUi); Object.assign(item,res.data||{}); item.enabledUi=item.enabled==='0'; ElMessage.success('Prompt 已保存，新 Run 将使用新版本') }
async function restore(item){ await ElMessageBox.confirm('恢复为系统默认内容并启用？','恢复默认',{type:'warning'}); await restoreDefaultAiPrompt(item.promptType); await load(); ElMessage.success('已恢复系统默认') }
onMounted(load)
</script>
<style scoped>.prompt-page{max-width:1100px;margin:0 auto}.heading h2{margin:0}.heading p,.meta,.vars{color:var(--el-text-color-secondary);font-size:12px}.prompt-card{margin-top:16px}.card-head{display:flex;justify-content:space-between;gap:16px}.actions{display:flex;gap:8px;margin-top:14px}.vars{margin-top:8px}</style>
