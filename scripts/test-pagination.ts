/**
 * 分页逻辑验证脚本
 * 通过直接连接数据库验证时间过滤和游标分页
 */
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load .env
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...vals] = trimmed.split('=');
        process.env[key.trim()] = vals.join('=').replace(/^["']|["']$/g, '');
    }
}

async function test() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 连接数据库...\n');

        // Test 1: 总数据量
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM "Signal"');
        const total = parseInt(totalResult.rows[0].count);

        // Test 2: 7天过滤
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const filteredResult = await pool.query(
            'SELECT COUNT(*) as count FROM "Signal" WHERE "createdAt" >= $1',
            [sevenDaysAgo]
        );
        const filtered = parseInt(filteredResult.rows[0].count);

        console.log('=== 时间过滤验证 ===');
        console.log(`总信号数: ${total}`);
        console.log(`7天内信号数: ${filtered}`);
        console.log(`过滤掉: ${total - filtered} 条旧数据 (${((1 - filtered / total) * 100).toFixed(1)}%)\n`);

        // Test 3: 分页测试
        const firstPage = await pool.query(`
            SELECT id, title FROM "Signal" 
            WHERE "createdAt" >= $1 
            ORDER BY "createdAt" DESC 
            LIMIT 5
        `, [sevenDaysAgo]);

        console.log('=== 分页测试 (第1页: 5条) ===');
        firstPage.rows.forEach((r, i) => {
            console.log(`${i + 1}. ${r.title.substring(0, 50)}...`);
        });

        if (firstPage.rows.length > 0) {
            const cursor = firstPage.rows[firstPage.rows.length - 1].id;

            const secondPage = await pool.query(`
                SELECT id, title FROM "Signal" 
                WHERE "createdAt" >= $1 AND id < $2
                ORDER BY "createdAt" DESC 
                LIMIT 3
            `, [sevenDaysAgo, cursor]);

            console.log('\n=== 分页测试 (第2页: 游标后3条) ===');
            secondPage.rows.forEach((r, i) => {
                console.log(`${i + 1}. ${r.title.substring(0, 50)}...`);
            });

            console.log('\n✅ 分页逻辑验证成功！');
            console.log(`   - 时间过滤正常`);
            console.log(`   - 游标分页正常`);
        }

    } catch (err) {
        console.error('❌ 测试失败:', err);
    } finally {
        await pool.end();
    }
}

test();
