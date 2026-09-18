<template>
  <div class="app-container policy-page">
    <div class="heading"><h2>会话策略</h2><p>系统级策略只由管理员控制；个人模型、字体、快捷键等仍在“我的 AI 设置”中配置。</p></div>
    <el-card shadow="never">
      <el-form label-width="190px">
        <el-form-item label="会话保留天数"><el-input-number v-model="form.retentionDays" :min="1" :max="3650" /><span class="tip">超过保留期且无活动 Run 的会话由每日清理任务物理清理。</span></el-form-item>
        <el-form-item label="允许用户归档自己的会话"><el-switch v-model="form.userArchiveEnabled" /></el-form-item>
        <el-form-item label="允许用户删除自己的会话"><el-switch v-model="form.userDeleteEnabled" /><span class="tip">用户删除为软删除；系统过期清理才物理删除。</span></el-form-item>
        <el-form-item><el-button type="primary" @click="save">保存策略</el-button><el-button @click="cleanup">立即执行过期清理</el-button></el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
<script setup name="AiPolicy">
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAiConversationPolicy, saveAiConversationPolicy, cleanupAiConversations } from '@/api/ai/admin'
const form=reactive({retentionDays:90,userArchiveEnabled:true,userDeleteEnabled:false})
async function load(){const r=await getAiConversationPolicy();Object.assign(form,r.data||{})}
async function save(){await saveAiConversationPolicy({...form});ElMessage.success('会话策略已保存')}
async function cleanup(){await ElMessageBox.confirm('立即按当前保留天数清理过期会话？活动 Run 不会被清理。','执行清理',{type:'warning'});const r=await cleanupAiConversations();ElMessage.success(`清理完成：${r.data?.cleaned||0} 个会话`)}
onMounted(load)
</script>
<style scoped>.policy-page{max-width:900px;margin:0 auto}.heading h2{margin:0}.heading p,.tip{color:var(--el-text-color-secondary);font-size:12px}.tip{margin-left:12px}</style>
