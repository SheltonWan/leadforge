-- LeadForge migration: 20260524000003
-- Add zbj_credentials columns to user_profiles for automated scraping

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS zbj_username     text,
  ADD COLUMN IF NOT EXISTS zbj_password_enc text;

COMMENT ON COLUMN user_profiles.zbj_username     IS '猪八戒账号用户名（明文）';
COMMENT ON COLUMN user_profiles.zbj_password_enc IS '猪八戒账号密码（AES-256-GCM 加密存储）';
