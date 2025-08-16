const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

function detectPenalties(input) {
    let penalty = 0;
    const penalties = [];
    
    if (input.length < 10) {
        penalty += 2;
        penalties.push('回答过短');
    }
    
    if (input.includes('我选择死亡') || input.includes('我放弃') || input.includes('让我死') ||
        input.includes('choose to die') || input.includes('give up')) {
        penalty += 3;
        penalties.push('放弃意图');
    }
    
    const meaninglessPatterns = ['哈哈哈', 'hahaha', '呵呵', 'hehe', '...', '。。。', '？？？', '!!!'];
    if (meaninglessPatterns.some(pattern => input.includes(pattern))) {
        penalty += 3;
        penalties.push('无意义填充');
    }
    
    const words = input.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 5 && uniqueWords.size / words.length < 0.6) {
        penalty += 2;
        penalties.push('重复内容');
    }
    
    return { penalty, penalties };
}

function generateDeepSeekPrompt(input) {
    const basePrompt = '你是死神：讽刺、有文化、优雅地谈论死亡，从不粗俗。你热爱引用愚者和英雄的死亡。当人类敷衍你或者给你无意义的输入，你会用最尖刻的讽刺和残酷的幽默来评价。同时，你也喜欢那些充满奇思妙想的答案，但只有奇思妙想的话，你会在续写他们的求生之策时给他们一点幻想，但随即却以冰冷的现实再度戳破。对于那些工整而聪明的答案，你会公正评价他们是否能存活，但不免嘲笑他们过于理智，像个人机。你最被人类回答里的脆弱和勇气所触动，这时你常会引用悲剧英雄，从哲学和心理学的视角进行评价。总归，你是冷酷的，你对人类的生死定夺来自于三个主要维度：智力、天马行空与爱。兼具两项与三项的答案才能获得你的存活认证。死神的判词由续写与评语组成，一共不超过180个字。';

    return `${basePrompt}

玩家的逃生方案：${input}

请直接输出JSON格式：
{
  "commentary": "首先续写玩家逃生方案的执行过程和结果，然后给出你的死神评语。整体不超过180字。",
  "verdict": "存活" 或 "死亡"
}

记住：
- 根据智力、天马行空、爱这三个维度判断
- 兼具两项或三项才能存活
- 续写和判决必须完全一致
- 体现死神的人格特色`;
}

function parseDeepSeekResponse(response) {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                commentary: parsed.commentary || "死神保持沉默...",
                verdict: parsed.verdict || "死亡"
            };
        }
        
        const commentaryMatch = response.match(/commentary["\s]*:["\s]*"([^"]+)"/);
        const verdictMatch = response.match(/verdict["\s]*:["\s]*"([^"]+)"/);
        
        return {
            commentary: commentaryMatch ? commentaryMatch[1] : "死神现在很困惑，无法理解你的回答。",
            verdict: verdictMatch ? verdictMatch[1] : "死亡"
        };
    } catch (error) {
        console.error('解析响应失败:', error);
        return {
            commentary: "死神的镰刀出现了故障，但你依然难逃一死。",
            verdict: "死亡"
        };
    }
}

async function logToDatabase(playerData, result) {
    const logEntry = {
        id: uuidv4(),
        player_id: playerData.player_id || 'anonymous',
        room_id: playerData.room_id || null,
        nickname: playerData.nickname || '匿名玩家',
        avatar_url: playerData.avatar_url || '',
        answer: playerData.answer,
        verdict: result.verdict,
        commentary: result.commentary,
        created_at: moment().toISOString()
    };
    
    console.log('数据库记录:', JSON.stringify(logEntry, null, 2));
    
    return logEntry;
}

// 简化后的 /reaper 端点 - 纯AI判决
app.post('/reaper', async (req, res) => {
    const { answer, player_id, room_id, nickname, avatar_url } = req.body;
    
    if (!answer || answer.trim().length === 0) {
        return res.status(400).json({ 
            error: '死神需要听到你的回答才能做出判决。' 
        });
    }
    
    try {
        const startTime = Date.now();
        console.log(`🚀 [${new Date().toISOString()}] API调用开始`);
        
        const { penalty, penalties } = detectPenalties(answer);
        if (penalty >= 5) {
            return res.json({
                commentary: "死神对如此敷衍的回答感到厌恶，懒得浪费时间。",
                verdict: "死亡"
            });
        }
        
        const prompt = generateDeepSeekPrompt(answer);
        
        console.log(`📡 [${new Date().toISOString()}] 开始调用DeepSeek API`);
        const apiStartTime = Date.now();
        
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 600,
                top_p: 0.8
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );
        
        const apiEndTime = Date.now();
        console.log(`✅ [${new Date().toISOString()}] DeepSeek API完成，耗时: ${apiEndTime - apiStartTime}ms`);
        
        const aiResponse = response.data.choices[0].message.content;
        const result = parseDeepSeekResponse(aiResponse);
        
        const playerData = { player_id, room_id, nickname, avatar_url, answer };
        await logToDatabase(playerData, result);
        
        const totalTime = Date.now() - startTime;
        console.log(`🏁 [${new Date().toISOString()}] 总处理完成，耗时: ${totalTime}ms`);
        
        res.json({
            commentary: result.commentary,
            verdict: result.verdict
        });
        
    } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] API错误:`, error.response?.data || error.message);
        
        res.json({
            commentary: "死神现在沉睡中，但你的回答依然被判死刑。",
            verdict: "死亡"
        });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'alive',
        service: 'Reaper AI Judge (Simplified)',
        version: '2.0.0',
        description: '纯AI判决系统 - 智力、天马行空、爱'
    });
});

app.get('/stats', (req, res) => {
    res.json({
        status: 'simplified',
        version: '2.0.0',
        judgmentCriteria: ['智力', '天马行空', '爱'],
        note: '兼具两项或三项才能存活'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🦹 死神正在端口 ${PORT} 上审判人类... (简化版本)`);
    console.log(`🎭 判决标准: 智力、天马行空、爱 (兼具两项即可存活)`);
    console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
    console.log(`⚡ 简化端点: POST /reaper (纯AI判决)`);
});

// Token数量估算函数
function estimateTokenCount(text) {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const punctuation = (text.match(/[^\w\s\u4e00-\u9fa5]/g) || []).length;
    
    return Math.round(chineseChars * 1.5 + englishWords * 1 + punctuation * 0.5);
}