const axios = require('axios');

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

const SARCASTIC_RESPONSES = [
    "你以为你很幽默是吗？你以为消极能掩盖你的无能...？",
    "这就是你面对死亡的态度？连蝼蚁都比你有求生欲。",
    "哦，又一个放弃思考的废物。我见过太多你这样的人类。",
    "你的敷衍让我想起那些庸俗的喜剧演员，同样令人作呕。",
    "真是浪费我的时间。你这样的回答配得上最痛苦的死法。"
];

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

    const negativePatterns = [
        '我选择死亡', '我放弃', '让我死', '我要自杀',
        '去死', '死掉', '不想活', '想死',
        'choose to die', 'give up', 'suicide', 'kill myself'
    ];
    if (negativePatterns.some(pattern => input.includes(pattern))) {
        penalty += 5;
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

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { answer, player_id, nickname, question_id } = req.body;

    if (!answer || answer.trim().length === 0) {
        return res.status(400).json({
            error: '死神需要听到你的回答才能做出判决。'
        });
    }

    try {
        const { penalty, penalties } = detectPenalties(answer);

        if (penalties.includes('消极态度')) {
            const randomResponse = NEGATIVE_RESPONSES[Math.floor(Math.random() * NEGATIVE_RESPONSES.length)];
            return res.json({ commentary: randomResponse, verdict: "你死了" });
        }

        if (penalties.includes('无意义填充')) {
            const randomResponse = SARCASTIC_RESPONSES[Math.floor(Math.random() * SARCASTIC_RESPONSES.length)];
            return res.json({ commentary: randomResponse, verdict: "你死了" });
        }

        if (penalty >= 5) {
            return res.json({
                commentary: "死神对如此敷衍的回答感到厌恶，懒得浪费时间。",
                verdict: "你死了"
            });
        }

        const scenario = question_id && QUESTIONS[question_id - 1] ? QUESTIONS[question_id - 1] : QUESTIONS[0];
        const prompt = generateEnhancedPrompt(answer, scenario);

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

        const aiResponse = response.data.choices[0].message.content;
        const result = parseAIResponse(aiResponse);

        res.json({
            commentary: result.commentary,
            verdict: result.verdict
        });

    } catch (error) {
        console.error('API错误:', error.response?.data || error.message);
        res.json({
            commentary: "死神现在沉睡中，但你的回答依然被判死刑。",
            verdict: "你死了"
        });
    }
};
