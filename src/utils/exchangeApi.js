const API_URL = import.meta.env.VITE_EXCHANGE_API_URL || '/api/exchange'

export async function requestExchange(userId, amount) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount }),
    })

    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      return { success: true, message: '출금이 완료되었어요!' }
    }
    if (res.status === 429) {
      return { success: false, message: '오늘 이미 출금했어요' }
    }
    return { success: false, message: data.message || '서버 오류가 발생했어요' }
  } catch {
    return { success: false, message: '네트워크 오류가 발생했어요. 잠시 후 다시 시도해주세요' }
  }
}
