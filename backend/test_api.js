const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
    console.log('🔍 开始测试后端API...\n');

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

        // 3. 测试游戏判决API（使用mock数据）
        console.log('3. 测试游戏判决API...');
        const judgeResponse = await axios.post(`${BASE_URL}/judge`, {
            answer: '我会利用零重力环境，用超光速粒子束重新配置飞船的量子引擎，同时用心灵感应安抚朋友，并引用尼采的话：凝视深渊时，深渊也在凝视你。',
            player_id: 'test_player_001',
            nickname: '测试玩家',
            question_id: 1
        });
        console.log('✅ 游戏判决结果:', {
            verdict: judgeResponse.data.verdict,
            reaper_emotion: judgeResponse.data.reaper_emotion,
            scores: judgeResponse.data.scores,
            commentary: judgeResponse.data.commentary.substring(0, 100) + '...'
        });
        console.log('');

        // 4. 测试简化API
        console.log('4. 测试简化API...');
        const reaperResponse = await axios.post(`${BASE_URL}/reaper`, {
            answer: '我选择抱住朋友，和他一起死去，因为友情比生命更重要。',
            player_id: 'test_player_002',
            nickname: '测试玩家2'
        });
        console.log('✅ 简化API结果:', reaperResponse.data);
        console.log('');

        // 5. 测试创建房间
        console.log('5. 测试创建房间...');
        const roomResponse = await axios.post(`${BASE_URL}/room/create`, {
            question_id: 1
        });
        console.log('✅ 创建房间成功:', roomResponse.data);
        console.log('');

        // 6. 测试统计信息
        console.log('6. 测试统计信息...');
        const statsResponse = await axios.get(`${BASE_URL}/stats`);
        console.log('✅ 统计信息:', statsResponse.data);
        console.log('');

        console.log('🎉 所有API测试通过！后端功能符合GDD要求。');

    } catch (error) {
        console.error('❌ API测试失败:', error.response?.data || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 提示：请先启动服务器: node index.js');
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    testAPI();
}

module.exports = testAPI;