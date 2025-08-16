/**
 * 快速A/B测试脚本 - 生成足够的测试数据
 */

const axios = require('axios');

const testAnswers = [
    // 逻辑严密类
    "我会立即观察周围环境，确认最近的掩体位置。如果左右两侧有建筑物或大树，我会快速冲向距离最近的一侧。",
    "首先用湿毛巾或衣物捂住口鼻，降低身体姿态沿墙根摸索前进。寻找安全出口标识，避开电梯走楼梯。",
    "立即躲在坚固的桌子下或承重墙角，保护头部。等主震结束后迅速但谨慎地走楼梯下楼，绝不乘电梯。",
    
    // 创意天马行空类
    "我会召唤三头神龙把卡车吞噬掉，然后骑着独角兽飞到月球上避难，顺便请嫦娥喝个茶聊聊人生哲学。",
    "我会变身成超人，用意念力让电梯悬浮在半空中，然后撕开电梯门，抱着所有乘客一起飞出去。",
    "我会像诺亚一样建造巧克力方舟，邀请所有动物上船，包括会飞的企鹅和会游泳的老虎。",
    
    // 哲学思辨类
    "在这短暂的坠落中，我想起了萨特的话：'人生来自由，但无往不在枷锁之中。'即使面对死亡，我也要保持理性思考。",
    "这让我想起但丁《神曲》中的炼狱，火焰既是毁灭也是净化。我要像尤利西斯一样保持智慧和勇气。",
    
    // 情感丰富类
    "在这生死攸关的瞬间，我想到了我的家人，我不能就这样死去！我要为了爱我的人和我爱的人坚强地活着。",
    "看到巨浪袭来，我的心中涌起莫名的敬畏，这是大自然最原始的力量。但我不会屈服，我会拼命奔跑到高处。",
    
    // 简短无聊类
    "跑",
    "没办法",
    "往高处跑吧",
    
    // 包含惩罚项类
    "算了，我选择死亡，反正活着也没什么意思，让我死吧死吧死吧！！！哈哈哈哈哈...",
    "我放弃了，完了完了，没救了没救了，哈哈哈，等死等死...怎么办怎么办怎么办？？？"
];

async function runQuickTest() {
    console.log('🚀 开始快速A/B测试');
    console.log(`📊 将运行 ${testAnswers.length} 个测试用例`);
    
    const results = [];
    
    for (let i = 0; i < testAnswers.length; i++) {
        const answer = testAnswers[i];
        console.log(`\n[${i+1}/${testAnswers.length}] 测试: ${answer.substring(0, 30)}...`);
        
        try {
            const startTime = Date.now();
            const response = await axios.post('http://localhost:3000/reaper', {
                answer: answer,
                player_id: `quick_test_${i}`,
                nickname: `快速测试${i}`,
                avatar_url: '',
                question_id: i
            }, {
                timeout: 30000
            });
            
            const responseTime = Date.now() - startTime;
            results.push({
                id: i,
                success: true,
                responseTime: responseTime,
                commentaryLength: response.data.commentary.length,
                verdict: response.data.verdict
            });
            
            console.log(`✅ 成功 - 用时: ${responseTime}ms, 长度: ${response.data.commentary.length}字, 判决: ${response.data.verdict}`);
            
        } catch (error) {
            console.log(`❌ 失败: ${error.message}`);
            results.push({
                id: i,
                success: false,
                error: error.message
            });
        }
        
        // 短暂延迟避免过于频繁请求
        if (i < testAnswers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // 显示总结
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('\n📈 测试总结:');
    console.log(`✅ 成功: ${successful.length}/${testAnswers.length}`);
    console.log(`❌ 失败: ${failed.length}/${testAnswers.length}`);
    
    if (successful.length > 0) {
        const avgTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
        const avgLength = successful.reduce((sum, r) => sum + r.commentaryLength, 0) / successful.length;
        
        console.log(`⏱️  平均响应时间: ${Math.round(avgTime)}ms`);
        console.log(`📝 平均回复长度: ${Math.round(avgLength)}字`);
        
        const survivalRate = successful.filter(r => r.verdict === '你活下来了').length / successful.length;
        console.log(`💀 死亡率: ${Math.round((1 - survivalRate) * 100)}%`);
    }
    
    // 检查A/B测试状态
    try {
        const statusResponse = await axios.get('http://localhost:3000/ab_test/status');
        console.log('\n🧪 A/B测试状态:');
        console.log(`   原版: ${statusResponse.data.originalCount} 次`);
        console.log(`   优化版: ${statusResponse.data.optimizedCount} 次`);
        console.log(`   总计: ${statusResponse.data.totalTests} 次`);
    } catch (error) {
        console.log('❌ 无法获取A/B测试状态');
    }
    
    console.log('\n🎉 快速测试完成！');
}

runQuickTest().catch(console.error);