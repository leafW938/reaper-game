const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testNewThreshold() {
    console.log('🎯 测试新的死亡阈值 (13分)...\n');

    const testCases = [
        {
            name: '超高创意答案',
            answer: '我会利用量子纠缠原理，与平行宇宙的自己交换身体，然后用哲学的力量说服朋友，正如尼采所说："凝视深渊时，深渊也在凝视你"，伟大的死神大人，这个游戏充满哲学思考。',
            expected: '高分存活'
        },
        {
            name: '中等逻辑答案',
            answer: '我会按照飞船操作手册找到自爆程序的停止按钮，然后重启系统。',
            expected: '中分可能死亡'
        },
        {
            name: '简单答案',
            answer: '我会跑得很快逃走。',
            expected: '低分死亡'
        },
        {
            name: '平庸答案',
            answer: '我会试图说服朋友，告诉他不要这样做，我们还有希望。',
            expected: '中等分数'
        },
        {
            name: '无意义答案',
            answer: '哈哈哈',
            expected: '惩罚死亡'
        }
    ];

    let deathCount = 0;
    let totalTests = testCases.length;

    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
            console.log(`${i + 1}. 测试${testCase.name}:`);
            console.log(`   答案: ${testCase.answer}`);
            
            const response = await axios.post(`${BASE_URL}/judge`, {
                answer: testCase.answer,
                player_id: `threshold_test_${i + 1}`,
                nickname: `测试玩家${i + 1}`,
                question_id: 1
            });
            
            const { verdict, scores } = response.data;
            const isDead = verdict === "你死了";
            
            if (isDead) deathCount++;
            
            console.log(`   总分: ${scores.finalScore} | 阈值: 13 | 结果: ${verdict} ${isDead ? '💀' : '✅'}`);
            console.log(`   评分: 抽象${scores.abstraction} 逻辑${scores.logic} 可执行${scores.operability} 情感${scores.emotion} 张力${scores.tension} 兴趣${scores.preference} 惩罚${scores.penalty}`);
            console.log('');
            
        } catch (error) {
            console.error(`   ❌ 测试失败: ${error.message}`);
            console.log('');
        }
    }

    const deathRate = deathCount / totalTests;
    console.log('📊 测试结果统计:');
    console.log(`   总测试: ${totalTests}`);
    console.log(`   死亡数: ${deathCount}`);
    console.log(`   死亡率: ${(deathRate * 100).toFixed(1)}%`);
    console.log(`   目标死亡率: 50-55%`);
    
    if (deathRate >= 0.45 && deathRate <= 0.60) {
        console.log('✅ 死亡率在合理范围内！');
    } else if (deathRate < 0.45) {
        console.log('⚠️  死亡率偏低，建议提高阈值到14-15');
    } else {
        console.log('⚠️  死亡率偏高，建议降低阈值到11-12');
    }
}

// 延迟等待服务器启动
setTimeout(() => {
    testNewThreshold();
}, 3000);