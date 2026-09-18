<template>
  <div class="app-container page-config">
    <div class="heading"><h2>页面能力</h2><p>这里控制业务页面是否向 AI 暴露 Page Capability。停用后普通聊天仍可用，但服务端不会批准该页业务 Tool。</p></div>
    <el-table :data="rows" v-loading="loading">
      <el-table-column prop="pageName" label="页面" min-width="160" />
      <el-table-column prop="route" label="路由" min-width="240" />
      <el-table-column label="注册状态" width="120"><template #default="{row}"><el-tag :type="isRegistered(row.route)?'success':'warning'" effect="plain">{{ isRegistered(row.route)?'已注册':'待核对' }}</el-tag></template></el-table-column>
      <el-table-column label="AI 接入" width="110"><template #default="{row}"><el-switch :model-value="row.enabled==='0'" @change="v=>toggle(row,v)" /></template></el-table-column>
      <el-table-column prop="updateBy" label="最近修改" width="140" />
    </el-table>
  </div>
</template>
<script setup name="AiPages">
import { ElMessage } from 'element-plus'
import { listAiPageConfigs, setAiPageEnabled } from '@/api/ai/admin'
import { aiPageCapabilityCatalog } from '@/ai/pageCapabilityCatalog'
const rows=ref([]),loading=ref(false), catalog=new Set(aiPageCapabilityCatalog.map(x=>x.route))
const isRegistered=route=>catalog.has(route)
async function load(){loading.value=true;try{const r=await listAiPageConfigs();rows.value=r.data||[]}finally{loading.value=false}}
async function toggle(row,v){await setAiPageEnabled(row.pageId,v);row.enabled=v?'0':'1';ElMessage.success(v?'已启用该页面 AI 能力':'已停用该页面 AI 能力')}
onMounted(load)
</script>
<style scoped>.page-config{max-width:1100px;margin:0 auto}.heading h2{margin:0}.heading p{color:var(--el-text-color-secondary);font-size:13px}</style>
