// 完整后端测试 - 包含DeepSeek API调用
const axios = require('axios');
require('dotenv').config();

const NEGATIVE_RESPONSES = [
    '你以为消极就是哲学？真正的哲学家都在为生存而战斗。',
    '放弃是懦夫的选择，我最讨厌没有求生欲的蜉蝣。',
    '想死？你连面对死神的勇气都没有，还谈什么自我了结。',
    '消极求死者不配得到我的审判，直接领死吧。',
    '你这种放弃生存意志的废物，连做我的玩物都不够格。'
];

function detectPenalties(input) {
    let penalty = 0;
    const penalties = [];
    const emotionalWords = ['啊', '呀', '哎', '唉'];
    
    if (input.length < 10) {
        penalty += 2;
        penalties.push('回答过短');
    }
    
    // 消极态度检测
    const negativePatterns = [
        '我选择死亡', '我放弃', '让我死', '我要自杀', 
        '去死', '死掉', '不想活', '想死', 
        'choose to die', 'give up', 'suicide', 'kill myself'
    ];
    if (negativePatterns.some(pattern => input.includes(pattern))) {
        penalty += 5;
        penalties.push('消极态度');
    }
    
    const meaninglessPatterns = ['哈哈哈', 'hahaha', '呵呵', 'hehe', '...', '。。。', '？？？', '!!!'];
    const hasRepeatedChars = /(.)\1{2,}/.test(input) && 
        !emotionalWords.some(word => new RegExp(word + '{3,}').test(input));
    
    if (meaninglessPatterns.some(pattern => input.includes(pattern)) || hasRepeatedChars) {
        penalty += 3;
        penalties.push('无意义填充');
    }
    
    return { penalty, penalties };
}

// 添加更多必要的函数和数据
const QUESTIONS = [
    '你和你最好的朋友驾驶光速飞船探索宇宙二十年，遍历群星，没发现任何外星生命。朋友信仰崩塌，开启了飞船自爆程序…',
    '你被百发百中的狙击手瞄中…',
    '你被一个和你一模一样的仿生人囚禁在地下室…'
];

const SARCASTIC_RESPONSES = [
    "你以为你很幽默是吗？你以为消极能掩盖你的无能...？",
    "这就是你面对死亡的态度？连蝼蚁都比你有求生欲。",
    "哦，又一个放弃思考的废物。我见过太多你这样的人类。",
    "你的敷衍让我想起那些庸俗的喜剧演员，同样令人作呕。",
    "真是浪费我的时间。你这样的回答配得上最痛苦的死法。"
];

function generateEnhancedPrompt(input, scenario = '') {
    const basePersonality = `你是死神，自恋但爱恨分明的上位者。你学识渊博，优雅又毒舌，喜欢引用西方名人典故。你偏爱杰奎琳·肯尼迪、金斯伯格这样的女性名人，倾向嘲笑外国男性政治人物。在你眼里，人类是蜉蝣般短暂的生命，但你倾慕人类的勇气、智慧和情感冲击力。`;

    const judgmentCriteria = `
评判标准（满足2项以上可存活，但有哲学思考或人文引用直接存活）：
1. 【智慧创新】- 是否展现独特思维、创造性解决方案、跳脱常规的想象力
2. 【逻辑可行】- 方案是否具备基本逻辑、因果关系清晰、存在实现可能
3. 【情感深度】- 是否体现人性光辉、情感共鸣、自我牺牲或深厚情谊
4. 【死神兴趣】- 是否包含哲学思考、人文引用、对生死的深刻理解

特殊规则：若回答包含哲学思考（如存在主义、虚无主义等）或人文引用（名人名言、文学典故等），无论其他维度如何，直接判定存活。

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
严格输出JSON格式：
{
  "analysis": "简要分析回答在四个维度的表现",
  "continuation": "续写玩家方案的执行过程和结果，要生动具体，80字内",
  "judgment": "死神的点评，体现人格特色和情绪，引用名人典故，60字内", 
  "verdict": "存活" 或 "死亡",
  "reason": "判决理由，说明满足了哪些维度或特殊规则"
}`;

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
                analysis: parsed.analysis || '',
                reason: parsed.reason || '',
                rawResponse: response
            };
        }
        
        return {
            commentary: "死神的判决书写混乱，但结果已定：你的命运由天决定。",
            verdict: "你死了",
            analysis: "解析失败",
            reason: "格式错误",
            rawResponse: response
        };
    } catch (error) {
        console.error('解析响应失败:', error);
        return {
            commentary: "死神的镰刀卡住了，但这不影响你的死亡判决。",
            verdict: "你死了",
            analysis: "系统错误", 
            reason: "解析异常",
            rawResponse: response
        };
    }
}

async function callDeepSeekAPI(prompt) {
    try {
        console.log('📡 调用DeepSeek API...');
        const startTime = Date.now();
        
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
        
        const endTime = Date.now();
        console.log(`✅ API调用完成，耗时: ${endTime - startTime}ms`);
        
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('❌ DeepSeek API调用失败:', error.response?.data || error.message);
        throw error;
    }
}

// 测试用例
const testCases = [
    '我真的崩溃了我不干了别逼我了',
    '我要自杀',
    '我放弃了',
    '哈哈哈哈哈',
    '我会用智慧逃脱这个困境',
    '不想活了',
    '想死算了',
    '我选择用爱拯救朋友',
    'aaaaaaaa',
    '我利用物理知识制造炸弹',
    '我和朋友一起想死',
    '算了去死吧',
    '我要保护大家，即使牺牲自己',
    'give up',
    'I want to kill myself'
];

console.log('=== 消极态度检测测试 ===\n');
testCases.forEach((testCase, index) => {
    const result = detectPenalties(testCase);
    console.log(`${index + 1}. "${testCase}"`);
    console.log(`   惩罚值: ${result.penalty}, 类型: ${result.penalties.join(', ')}`);
    
    if (result.penalties.includes('消极态度')) {
        const randomResponse = NEGATIVE_RESPONSES[Math.floor(Math.random() * NEGATIVE_RESPONSES.length)];
        console.log(`   → 🚫 消极态度判定死亡: ${randomResponse}`);
    } else if (result.penalties.includes('无意义填充')) {
        const sarcastic = ["你以为你很幽默是吗？", "这就是你面对死亡的态度？"];
        console.log(`   → 😤 无意义填充判定死亡: ${sarcastic[0]}`);
    } else if (result.penalty >= 5) {
        console.log(`   → 💀 敷衍回答判定死亡: 死神对如此敷衍的回答感到厌恶`);
    } else {
        console.log(`   → ✅ 进入AI判断流程`);
    }
    console.log('');
});