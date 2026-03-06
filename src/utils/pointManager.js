const KEYS = {
  POINTS: '3bottle_points',
  TODAY_DATE: '3bottle_today_date',
  TODAY_EARNED: '3bottle_today_earned',
}

export const DAILY_MAX = 9
export const PER_WIN = 3
export const WITHDRAW_MIN = 9

function getKSTDate() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function resetDailyIfNeeded() {
  const today = getKSTDate()
  if (localStorage.getItem(KEYS.TODAY_DATE) !== today) {
    localStorage.setItem(KEYS.TODAY_DATE, today)
    localStorage.setItem(KEYS.TODAY_EARNED, '0')
  }
}

export function getTotalPoints() {
  return parseInt(localStorage.getItem(KEYS.POINTS) || '0', 10)
}

export function getTodayEarned() {
  resetDailyIfNeeded()
  return parseInt(localStorage.getItem(KEYS.TODAY_EARNED) || '0', 10)
}

export function canEarnToday() {
  return getTodayEarned() < DAILY_MAX
}

export function awardWin() {
  if (!canEarnToday()) return 0
  const newTotal = getTotalPoints() + PER_WIN
  const newToday = getTodayEarned() + PER_WIN
  localStorage.setItem(KEYS.POINTS, String(newTotal))
  localStorage.setItem(KEYS.TODAY_EARNED, String(newToday))
  return PER_WIN
}

export function canWithdraw() {
  return getTotalPoints() >= WITHDRAW_MIN
}

// 실제 출금 API 연동 시 호출 — 현재는 미사용 (mock 출금)
export function subtractPoints(amount) {
  const newTotal = Math.max(0, getTotalPoints() - amount)
  localStorage.setItem(KEYS.POINTS, String(newTotal))
}

export function getTodayStage() {
  return Math.min(Math.floor(getTodayEarned() / PER_WIN) + 1, 3)
}
