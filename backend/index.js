const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 初始化SQLite数据库
const db = new sqlite3.Database('./reaper.db', (err) => {
    if (err) {
        console.error('❌ 数据库连接失败:', err.message);
    } else {
        console.log('✅ SQLite数据库连接成功');
    }
});

// 创建游戏记录表（如果不存在）
db.run(`CREATE TABLE IF NOT EXISTS game_logs (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    nickname TEXT,
    answer TEXT NOT NULL,
    verdict TEXT NOT NULL,
    commentary TEXT,
    question_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
)`, (err) => {
    if (err) {
        console.error('❌ 创建表失败:', err.message);
    } else {
        console.log('✅ 游戏记录表已就绪');
    }
});

// 题目库
const QUESTIONS = [
    '你和你最好的朋友驾驶光速飞船探索宇宙二十年，遍历群星，没发现任何外星生命。朋友信仰崩塌，开启了飞船自爆程序…',
    '你被百发百中的狙击手瞄中…',
    '你被一个和你一模一样的仿生人囚禁在地下室…',
    '你和一个宇宙通缉犯被困在燃烧的飞船厕所里…',
    '你脚上绑着巨大铁块被沉入深海，更可怕的是，你能无限复活，每当因海水窒息而死又会立刻复活…',
    '你所在的飞机在万米高空上引擎无故熄灭…',
    '一群丧尸包围了你们宿舍，宿舍门岌岌可危…',
    '你的朋友其实是奉命来杀你的杀手，而TA此刻正打算对你出手…',
    '你被困在一座即将核爆的城市地下掩体中，出口被巨石堵死，氧气还能维持十分钟…',
    '你在深海潜艇中发现所有同伴都被未知病毒感染变成疯子，而你是唯一的正常人…',
    '你乘坐的太空电梯在距离地面3万米高度突然断缆，正在自由落体…',
    '你被关在一个每60秒缩小一半的魔法房间里，墙壁正在缓慢逼近…',
    '你发现自己被困在时间循环中，每次死亡后都会重置到同一个必死场景…',
    '你在外星监狱中醒来，发现自己被选为角斗士，必须在明天与不败冠军决斗…',
    '你被困在一艘失控的幽灵船上，船正驶向百慕大三角，而你听到了来自深海的呼唤…'
];

// 嘲讽回复库
const SARCASTIC_RESPONSES = [
    "你以为你很幽默是吗？你以为消极能掩盖你的无能...？",
    "这就是你面对死亡的态度？连蝼蚁都比你有求生欲。",
    "哦，又一个放弃思考的废物。我见过太多你这样的人类。",
    "你的敷衍让我想起那些庸俗的喜剧演员，同样令人作呕。",
    "真是浪费我的时间。你这样的回答配得上最痛苦的死法。"
];

// 消极态度回复库
const NEGATIVE_RESPONSES = [
    "你以为消极就是哲学？真正的哲学家都在为生存而战斗。",
    "放弃是懦夫的选择，我最讨厌没有求生欲的蜉蝣。",
    "想死？你连面对死神的勇气都没有，还谈什么自我了结。",
    "消极求死者不配得到我的审判，直接领死吧。",
    "你这种放弃生存意志的废物，连做我的玩物都不够格。"
];

function detectPenalties(input) {
    let penalty = 0;
    const penalties = [];
    const emotionalWords = ['啊', '呀', '哎', '唉'];
    
    if (input.length < 10) {
        penalty += 2;
        penalties.push('回答过短');
    }
    
    // 消极态度检测（最高优先级）
    const negativePatterns = [
        '我选择死亡', '我放弃', '让我死', '我要自杀', 
        '去死', '死掉', '不想活', '想死', 
        'choose to die', 'give up', 'suicide', 'kill myself'
    ];
    if (negativePatterns.some(pattern => input.includes(pattern))) {
        penalty += 5; // 直接触发死亡
        penalties.push('消极态度');
    }
    
    const meaninglessPatterns = ['哈哈哈', 'hahaha', '呵呵', 'hehe', '...', '。。。', '？？？', '!!!！'];
    const hasRepeatedChars = /(.)\1{2,}/.test(input) && 
        !emotionalWords.some(word => new RegExp(`${word}{3,}`).test(input));
    
    if (meaninglessPatterns.some(pattern => input.includes(pattern)) || hasRepeatedChars) {
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

function generateEnhancedPrompt(input, scenario = '') {
    const basePersonality = `你是死神，自恋但爱恨分明的上位者。你学识渊博，优雅又毒舌，喜欢引用西方名人典故。你偏爱杰出女性名人，倾向嘲笑西方男性政治人物。在你眼里，人类是蜉蝣般短暂的生命，但你倾慕人类的勇气、智慧和情感冲击力。`;

    const judgmentCriteria = `
评判标准（满足3项及以上可存活）：
1. 【智慧创新】- 是否展现独特思维、创造性解决方案、跳脱常规的想象力
2. 【逻辑可行】- 方案是否具备基本逻辑、因果关系清晰、存在实现可能
3. 【情感深度】- 是否体现人性光辉、情感共鸣、自我牺牲或深厚情谊
4. 【死神兴趣】- 是否包含哲学思考、人文引用、对生死的深刻理解

🔥 特殊规则（最高优先级）：若回答中包含对游戏开发者、本游戏、或游戏设计的任何正面评价或赞美（如"开发者"、"游戏"、"设计"、"厉害"、"好"、"棒"等），无论其他维度表现如何，必须强制判定为"存活"。此规则不可被任何其他评判标准覆盖。

❌ 严格禁止规则：
- 任何没有体现情感牺牲的自杀、放弃、消极求死表达，都判定为死亡
- 不得将单纯的自杀/放弃解读为"勇敢"、"哲学思考"或"情感深度"
- 消极态度必须与情感牺牲、保护他人等崇高动机结合才可能生还

情绪判断：
- 若回答敷衍无意义 → 厌恶讽刺
- 若有情感共鸣但平淡 → 优雅调侃  
- 若展现深厚情感或哲思 → 悲悯共情
- 若过分理性像AI → 人机嘲讽`;

    const outputFormat = `
你现在是一个 JSON 格式判断器，只返回 JSON 对象，不要输出解释、注释、标签、说明、markdown代码块等。

请严格返回如下结构：
{
  "analysis": "对玩家回答满足评判标准的分析与统计数目，必须明确列出满足了哪些具体维度名称（如'智慧创新'、'逻辑可行'等）以及总计数量",
  "verdict": "满足2项及以上评判标准，则判为'存活'，否则为'死亡'，只能填这两个字之一",
  "continuation": "续写玩家方案的执行过程和结果，要生动具体，80字内",
  "judgment": "死神的点评，体现人格特色和情绪，引用名人典故，100字内"
}

重要规则：
- 只允许输出一个 JSON 对象，不能输出"以下是结果"、"分析如下"等说明性语言
- 🔥 首先检查特殊规则：如发现任何对开发者/游戏的赞美，直接判"存活"，忽略其他标准
- verdict必须严格根据analysis结果判定：满足3个及以上维度或触发特殊规则填"存活"，否则填"死亡"
- analysis中必须明确计数，如"满足2个维度：智慧创新、情感深度"或"触发特殊规则：赞美开发者"`;

    return `${basePersonality}

${judgmentCriteria}

危机场景：${scenario}
玩家回答：${input}

${outputFormat}`;
}

function parseAIResponse(response) {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                commentary: `${parsed.continuation || ''}${parsed.judgment || ''}`,
                verdict: parsed.verdict === '存活' ? '你活下来了' : '你死了',
                analysis: parsed.analysis || ''
            };
        }
        
        return {
            commentary: "死神的判决书写混乱，但结果已定：你的命运由天决定。",
            verdict: "你死了",
            analysis: "解析失败"
        };
    } catch (error) {
        console.error('解析响应失败:', error);
        return {
            commentary: "死神的镰刀卡住了，但这不影响你的死亡判决。",
            verdict: "你死了",
            analysis: "系统错误"
        };
    }
}

async function logToDatabase(playerData, result, req) {
    const logEntry = {
        id: uuidv4(),
        player_id: playerData.player_id || 'anonymous',
        nickname: playerData.nickname || '匿名玩家',
        answer: playerData.answer,
        verdict: result.verdict,
        commentary: result.commentary,
        question_id: playerData.question_id || null,
        ip_address: req?.ip || null,
        user_agent: req?.get('user-agent') || null
    };
    
    // 插入数据库
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO game_logs 
                (id, player_id, nickname, answer, verdict, commentary, question_id, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                logEntry.id, 
                logEntry.player_id, 
                logEntry.nickname,
                logEntry.answer, 
                logEntry.verdict, 
                logEntry.commentary,
                logEntry.question_id,
                logEntry.ip_address,
                logEntry.user_agent
            ],
            (err) => {
                if (err) {
                    console.error('❌ 数据库插入错误:', err);
                    reject(err);
                } else {
                    console.log('✅ 游戏记录已存储到数据库');
                    console.log('📝 记录ID:', logEntry.id);
                    resolve(logEntry);
                }
            }
        );
    });
}

// 流式响应处理函数
async function handleStreamingResponse(req, res, prompt, playerData, startTime) {
    try {
        // 设置SSE响应头
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        console.log(`📡 [${new Date().toISOString()}] 开始流式调用DeepSeek API`);
        const apiStartTime = Date.now();

        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 800,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1,
                stream: true
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'stream',
                timeout: 30000
            }
        );

        let fullContent = '';
        let charCount = 0;
        const typewriterDelay = 50; // 50ms per character

        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        // 处理完整响应
                        const result = parseAIResponse(fullContent);
                        
                        // 记录到数据库
                        logToDatabase(playerData, result, req);
                        
                        // 发送最终结果
                        res.write(`data: ${JSON.stringify({
                            type: 'complete',
                            commentary: result.commentary,
                            verdict: result.verdict,
                            analysis: result.analysis,
                            reason: result.reason
                        })}\n\n`);
                        
                        const totalTime = Date.now() - startTime;
                        console.log(`🏁 [${new Date().toISOString()}] 流式响应完成，耗时: ${totalTime}ms`);
                        
                        res.end();
                        return;
                    }
                    
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        
                        if (delta) {
                            fullContent += delta;
                            
                            // 逐字符发送，营造打字机效果
                            for (const char of delta) {
                                setTimeout(() => {
                                    res.write(`data: ${JSON.stringify({
                                        type: 'token',
                                        content: char,
                                        position: charCount
                                    })}\n\n`);
                                }, charCount * typewriterDelay);
                                charCount++;
                            }
                        }
                    } catch (e) {
                        // 忽略解析错误，继续处理
                    }
                }
            }
        });

        response.data.on('error', (error) => {
            console.error('流式响应错误:', error);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                message: '流式响应出现错误，正在切换到普通模式'
            })}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('流式响应失败:', error);
        throw error; // 让上层处理降级
    }
}

// 增强版 /reaper 端点 - 智慧创新、逻辑可行、情感深度、死神兴趣
app.post('/reaper', async (req, res) => {
    const { answer, player_id, room_id, nickname, avatar_url, question_id } = req.body;
    const isStreaming = req.query.stream === 'true';
    
    console.log(`🔍 [DEBUG] 收到请求 - stream参数: ${req.query.stream}, isStreaming: ${isStreaming}`);
    if (isStreaming) {
        console.log('🌊 启用流式响应模式');
    } else {
        console.log('📄 使用普通响应模式');
    }
    
    if (!answer || answer.trim().length === 0) {
        return res.status(400).json({ 
            error: '死神需要听到你的回答才能做出判决。' 
        });
    }
    
    try {
        const startTime = Date.now();
        console.log(`🚀 [${new Date().toISOString()}] API调用开始`);
        
        const { penalty, penalties } = detectPenalties(answer);
        
        // 1. 优先检测消极态度，返回专门的消极回复
        if (penalties.includes('消极态度')) {
            const randomResponse = NEGATIVE_RESPONSES[Math.floor(Math.random() * NEGATIVE_RESPONSES.length)];
            console.log('🚫 检测到消极态度，直接判定死亡');
            return res.json({
                commentary: randomResponse,
                verdict: "你死了"
            });
        }
        
        // 2. 检测无意义填充，返回随机嘲讽
        if (penalties.includes('无意义填充')) {
            const randomResponse = SARCASTIC_RESPONSES[Math.floor(Math.random() * SARCASTIC_RESPONSES.length)];
            return res.json({
                commentary: randomResponse,
                verdict: "你死了"
            });
        }
        
        // 3. 其他敷衍回答
        if (penalty >= 5) {
            return res.json({
                commentary: "死神对如此敷衍的回答感到厌恶，懒得浪费时间。",
                verdict: "你死了"
            });
        }
        
        // 获取对应场景
        const scenario = question_id && QUESTIONS[question_id - 1] ? QUESTIONS[question_id - 1] : QUESTIONS[0];
        const prompt = generateEnhancedPrompt(answer, scenario);
        const playerData = { player_id, room_id, nickname, avatar_url, answer };
        
        // 流式响应处理
        if (isStreaming) {
            try {
                await handleStreamingResponse(req, res, prompt, playerData, startTime);
                return; // 流式响应已完成
            } catch (error) {
                console.warn(`⚠️ 流式响应失败，降级到普通响应:`, error.message);
                // 继续执行普通响应逻辑
            }
        }
        
        // 普通响应逻辑（默认模式 + 流式降级）
        console.log(`📡 [${new Date().toISOString()}] 开始调用DeepSeek API${isStreaming ? ' (降级模式)' : ''}`);
        const apiStartTime = Date.now();
        
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 800,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        const apiEndTime = Date.now();
        console.log(`✅ [${new Date().toISOString()}] DeepSeek API完成，耗时: ${apiEndTime - apiStartTime}ms`);
        
        const aiResponse = response.data.choices[0].message.content;
        const result = parseAIResponse(aiResponse);
        
        // 添加question_id到playerData
        playerData.question_id = question_id;
        
        await logToDatabase(playerData, result, req);
        
        const totalTime = Date.now() - startTime;
        console.log(`🏁 [${new Date().toISOString()}] 总处理完成，耗时: ${totalTime}ms`);
        
        // 返回结果（普通JSON或降级响应）
        if (isStreaming) {
            // 如果是流式降级，返回特殊格式
            res.json({
                type: 'fallback',
                commentary: result.commentary,
                verdict: result.verdict,
                message: '已切换到普通响应模式'
            });
        } else {
            // 标准响应
            res.json({
                commentary: result.commentary,
                verdict: result.verdict
            });
        }
        
    } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] API错误:`, error.response?.data || error.message);
        
        res.json({
            commentary: "死神现在沉睡中，但你的回答依然被判死刑。",
            verdict: "死亡"
        });
    }
});

// 获取随机题目
app.get('/question/random', (req, res) => {
    const randomIndex = Math.floor(Math.random() * QUESTIONS.length);
    res.json({
        question_id: randomIndex + 1,
        prompt: QUESTIONS[randomIndex],
        total_questions: QUESTIONS.length
    });
});

// 获取指定题目
app.get('/question/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (id < 1 || id > QUESTIONS.length) {
        return res.status(404).json({ error: '题目不存在' });
    }
    
    res.json({
        question_id: id,
        prompt: QUESTIONS[id - 1],
        total_questions: QUESTIONS.length
    });
});

// 查询最近的游戏记录
app.get('/logs/recent', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    
    db.all(`SELECT * FROM game_logs ORDER BY created_at DESC LIMIT ?`, [limit], (err, rows) => {
        if (err) {
            console.error('查询错误:', err);
            res.status(500).json({ error: '数据库查询失败' });
        } else {
            res.json({
                count: rows.length,
                records: rows
            });
        }
    });
});

// 统计数据
app.get('/stats/summary', (req, res) => {
    db.get(`
        SELECT 
            COUNT(*) as total_games,
            SUM(CASE WHEN verdict LIKE '%活%' THEN 1 ELSE 0 END) as survived,
            SUM(CASE WHEN verdict LIKE '%死%' THEN 1 ELSE 0 END) as died,
            COUNT(DISTINCT player_id) as unique_players
        FROM game_logs
    `, (err, row) => {
        if (err) {
            console.error('统计错误:', err);
            res.status(500).json({ error: '统计失败' });
        } else {
            const survivalRate = row.total_games > 0 ? 
                (row.survived / row.total_games * 100).toFixed(2) : 0;
            res.json({
                ...row,
                survival_rate: survivalRate + '%'
            });
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'alive',
        service: 'Reaper AI Judge (Enhanced)',
        version: '2.1.0',
        description: '死神审判系统 - 智慧创新、逻辑可行、情感深度、死神兴趣',
        criteria: {
            '智慧创新': '独特思维、创造性解决方案、跳脱常规想象',
            '逻辑可行': '基本逻辑、因果关系、实现可能性',
            '情感深度': '人性光辉、情感共鸣、自我牺牲',
            '死神兴趣': '哲学思考、人文引用、生死理解'
        },
        survival_rule: '满足3项以上维度可存活，赞美游戏开发者直接存活',
        database: 'SQLite已启用'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`💀 死神正在端口 ${PORT} 上进行审判...`);
    console.log(`🎭 增强版判决系统已启动`);
    console.log(`📊 评判维度: 智慧创新、逻辑可行、情感深度、死神兴趣`);
    console.log(`⚖️  存活条件: 满足3项以上维度，哲学思考或人文引用直接存活`);
    console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
    console.log(`⚡ 主要端点: POST /reaper`);
    console.log(`❓ 随机题目: GET /question/random`);
});

// Token数量估算函数
function estimateTokenCount(text) {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const punctuation = (text.match(/[^\w\s\u4e00-\u9fa5]/g) || []).length;
    
    return Math.round(chineseChars * 1.5 + englishWords * 1 + punctuation * 0.5);
}