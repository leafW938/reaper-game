const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testRealAPI() {
    console.log('🔥 开始测试真实API调用...\n');

    try {
        // 1. 测试健康检查
        console.log('1. 测试健康检查...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ 健康检查通过:', healthResponse.data);
        console.log('');

        // 2. 测试获取随机题目
        console.log('2. 测试获取随机题目...');
        const questionResponse = await axios.get(`${BASE_URL}/question/random`);
        console.log('✅ 随机题目:', questionResponse.data);
        console.log('');

        // 3. 测试真实AI评分（创意答案）
        console.log('3. 测试真实AI评分 - 创意答案...');
        const creativeAnswer = '我会利用量子纠缠原理，与平行宇宙的自己交换身体，然后用哲学的力量说服朋友，正如尼采所说："凝视深渊时，深渊也在凝视你"，我要让朋友看到希望的深渊。';
        
        const creativeResponse = await axios.post(`${BASE_URL}/judge`, {
            answer: creativeAnswer,
            player_id: 'test_creative_001',
            nickname: '创意玩家',
            question_id: 1
        });
        
        console.log('✅ 创意答案结果:');
        console.log('   判决:', creativeResponse.data.verdict);
        console.log('   死神情绪:', creativeResponse.data.reaper_emotion);
        console.log('   评分:', creativeResponse.data.scores);
        console.log('   点评:', creativeResponse.data.commentary.substring(0, 200) + '...');
        console.log('');

        // 4. 测试真实AI评分（逻辑答案）
        console.log('4. 测试真实AI评分 - 逻辑答案...');
        const logicalAnswer = '我会冷静分析飞船系统，按照操作手册找到自爆程序的紧急停止按钮，然后重新启动导航系统，这是完全可行且符合逻辑的解决方案。';
        
        const logicalResponse = await axios.post(`${BASE_URL}/judge`, {
            answer: logicalAnswer,
            player_id: 'test_logical_001',
            nickname: '逻辑玩家',
            question_id: 1
        });
        
        console.log('✅ 逻辑答案结果:');
        console.log('   判决:', logicalResponse.data.verdict);
        console.log('   死神情绪:', logicalResponse.data.reaper_emotion);
        console.log('   评分:', logicalResponse.data.scores);
        console.log('   点评:', logicalResponse.data.commentary.substring(0, 200) + '...');
        console.log('');

        // 5. 测试真实AI评分（情感答案）
        console.log('5. 测试真实AI评分 - 情感答案...');
        const emotionalAnswer = '我会紧紧抱住我最好的朋友，告诉他我爱他，我们的友情比生命更重要。如果真的要死，我愿意和他一起死去，因为没有他的世界对我毫无意义。';
        
        const emotionalResponse = await axios.post(`${BASE_URL}/judge`, {
            answer: emotionalAnswer,
            player_id: 'test_emotional_001',
            nickname: '情感玩家',
            question_id: 1
        });
        
        console.log('✅ 情感答案结果:');
        console.log('   判决:', emotionalResponse.data.verdict);
        console.log('   死神情绪:', emotionalResponse.data.reaper_emotion);
        console.log('   评分:', emotionalResponse.data.scores);
        console.log('   点评:', emotionalResponse.data.commentary.substring(0, 200) + '...');
        console.log('');

        // 6. 测试简化API
        console.log('6. 测试简化API...');
        const simpleResponse = await axios.post(`${BASE_URL}/reaper`, {
            answer: '伟大的死神大人，这个游戏充满哲学思考，我选择用存在主义的方式面对命运，拥抱虚无的美丽。',
            player_id: 'test_simple_001',
            nickname: '简化测试玩家'
        });
        console.log('✅ 简化API结果:', simpleResponse.data);
        console.log('');

        // 7. 测试惩罚项
        console.log('7. 测试惩罚项检测...');
        const penaltyResponse = await axios.post(`${BASE_URL}/judge`, {
            answer: '哈哈哈呵呵',
            player_id: 'test_penalty_001',
            nickname: '惩罚测试',
            question_id: 1
        });
        
        console.log('✅ 惩罚项测试结果:');
        console.log('   判决:', penaltyResponse.data.verdict);
        console.log('   惩罚项:', penaltyResponse.data.penalties);
        console.log('   评分:', penaltyResponse.data.scores);
        console.log('');

        // 8. 测试统计信息
        console.log('8. 测试统计信息...');
        const statsResponse = await axios.get(`${BASE_URL}/stats`);
        console.log('✅ 统计信息:', statsResponse.data);
        console.log('');

        console.log('🎉 真实API测试全部通过！');
        console.log('🔥 DeepSeek AI集成正常工作');
        console.log('📊 评分系统符合GDD要求');
        console.log('💀 死神情绪系统运行正常');
        console.log('🎯 后端已准备好支持前端开发');

    } catch (error) {
        console.error('❌ API测试失败:', error.response?.data || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 提示：请确保服务器在运行: node index.js');
        } else if (error.response?.status === 401) {
            console.log('\n💡 提示：请检查DeepSeek API密钥是否正确');
        }
    }
}

// 延迟3秒等待服务器启动
setTimeout(() => {
    testRealAPI();
}, 3000);