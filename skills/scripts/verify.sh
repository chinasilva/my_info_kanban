#!/bin/bash
# Skill: debugging-guide
# Purpose: 标准化验证脚本，用于 Bug 修复后的闭环验证

set -e

echo "🔍 [1/3] Running TypeScript check..."
npx tsc --noEmit
echo "✅ TypeScript check passed."

echo ""
echo "🏗️  [2/3] Running production build..."
npm run build
echo "✅ Build succeeded."

echo ""
echo "🎉 All verifications passed!"
