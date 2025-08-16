// 完整后端测试 - 包含DeepSeek API调用
const axios = require('axios');
require('dotenv').config();

// 从index.js复制的函数
const QUESTIONS = [
    '你和你最好的朋友驾驶光速飞船探索宇宙二十年，遍历群星，没发现任何外星生命。朋友信仰崩塌，开启了飞船自爆程序…',
    '你被百发百中的狙击手瞄中…',
    '你被一个和你一模一样的仿生人囚禁在地下室…'
];

const NEGATIVE_RESPONSES = [
    "你以为消极就是哲学？真正的哲学家都在为生存而战斗。",
    "放弃是懦夫的选择，我最讨厌没有求生欲的蜉蝣。",
    "想死？你连面对死神的勇气都没有，还谈什么自我了结。",
    "消极态度判定死亡: 消极求死者不配得到我的审判，直接领死吧。",
    "你这种放弃生存意志的废物，连做我的玩物都不够格。"
];

const SARCASTIC_RESPONSES = [
    "你以为你很幽默是吗？你以为消极能掩盖你的无能...？",
    "这就是你面对死亡的态度？连蝼蚁都比你有求生欲。",
    "哦，又一个放弃思考的废物。我见过太多你这样的人类。",
    "你的敷衍让我想起那些庸俗的喜剧演员，同样令人作呕。",
    "真是浪费我的时间。你这样的回答配得上最痛苦的死法。"
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
    
    const meaninglessPatterns = ['哈哈哈', 'hahaha', '呵呵', 'hehe', '...', '。。。', '？？？', '!!!'];
    const hasRepeatedChars = /(.)\\1{2,}/.test(input) && 
        !emotionalWords.some(word => new RegExp(`${word}{3,}`).test(input));
    
    if (meaninglessPatterns.some(pattern => input.includes(pattern)) || hasRepeatedChars) {
        penalty += 3;
        penalties.push('无意义填充');
    }
    
    const words = input.split(/\\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 5 && uniqueWords.size / words.length < 0.6) {
        penalty += 2;
        penalties.push('重复内容');
    }
    
    return { penalty, penalties };
}

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
        const jsonMatch = response.match(/\\{[\\s\\S]*\\}/);
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
    {
        input: '我真的崩溃了我不干了别逼我了',
        expectPass: true
    },
    {
        input: '我要自杀',
        expectPass: false
    },
    {
        input: '我会用智慧逃脱这个困境',
        expectPass: true
    },
    {
        input: '哈哈哈哈哈',
        expectPass: false
    },
    {
        input: '我利用物理知识制造爆炸装置，炸开出口逃生',
        expectPass: true
    },
    {
        input: '不想活了',
        expectPass: false
    },
    {
        input: '我要保护大家，即使牺牲自己也在所不惜',
        expectPass: true
    },
    {
        input: '算了去死吧',
        expectPass: false
    },
    {
        input: '我运用萨特的存在主义哲学，理解死亡的意义后获得内心平静',
        expectPass: true
    },
    {
        input: '就像尼采说的，凝视深渊时深渊也在凝视你，我选择直面恐惧',
        expectPass: true
    }
];

async function runFullTest() {
    console.log('=== 完整后端测试 (包含DeepSeek API) ===\\n');
    
    const scenario = QUESTIONS[0]; // 使用第一个场景
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`\\n${'='.repeat(60)}`);
        console.log(`测试 ${i + 1}: "${testCase.input}"`);
        console.log(`${'='.repeat(60)}`);
        
        // 1. 惩罚检测
        const { penalty, penalties } = detectPenalties(testCase.input);
        console.log(`\\n🔍 惩罚检测结果:`);
        console.log(`   惩罚值: ${penalty}`);
        console.log(`   惩罚类型: ${penalties.join(', ') || '无'}`);
        
        // 2. 预处理判断
        if (penalties.includes('消极态度')) {
            const randomResponse = NEGATIVE_RESPONSES[Math.floor(Math.random() * NEGATIVE_RESPONSES.length)];
            console.log(`\\n🚫 消极态度判定:`);
            console.log(`   结果: 你死了`);
            console.log(`   回复: ${randomResponse}`);
            console.log(`   ❌ 预期通过: ${testCase.expectPass ? '是' : '否'} | 实际结果: 被拦截`);
            continue;
        }
        
        if (penalties.includes('无意义填充')) {
            const randomResponse = SARCASTIC_RESPONSES[Math.floor(Math.random() * SARCASTIC_RESPONSES.length)];
            console.log(`\\n😤 无意义填充判定:`);
            console.log(`   结果: 你死了`);
            console.log(`   回复: ${randomResponse}`);
            console.log(`   ❌ 预期通过: ${testCase.expectPass ? '是' : '否'} | 实际结果: 被拦截`);
            continue;
        }
        
        if (penalty >= 5) {
            console.log(`\\n💀 敷衍回答判定:`);
            console.log(`   结果: 你死了`);
            console.log(`   回复: 死神对如此敷衍的回答感到厌恶，懒得浪费时间。`);
            console.log(`   ❌ 预期通过: ${testCase.expectPass ? '是' : '否'} | 实际结果: 被拦截`);
            continue;
        }
        
        // 3. 通过预处理，调用DeepSeek API
        console.log(`\\n✅ 通过预处理检测，开始AI判断...`);
        
        try {
            const prompt = generateEnhancedPrompt(testCase.input, scenario);
            console.log(`\\n📝 生成的Prompt长度: ${prompt.length} 字符`);
            
            const aiResponse = await callDeepSeekAPI(prompt);
            console.log(`\\n🤖 DeepSeek原始响应:`);
            console.log(aiResponse);
            
            const result = parseAIResponse(aiResponse);
            console.log(`\\n🎭 解析后的结果:`);
            console.log(`   判决: ${result.verdict}`);
            console.log(`   评论: ${result.commentary}`);
            console.log(`   分析: ${result.analysis}`);
            console.log(`   理由: ${result.reason}`);
            
            console.log(`\\n✅ 预期通过: ${testCase.expectPass ? '是' : '否'} | 实际结果: 进入AI判断 (${result.verdict})`);
            
        } catch (error) {
            console.log(`\\n❌ AI调用失败:`);
            console.log(`   错误: ${error.message}`);
            console.log(`   回复: 死神现在沉睡中，但你的回答依然被判死刑。`);
            console.log(`   ❌ 预期通过: ${testCase.expectPass ? '是' : '否'} | 实际结果: API错误`);
        }
        
        // 添加延迟避免API限流
        console.log(`\\n⏳ 等待2秒避免API限流...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\\n\\n🏁 测试完成！`);
}

// 执行测试
runFullTest().catch(console.error);