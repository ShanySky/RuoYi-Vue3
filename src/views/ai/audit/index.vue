<template>
  <div class="app-container audit-page">
    <div class="heading"><h2>会话审计</h2><p>只读查看 AI Conversation / Run / Tool / Checkpoint；本页没有继续、重试、接管或执行 Tool 的入口。</p></div>
    <el-form :inline="true" :model="query" class="filters">
      <el-form-item label="用户 ID"><el-input v-model="query.userId" clearable style="width:120px" /></el-form-item>
      <el-form-item label="Conversation"><el-input v-model="query.conversationId" clearable style="width:140px" /></el-form-item>
      <el-form-item label="标题"><el-input v-model="query.title" clearable /></el-form-item>
      <el-form-item label="状态"><el-select v-model="query.status" clearable style="width:140px"><el-option label="ACTIVE" value="ACTIVE"/><el-option label="ARCHIVED" value="ARCHIVED"/><el-option label="DELETED" value="DELETED"/></el-select></el-form-item>
      <el-form-item><el-button type="primary" @click="load">查询</el-button></el-form-item>
    </el-form>
    <el-table :data="rows" v-loading="loading" @row-click="openDetail">
      <el-table-column prop="conversationId" label="ID" width="80"/><el-table-column prop="userName" label="用户" width="120"/><el-table-column prop="title" label="标题" min-width="190" show-overflow-tooltip/><el-table-column prop="modelCode" label="模型" min-width="150"/><el-table-column prop="status" label="状态" width="105"/>
      <el-table-column label="事件" min-width="230"><template #default="{row}"><el-space wrap><el-tag v-if="truth(row.hasTool)" size="small">Tool</el-tag><el-tag v-if="truth(row.hasWrite)" size="small" type="warning">WRITE</el-tag><el-tag v-if="truth(row.hasStop)" size="small" type="info">Stop</el-tag><el-tag v-if="truth(row.hasSteering)" size="small" type="success">Steering</el-tag><el-tag v-if="truth(row.hasCompaction)" size="small">Compaction</el-tag></el-space></template></el-table-column>
      <el-table-column prop="updateTime" label="更新时间" width="170"/>
    </el-table>
    <el-drawer v-model="drawer" title="只读会话详情" size="62%">
      <template v-if="detail">
        <el-descriptions :column="2" border><el-descriptions-item label="Conversation">{{detail.conversation?.conversationId}}</el-descriptions-item><el-descriptions-item label="用户 ID">{{detail.conversation?.userId}}</el-descriptions-item><el-descriptions-item label="标题">{{detail.conversation?.title}}</el-descriptions-item><el-descriptions-item label="状态">{{detail.conversation?.status}}</el-descriptions-item></el-descriptions>
        <h4>Messages</h4><el-table :data="detail.messages||[]" size="small"><el-table-column prop="sequenceNo" label="#" width="55"/><el-table-column prop="role" label="Role" width="105"/><el-table-column prop="toolName" label="Tool" width="180"/><el-table-column prop="content" label="Content" min-width="260" show-overflow-tooltip/></el-table>
        <h4>Runs / Usage</h4><el-table :data="detail.runs||[]" size="small"><el-table-column prop="runId" label="Run" width="75"/><el-table-column prop="status" label="状态" width="110"/><el-table-column prop="modelCode" label="模型"/><el-table-column prop="systemPromptVersion" label="System P" width="90"/><el-table-column prop="compactionPromptVersion" label="Compact P" width="95"/><el-table-column prop="inputTokens" label="Input" width="80"/><el-table-column prop="cacheReadTokens" label="Cache Read" width="100"/><el-table-column prop="cacheWriteTokens" label="Cache Write" width="105"/><el-table-column prop="totalTokens" label="Total" width="80"/></el-table>
        <h4>Tool / WRITE</h4><el-table :data="detail.pendingTools||[]" size="small"><el-table-column prop="toolName" label="Tool"/><el-table-column prop="riskLevel" label="风险" width="120"/><el-table-column prop="status" label="状态" width="110"/><el-table-column prop="route" label="页面"/></el-table>
        <h4>Checkpoints</h4><el-table :data="detail.checkpoints||[]" size="small"><el-table-column prop="checkpointId" label="ID" width="70"/><el-table-column prop="coveredSequenceNo" label="覆盖到" width="90"/><el-table-column prop="modelCode" label="模型"/><el-table-column prop="summary" label="摘要" show-overflow-tooltip/></el-table>
      </template>
    </el-drawer>
  </div>
</template>
<script setup name="AiAudit">
import { listAiConversationAudit, getAiConversationAudit } from '@/api/ai/admin'
const query=reactive({userId:'',conversationId:'',title:'',status:''}),rows=ref([]),loading=ref(false),drawer=ref(false),detail=ref(null)
const truth=v=>v===true||v===1||v==='1'
async function load(){loading.value=true;try{const params={...query};for(const k of Object.keys(params))if(params[k]==='')delete params[k];const r=await listAiConversationAudit(params);rows.value=r.data||[]}finally{loading.value=false}}
async function openDetail(row){const r=await getAiConversationAudit(row.conversationId);detail.value=r.data;drawer.value=true}
onMounted(load)
</script>
<style scoped>.audit-page{max-width:1450px;margin:0 auto}.heading h2{margin:0}.heading p{color:var(--el-text-color-secondary);font-size:13px}.filters{margin-top:14px}</style>
