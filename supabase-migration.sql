-- three-bottle-game 교환 어뷰징 방어를 위한 Supabase 스키마 변경
-- 실행 대상: Supabase 프로젝트 zuijoonrqjkvnphuxgou (bd-yoon's Project)
-- 실행 전 spoon-forge-point의 exchange_log 테이블이 존재해야 함

-- 1. app_id 컬럼 추가 (기존 데이터는 'spoon-forge-point'로 기본값)
ALTER TABLE exchange_log ADD COLUMN IF NOT EXISTS app_id TEXT NOT NULL DEFAULT 'spoon-forge-point';

-- 2. 기존 인덱스 교체 → app별 일일 1회 교환 제한 (unique)
DROP INDEX IF EXISTS idx_exchange_user_date;
CREATE UNIQUE INDEX idx_exchange_app_user_date ON exchange_log(app_id, user_key, kst_date);
