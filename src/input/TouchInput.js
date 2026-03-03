/**
 * TouchInput — 화면 어디든 터치하면 그 방향으로 캐릭터가 이동하는 방식.
 * nippleJS 조이스틱 대체. 외부 라이브러리 없음.
 */
export class TouchInput {
  constructor() {
    this._x = null   // 현재 터치 X (canvas 좌표), null = 터치 없음
    this._y = null
  }

  setPos(x, y) {
    this._x = x
    this._y = y
  }

  clear() {
    this._x = null
    this._y = null
  }

  /**
   * (px, py) = 플레이어 현재 위치
   * 반환값: { x, y } — 플레이어 → 터치 방향의 정규화 벡터 (-1 ~ 1)
   * 터치가 없거나 플레이어와 너무 가까우면 { x:0, y:0 }
   */
  getDirection(px, py) {
    if (this._x === null) return { x: 0, y: 0 }
    const dx = this._x - px
    const dy = this._y - py
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 10) return { x: 0, y: 0 }
    return { x: dx / dist, y: dy / dist }
  }
}
