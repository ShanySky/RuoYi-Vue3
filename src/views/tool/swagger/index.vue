<template>
   <i-frame v-model:src="url"></i-frame>
</template>

<script setup>
import iFrame from '@/components/iFrame'
import { useAiPageTools } from '@/ai/toolRegistry'
import { createAiCrudPageCapabilities } from '@/ai/crudPageCapabilities'
import { toolSwaggerPageContract } from '@/ai/pages/toolPageCapabilities'

const url = ref(import.meta.env.VITE_APP_BASE_API + "/swagger-ui/index.html")

const swaggerAiCapabilities = createAiCrudPageCapabilities({
  contract: toolSwaggerPageContract,
  bindings: {
    getContext: () => ({
      integrationMode: 'navigation-only',
      surface: 'embedded-swagger-ui',
      note: 'Swagger 为 API 文档界面；第三阶段不把任意 API 自动转换成可执行 Tool。'
    })
  }
})

useAiPageTools(toolSwaggerPageContract, swaggerAiCapabilities.tools, swaggerAiCapabilities.getContext)
</script>
