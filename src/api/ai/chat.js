import request from '@/utils/request'

export function sendAiTurn(data) {
  return request({
    url: '/ai/chat/turn',
    method: 'post',
    data,
    timeout: 120000,
    headers: { repeatSubmit: false }
  })
}
