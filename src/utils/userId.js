const KEY = '3bottle_device_id'

export function getUserId() {
  // TODO: @apps-in-toss/web-framework에서 유저 키 API 확인 후 1순위로 교체
  if (window.__APPS_IN_TOSS__?.userKey) return window.__APPS_IN_TOSS__.userKey

  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
