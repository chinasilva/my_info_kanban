-- ============================================================
-- Supabase RLS (Row Level Security) 策略脚本
-- ============================================================

-- 启用 RLS (使用 IF NOT EXISTS 避免重复执行报错)
ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Source" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "UserSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Signal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "UserSignal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Insight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AICache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AgentApiKey" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- User: 用户只能访问自己的数据
-- ============================================================

-- 允许所有用户读取（用于登录等场景），实际权限在 API 层控制
CREATE POLICY "Users can read all" ON "User"
  FOR SELECT USING (true);

-- 允许创建新用户
CREATE POLICY "Users can create" ON "User"
  FOR INSERT WITH CHECK (true);

-- 用户只能更新自己的数据 (cast to text for comparison)
CREATE POLICY "Users can update own" ON "User"
  FOR UPDATE USING (auth.uid()::text = id);

-- 禁止删除用户（通过 API）
CREATE POLICY "Users cannot delete" ON "User"
  FOR DELETE USING (false);


-- ============================================================
-- Account: 完全禁用 PostgREST 访问
-- ============================================================

-- 禁用所有操作，通过 NextAuth 服务端访问
CREATE POLICY "Block all access to Account" ON "Account"
  FOR ALL USING (false);


-- ============================================================
-- Session: 完全禁用 PostgREST 访问
-- ============================================================

CREATE POLICY "Block all access to Session" ON "Session"
  FOR ALL USING (false);


-- ============================================================
-- VerificationToken: 完全禁用 PostgREST 访问
-- ============================================================

CREATE POLICY "Block all access to VerificationToken" ON "VerificationToken"
  FOR ALL USING (false);


-- ============================================================
-- Source: 公开可读，内置数据不可修改
-- ============================================================

-- 所有人都可以查看数据源
CREATE POLICY "Sources are public readable" ON "Source"
  FOR SELECT USING (true);

-- 禁止插入新数据源（通过 API）
CREATE POLICY "Block insert to Source" ON "Source"
  FOR INSERT WITH CHECK (false);

-- 禁止更新（通过 API）
CREATE POLICY "Block update to Source" ON "Source"
  FOR UPDATE USING (false);

-- 禁止删除（通过 API）
CREATE POLICY "Block delete to Source" ON "Source"
  FOR DELETE USING (false);


-- ============================================================
-- UserSource: 用户只能管理自己的订阅
-- ============================================================

-- 用户可以查看自己的订阅
CREATE POLICY "UserSources are readable by owner" ON "UserSource"
  FOR SELECT USING (auth.uid()::text = "userId");

-- 用户可以添加订阅
CREATE POLICY "UserSources can insert" ON "UserSource"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- 用户可以更新自己的订阅
CREATE POLICY "UserSources can update by owner" ON "UserSource"
  FOR UPDATE USING (auth.uid()::text = "userId");

-- 用户可以删除自己的订阅
CREATE POLICY "UserSources can delete by owner" ON "UserSource"
  FOR DELETE USING (auth.uid()::text = "userId");


-- ============================================================
-- Signal: 公开可读
-- ============================================================

-- 所有人都可以查看信号
CREATE POLICY "Signals are public readable" ON "Signal"
  FOR SELECT USING (true);

-- 禁止插入（通过 API）
CREATE POLICY "Block insert to Signal" ON "Signal"
  FOR INSERT WITH CHECK (false);

-- 禁止更新（通过 API）
CREATE POLICY "Block update to Signal" ON "Signal"
  FOR UPDATE USING (false);

-- 禁止删除（通过 API）
CREATE POLICY "Block delete to Signal" ON "Signal"
  FOR DELETE USING (false);


-- ============================================================
-- UserSignal: 用户只能管理自己的信号状态
-- ============================================================

-- 用户可以查看自己的信号状态
CREATE POLICY "UserSignals are readable by owner" ON "UserSignal"
  FOR SELECT USING (auth.uid()::text = "userId");

-- 用户可以标记已读/收藏
CREATE POLICY "UserSignals can insert by owner" ON "UserSignal"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- 用户可以更新自己的状态
CREATE POLICY "UserSignals can update by owner" ON "UserSignal"
  FOR UPDATE USING (auth.uid()::text = "userId");

-- 用户可以移除自己的状态
CREATE POLICY "UserSignals can delete by owner" ON "UserSignal"
  FOR DELETE USING (auth.uid()::text = "userId");


-- ============================================================
-- Insight: 公开可读
-- ============================================================

-- 所有人都可以查看洞察
CREATE POLICY "Insights are public readable" ON "Insight"
  FOR SELECT USING (true);

-- 禁止插入（通过 API）
CREATE POLICY "Block insert to Insight" ON "Insight"
  FOR INSERT WITH CHECK (false);

-- 禁止更新（通过 API）
CREATE POLICY "Block update to Insight" ON "Insight"
  FOR UPDATE USING (false);

-- 禁止删除（通过 API）
CREATE POLICY "Block delete to Insight" ON "Insight"
  FOR DELETE USING (false);


-- ============================================================
-- AICache: 公开读写（缓存数据）
-- ============================================================

-- 所有人都可以读取缓存
CREATE POLICY "AICache is public readable" ON "AICache"
  FOR SELECT USING (true);

-- 所有人都可以写入缓存
CREATE POLICY "AICache is public insertable" ON "AICache"
  FOR INSERT WITH CHECK (true);

-- 所有人都可以更新缓存
CREATE POLICY "AICache is public updatable" ON "AICache"
  FOR UPDATE USING (true);

-- 禁止删除
CREATE POLICY "Block delete to AICache" ON "AICache"
  FOR DELETE USING (false);


-- ============================================================
-- AgentApiKey: 用户只能管理自己的 API 密钥
-- ============================================================

-- 用户可以查看自己的 API 密钥
CREATE POLICY "AgentApiKeys are readable by owner" ON "AgentApiKey"
  FOR SELECT USING (auth.uid()::text = "userId");

-- 用户可以创建自己的 API 密钥
CREATE POLICY "AgentApiKeys can insert by owner" ON "AgentApiKey"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- 用户可以更新自己的 API 密钥
CREATE POLICY "AgentApiKeys can update by owner" ON "AgentApiKey"
  FOR UPDATE USING (auth.uid()::text = "userId");

-- 用户可以删除自己的 API 密钥
CREATE POLICY "AgentApiKeys can delete by owner" ON "AgentApiKey"
  FOR DELETE USING (auth.uid()::text = "userId");


-- ============================================================
-- 创建索引优化
-- ============================================================

-- RLS 策略常用到的字段索引
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User" ("email");
CREATE INDEX IF NOT EXISTS "idx_usersource_userid" ON "UserSource" ("userId");
CREATE INDEX IF NOT EXISTS "idx_usersignal_userid" ON "UserSignal" ("userId");
CREATE INDEX IF NOT EXISTS "idx_agentapikey_userid" ON "AgentApiKey" ("userId");
CREATE INDEX IF NOT EXISTS "idx_agentapikey_key" ON "AgentApiKey" ("key");
