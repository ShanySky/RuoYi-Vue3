<template>
   <i-frame v-model:src="url"></i-frame>
</template>

<script setup>
import iFrame from '@/components/iFrame'
import { useAiPageTools } from '@/ai/toolRegistry'

const url = ref(import.meta.env.VITE_APP_BASE_API + "/swagger-ui/index.html")

useAiPageTools('tool.swagger', [], () => ({
  integrationMode: 'navigation-only',
  surface: 'embedded-swagger-ui',
  note: 'Swagger 为 API 文档界面；第三阶段不把任意 API 自动转换成可执行 Tool。'
}), {
  route: '/tool/swagger',
  pageName: '系统接口'
})
</script>
