<template>
   <div>
      <i-frame v-model:src="url"></i-frame>
   </div>
</template>

<script setup>
import iFrame from '@/components/iFrame'

import { ref } from 'vue'
import { useAiPageTools } from '@/ai/toolRegistry'
import { createAiCrudPageCapabilities } from '@/ai/crudPageCapabilities'
import { monitorDruidPageContract } from '@/ai/pages/monitorPageCapabilities'

const url = ref(import.meta.env.VITE_APP_BASE_API + '/druid/login.html')

const druidAiCapabilities = createAiCrudPageCapabilities({
  contract: monitorDruidPageContract,
  bindings: {
    getContext: () => ({
      integrationMode: 'navigation-only',
      surface: 'embedded-druid-monitor',
      note: 'Druid 为嵌入式外部监控界面；第三阶段不向 AI 暴露 iframe DOM、坐标点击或任意脚本操作。'
    })
  }
})

useAiPageTools(monitorDruidPageContract, druidAiCapabilities.tools, druidAiCapabilities.getContext)
</script>
