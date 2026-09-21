import request from '@/utils/request'
import { getToken } from '@/utils/auth'

export const getWorkspacePolicy = () => request({ url: '/ai/admin/workspace', method: 'get' })
export const setWorkspacePolicy = data => request({ url: '/ai/admin/workspace', method: 'put', data })

// 成果是可选能力；未开放时由局部列表处理拒绝，避免干扰普通聊天。
export async function getConversationArtifacts(id, signal) {
  const response = await fetch(`${import.meta.env.VITE_APP_BASE_API}/ai/chat/conversations/${id}/artifacts`, {
    headers: { Authorization: `Bearer ${getToken()}` }, cache: 'no-store', signal
  })
  const body = await response.json()
  if (!response.ok || body.code !== 200) throw new Error(body.msg || '成果暂不可访问')
  return body.data || []
}

export async function downloadArtifact(id) {
  const blob = await request({ url: `/ai/artifacts/${encodeURIComponent(id)}/download`, method: 'get', responseType: 'blob', timeout: 65000 })
  if (blob.type.includes('application/json')) {
    const error = JSON.parse(await blob.text())
    throw new Error(error.msg || '当前无权下载或成果已到期')
  }
  return blob
}
