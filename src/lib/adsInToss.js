// 광고 연동 모듈
// 앱인토스 WebView 환경에서는 실제 AdMob 광고를 표시하고,
// 브라우저(Vercel QA) 환경에서는 2초 대기 Mock으로 동작합니다.
//
// AdMob 실제 연동 시:
// 1. 앱인토스 콘솔 → 수익화 → 구글 AdMob 연결
// 2. AD_UNIT_ID를 발급받은 실제 ID로 교체

const AD_UNIT_ID = 'ait-ad-test-rewarded-id'

function isAppsInTossEnv() {
  return typeof window !== 'undefined' &&
    (window.AppsInToss != null ||
      (window.webkit?.messageHandlers?.appsInToss != null))
}

export async function showRewardedAd() {
  if (isAppsInTossEnv()) {
    try {
      // eslint-disable-next-line no-undef
      await loadAppsInTossAdMob({ adUnitId: AD_UNIT_ID })
      // eslint-disable-next-line no-undef
      const result = await showAppsInTossAdMob({ adUnitId: AD_UNIT_ID })
      return result.rewarded === true
    } catch {
      return false
    }
  } else {
    // 브라우저 개발 환경 Mock: 2초 후 광고 시청 완료
    await new Promise(resolve => setTimeout(resolve, 2000))
    return true
  }
}
