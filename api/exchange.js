import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_ID = '3bottle'
const EXCHANGE_AMOUNT = 9

function getKSTDateStr() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  try {
    const { userId, amount } = req.body

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: '유저 정보가 없습니다' })
    }

    if (!Number.isInteger(amount) || amount !== EXCHANGE_AMOUNT) {
      return res.status(400).json({ message: `교환 금액은 ${EXCHANGE_AMOUNT}원이어야 합니다` })
    }

    const today = getKSTDateStr()

    const { data: existing, error: selectError } = await supabase
      .from('exchange_log')
      .select('id')
      .eq('app_id', APP_ID)
      .eq('user_key', userId)
      .eq('kst_date', today)
      .limit(1)

    if (selectError) {
      console.error('Supabase select error:', selectError)
      return res.status(500).json({ message: '서버 오류가 발생했습니다' })
    }

    if (existing && existing.length > 0) {
      return res.status(429).json({ message: '오늘 이미 교환했습니다' })
    }

    const { error: insertError } = await supabase
      .from('exchange_log')
      .insert({
        app_id: APP_ID,
        user_key: userId,
        amount,
        kst_date: today,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(429).json({ message: '오늘 이미 교환했습니다' })
      }
      console.error('Supabase insert error:', insertError)
      return res.status(500).json({ message: '서버 오류가 발생했습니다' })
    }

    // v2: 여기서 executePromotion API 호출 추가
    return res.status(200).json({ success: true, amount })

  } catch (e) {
    console.error('Exchange API error:', e)
    return res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}
