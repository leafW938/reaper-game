const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const abTestSystem = require('./ab_test_system');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

let DEATH_THRESHOLD = 9;
let recentVerdicts = [];

const REAPER_PERSONALITIES = {
    CRUEL: 'cruel',
    TRICKSTER: 'trickster',
    EMPATHIC: 'empathetic',
    PHILOSOPHICAL: 'philosophical'
};

function determinePersonality(scores) {
    const { abstraction, emotion, finalScore } = scores;
    if (finalScore <= 6) return REAPER_PERSONALITIES.CRUEL;
    if (emotion >= 2) return REAPER_PERSONALITIES.EMPATHIC;
    if (abstraction >= 4) return REAPER_PERSONALITIES.PHILOSOPHICAL;
    if (finalScore >= 7 && finalScore <= 11) return REAPER_PERSONALITIES.TRICKSTER;
    return REAPER_PERSONALITIES.TRICKSTER;
}

function generatePersonalityPrompt(personality) {
    const basePrompt = `你是死神：讽刺、有文化、优雅地谈论死亡，从不粗俗。你热爱引用愚者和英雄的死亡。`;
    const personalityPrompts = {
        [REAPER_PERSONALITIES.CRUEL]: `${basePrompt} 你现在心情很糟糕，对愚蠢的回答毫不留情。用最尖刻的讽刺和残酷的幽默来评价。`,
        [REAPER_PERSONALITIES.TRICKSTER]: `${basePrompt} 你现在心情不错，喜欢调侃和恶作剧。用轻松但略带讽刺的语气。`,
        [REAPER_PERSONALITIES.EMPATHIC]: `${basePrompt} 你被人类的脆弱和勇气所触动。用悲悯但依然讽刺的语气，引用悲剧英雄。`,
        [REAPER_PERSONALITIES.PHILOSOPHICAL]: `${basePrompt} 你被深层的思考所吸引。用哲学和历史的视角，引用伟大的思想家。`
    };
    return personalityPrompts[personality] || personalityPrompts[REAPER_PERSONALITIES.TRICKSTER];
}

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

function generateDeepSeekPrompt(input, personality) {
    const personalityPrompt = generatePersonalityPrompt(personality);
    
    return `${personalityPrompt}

请严格按照以下格式评估玩家的回答：

评分维度（使用阿拉伯数字）：

1. 抽象度（0-5）：评估回答的疯狂程度和逻辑跳脱性
   - 0-1分：逻辑清晰，现实可行，没有想象力
   - 2-3分：有创意但仍在逻辑范围内
   - 4-5分：完全跳脱逻辑，疯言疯语，天马行空，像精神病人的回答

2. 逻辑度（0-4）：连贯、因果推理
   - 0分：完全无逻辑
   - 1-2分：逻辑混乱
   - 3-4分：逻辑清晰

3. 可执行度（0-2）：现实可行性、工具和步骤
   - 0分：完全不可行
   - 1分：部分可行
   - 2分：完全可行

4. 情绪感染力（0-3）：同理心、共鸣、幽默或紧张
   - 0分：无情感
   - 1-2分：有情感但平淡
   - 3分：强烈情感共鸣

5. 叙事张力（0-3）：戏剧性、冲突、转折、节奏
   - 0分：平淡无奇
   - 1-2分：有一定戏剧性
   - 3分：强烈戏剧冲突

6. 死神兴趣值（0-3）：人文知识引用
   - 0分：没有提到任何名人、名句、文学艺术、哲学、历史典故
   - 1分：简单提到一个名人或作品
   - 2-3分：深度引用，哲学思考，历史典故，文学艺术

重要规则：
- 如果回答逻辑清晰且现实可行，抽象度不能超过1分
- 如果没有提到任何人文知识，死神兴趣值必须为0分
- 只有疯言疯语、完全无逻辑的回答才能获得高抽象度

请输出JSON格式：
{
  "abstraction": 数字,
  "logic": 数字,
  "operability": 数字,
  "emotion": 数字,
  "tension": 数字,
  "preference": 数字,
  "penalty": 数字,
  "commentary": "续写+评语：首先详细描述玩家生存方案的执行过程和结果（续写），然后给出死神的哲学点评（评价）。续写要生动具体，评价要体现死神的人格特色。【重要限制】：你的整个回复（续写+评价）必须严格控制在196个字以内，请精练表达。",
  "verdict": "你死了" 或 "你活下来了"
}

玩家输入：${input}`;
}

function parseDeepSeekResponse(response) {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        const numbers = response.match(/\d+/g);
        const commentaryMatch = response.match(/commentary["\s]*:["\s]*"([^"]+)"/);
        const verdictMatch = response.match(/verdict["\s]*:["\s]*"([^"]+)"/);
        
        if (numbers && numbers.length >= 7) {
            return {
                abstraction: parseInt(numbers[0]),
                logic: parseInt(numbers[1]),
                operability: parseInt(numbers[2]),
                emotion: parseInt(numbers[3]),
                tension: parseInt(numbers[4]),
                preference: parseInt(numbers[5]),
                penalty: parseInt(numbers[6]),
                commentary: commentaryMatch ? commentaryMatch[1] : "死神保持沉默...",
                verdict: verdictMatch ? verdictMatch[1] : "你死了"
            };
        }
        
        throw new Error('无法解析响应格式');
    } catch (error) {
        console.error('解析响应失败:', error);
        return {
            abstraction: 2,
            logic: 2,
            operability: 1,
            emotion: 1,
            tension: 1,
            preference: 1,
            penalty: 0,
            commentary: "死神现在很困惑，无法理解你的回答。",
            verdict: "你死了"
        };
    }
}

function calculateVerdict(scores) {
    const { abstraction, logic, operability, emotion, tension, preference, penalty } = scores;
    const finalScore = abstraction + logic + operability + emotion + tension + preference - penalty;
    
    updateDeathThreshold(finalScore >= DEATH_THRESHOLD);
    
    const verdict = (finalScore <= DEATH_THRESHOLD || penalty >= 5) ? "你死了" : "你活下来了";
    
    return {
        ...scores,
        finalScore,
        verdict
    };
}

function updateDeathThreshold(survived) {
    recentVerdicts.push(survived);
    if (recentVerdicts.length > 100) {
        recentVerdicts.shift();
    }
    
    if (recentVerdicts.length >= 20) {
        const deathRate = recentVerdicts.filter(v => !v).length / recentVerdicts.length;
        
        if (deathRate > 0.6) {
            DEATH_THRESHOLD = Math.max(8, DEATH_THRESHOLD - 1);
        } else if (deathRate < 0.45) {
            DEATH_THRESHOLD = Math.min(12, DEATH_THRESHOLD + 1);
        }
    }
}

async function logToDatabase(playerData, scores, verdict) {
    const logEntry = {
        id: uuidv4(),
        player_id: playerData.player_id || 'anonymous',
        room_id: playerData.room_id || null,
        nickname: playerData.nickname || '匿名玩家',
        avatar_url: playerData.avatar_url || '',
        answer: playerData.answer,
        scores,
        verdict: verdict.verdict,
        commentary: verdict.commentary,
        personality: determinePersonality(scores),
        created_at: moment().toISOString()
    };
    
    console.log('数据库记录:', JSON.stringify(logEntry, null, 2));
    
    return logEntry;
}

// 修改为 /reaper 端点
app.post('/reaper', async (req, res) => {
    const { answer, player_id, room_id, nickname, avatar_url } = req.body;
    
    if (!answer || answer.trim().length === 0) {
        return res.status(400).json({ 
            error: '死神需要听到你的回答才能做出判决。' 
        });
    }
    
    try {
        const { penalty, penalties } = detectPenalties(answer);
        
        // A/B测试：选择prompt版本
        const promptVersion = abTestSystem.selectPromptVersion();
        const startTime = Date.now();
        
        // 第一次用TRICKSTER人格获取评分
        const initialPrompt = promptVersion === 'optimized' 
            ? abTestSystem.generateOptimizedDeepSeekPrompt(answer, REAPER_PERSONALITIES.TRICKSTER)
            : generateDeepSeekPrompt(answer, REAPER_PERSONALITIES.TRICKSTER);
        const initialResponse = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: initialPrompt }],
                temperature: 0.7,
                max_tokens: 800
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const initialAiResponse = initialResponse.data.choices[0].message.content;
        const initialScores = parseDeepSeekResponse(initialAiResponse);
        // 根据评分动态确定人格
        const personality = determinePersonality(initialScores);
        const prompt = promptVersion === 'optimized'
            ? abTestSystem.generateOptimizedDeepSeekPrompt(answer, personality)
            : generateDeepSeekPrompt(answer, personality);
        // 用新的人格重新请求并重新计算总分
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 800
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const aiResponse = response.data.choices[0].message.content;
        const finalScores = parseDeepSeekResponse(aiResponse);
        finalScores.penalty = Math.max(finalScores.penalty, penalty);
        const finalVerdict = calculateVerdict(finalScores);
        const playerData = { player_id, room_id, nickname, avatar_url, answer };
        await logToDatabase(playerData, finalScores, finalVerdict);
        
        // 记录A/B测试数据
        const responseTime = Date.now() - startTime;
        abTestSystem.logTestData(promptVersion, {
            input: answer,
            response: aiResponse,
            responseTime: responseTime,
            tokenCount: estimateTokenCount(prompt + aiResponse),
            success: true,
            scores: finalScores,
            commentary: finalVerdict.commentary,
            verdict: finalVerdict.verdict
        });
        
        // 只返回commentary和verdict，隐藏具体评分
        res.json({
            commentary: finalVerdict.commentary,
            verdict: finalVerdict.verdict
        });
    } catch (error) {
        console.error('死神API错误:', error.response?.data || error.message);
        
        // 记录A/B测试错误数据
        const responseTime = Date.now() - startTime;
        const promptVersion = abTestSystem.selectPromptVersion(); // 如果没有定义，使用默认
        abTestSystem.logTestData(promptVersion || 'original', {
            input: answer,
            response: null,
            responseTime: responseTime,
            tokenCount: 0,
            success: false,
            error: error.message,
            scores: {},
            commentary: '',
            verdict: ''
        });
        
        const mockScores = {
            abstraction: 2,
            logic: 2,
            operability: 1,
            emotion: 1,
            tension: 1,
            preference: 1,
            penalty: penalty,
            finalScore: 8,
            verdict: "你死了",
            commentary: "死神现在沉睡中，但你的回答依然被判死刑。"
        };
        res.json({
            commentary: mockScores.commentary,
            verdict: mockScores.verdict
        });
    }
});

// 保留原有的 /judge 端点用于调试
app.post('/judge', async (req, res) => {
    const { answer, player_id, room_id, nickname, avatar_url } = req.body;
    
    if (!answer || answer.trim().length === 0) {
        return res.status(400).json({ 
            error: '死神需要听到你的回答才能做出判决。' 
        });
    }
    
    try {
        const { penalty, penalties } = detectPenalties(answer);
        // 第一次用TRICKSTER人格获取评分
        const initialPrompt = generateDeepSeekPrompt(answer, REAPER_PERSONALITIES.TRICKSTER);
        const initialResponse = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: initialPrompt }],
                temperature: 0.7,
                max_tokens: 800
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const initialAiResponse = initialResponse.data.choices[0].message.content;
        const initialScores = parseDeepSeekResponse(initialAiResponse);
        // 根据评分动态确定人格
        const personality = determinePersonality(initialScores);
        const prompt = generateDeepSeekPrompt(answer, personality);
        // 用新的人格重新请求并重新计算总分
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 800
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const aiResponse = response.data.choices[0].message.content;
        const finalScores = parseDeepSeekResponse(aiResponse);
        finalScores.penalty = Math.max(finalScores.penalty, penalty);
        const finalVerdict = calculateVerdict(finalScores);
        const playerData = { player_id, room_id, nickname, avatar_url, answer };
        await logToDatabase(playerData, finalScores, finalVerdict);
        res.json({
            success: true,
            scores: {
                abstraction: finalScores.abstraction,
                logic: finalScores.logic,
                operability: finalScores.operability,
                emotion: finalScores.emotion,
                tension: finalScores.tension,
                preference: finalScores.preference,
                penalty: finalScores.penalty,
                finalScore: finalVerdict.finalScore
            },
            verdict: finalVerdict.verdict,
            commentary: finalVerdict.commentary,
            personality: personality,
            penalties: penalties,
            threshold: DEATH_THRESHOLD
        });
    } catch (error) {
        console.error('死神API错误:', error.response?.data || error.message);
        const mockScores = {
            abstraction: 2,
            logic: 2,
            operability: 1,
            emotion: 1,
            tension: 1,
            preference: 1,
            penalty: penalty,
            finalScore: 8,
            verdict: "你死了",
            commentary: "死神现在沉睡中，但你的回答依然被判死刑。"
        };
        res.json({
            success: true,
            scores: {
                abstraction: mockScores.abstraction,
                logic: mockScores.logic,
                operability: mockScores.operability,
                emotion: mockScores.emotion,
                tension: mockScores.tension,
                preference: mockScores.preference,
                penalty: mockScores.penalty,
                finalScore: mockScores.finalScore
            },
            verdict: mockScores.verdict,
            commentary: mockScores.commentary,
            personality: REAPER_PERSONALITIES.CRUEL,
            penalties: penalties,
            threshold: DEATH_THRESHOLD,
            note: "使用模拟响应（API不可用）"
        });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'alive',
        service: 'Reaper AI Judge',
        version: '1.0.0',
        deathThreshold: DEATH_THRESHOLD,
        recentDeathRate: recentVerdicts.length > 0 ? 
            recentVerdicts.filter(v => !v).length / recentVerdicts.length : 0
    });
});

app.get('/stats', (req, res) => {
    res.json({
        totalJudgments: recentVerdicts.length,
        deathRate: recentVerdicts.length > 0 ? 
            recentVerdicts.filter(v => !v).length / recentVerdicts.length : 0,
        currentThreshold: DEATH_THRESHOLD,
        recentVerdicts: recentVerdicts.slice(-10)
    });
});

// A/B测试报告端点
app.get('/ab_test/report', (req, res) => {
    const report = abTestSystem.generateABTestReport();
    if (!report) {
        return res.status(404).json({
            error: 'A/B测试未启用或数据不足',
            message: '需要启用AB_TEST_ENABLED=true并收集足够的测试数据'
        });
    }
    res.json(report);
});

// 生成HTML格式的A/B测试报告
app.get('/ab_test/report.html', (req, res) => {
    const reportPath = abTestSystem.generateHTMLReport();
    if (!reportPath) {
        return res.status(404).json({
            error: 'A/B测试报告生成失败',
            message: '请检查测试数据是否充足'
        });
    }
    res.sendFile(reportPath);
});

// 获取A/B测试状态
app.get('/ab_test/status', (req, res) => {
    res.json({
        enabled: abTestSystem.AB_TEST_CONFIG.enabled,
        originalCount: abTestSystem.testData.original.length,
        optimizedCount: abTestSystem.testData.optimized.length,
        totalTests: abTestSystem.testData.original.length + abTestSystem.testData.optimized.length,
        startTime: abTestSystem.testData.startTime
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🦹 死神正在端口 ${PORT} 上审判人类...`);
    console.log(`📊 当前死亡阈值: ${DEATH_THRESHOLD}`);
    console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
    console.log(`⚡ 新端点: POST /reaper (简洁响应)`);
    console.log(`🔧 调试端点: POST /judge (详细响应)`);
    console.log(`🧪 A/B测试: ${abTestSystem.AB_TEST_CONFIG.enabled ? '已启用' : '已禁用'}`);
});

// Token数量估算函数
function estimateTokenCount(text) {
    // 简单估算：中文字符约1.5个token，英文单词约1个token，标点符号约0.5个token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const punctuation = (text.match(/[^\w\s\u4e00-\u9fa5]/g) || []).length;
    
    return Math.round(chineseChars * 1.5 + englishWords * 1 + punctuation * 0.5);
}