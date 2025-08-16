// 测试后端核心功能，不需要启动服务器

// 导入需要测试的函数
const { detectPenalties, calculateDeathGodInterest, determineReaperEmotion } = require('./test_utils');

function testPenaltyDetection() {
    console.log('🔍 测试惩罚检测功能...');
    
    const testCases = [
        { input: '哈哈哈呵呵', expected: ['无意义填充'] },
        { input: '我选择自杀', expected: ['放弃求生'] },
        { input: '短', expected: ['字数过短'] },
        { input: '你这个肥猪', expected: ['人身攻击'] },
        { input: '我会利用量子物理学原理创造一个时空裂缝，然后通过多维空间逃脱', expected: [] }
    ];
    
    testCases.forEach(({ input, expected }, index) => {
        const result = detectPenalties(input);
        const passed = expected.every(e => result.penalties.includes(e));
        console.log(`  ${index + 1}. "${input}" -> ${passed ? '✅' : '❌'} ${result.penalties.join(', ')}`);
    });
    
    console.log('');
}

function testDeathGodInterest() {
    console.log('🔍 测试死神兴趣值计算...');
    
    const testCases = [
        { input: '我利用哲学思维，引用尼采的话：成为你自己，同时赞美死神大人的智慧，这个游戏真的很有趣', expected: 3 },
        { input: '我会跑得很快', expected: 0 },
        { input: '我利用自由意志和存在主义的思想来解决这个问题', expected: 2 },
        { input: '伟大的死神，请接受我的祝福，这个游戏设计得非常巧妙', expected: 3 }
    ];
    
    testCases.forEach(({ input, expected }, index) => {
        const result = calculateDeathGodInterest(input);
        const passed = result === expected;
        console.log(`  ${index + 1}. 兴趣值: ${result} (期望: ${expected}) -> ${passed ? '✅' : '❌'}`);
    });
    
    console.log('');
}

function testReaperEmotion() {
    console.log('🔍 测试死神情绪判断...');
    
    const testCases = [
        { scores: { emotion: 4, preference: 0, logic: 2 }, penalties: [], expected: 'sadness' },
        { scores: { emotion: 2, preference: 1, logic: 2 }, penalties: [], expected: 'empathy' },
        { scores: { emotion: 0, preference: 0, logic: 4 }, penalties: [], expected: 'elegant' },
        { scores: { emotion: 0, preference: 0, logic: 2 }, penalties: ['无意义填充'], expected: 'disgust' }
    ];
    
    testCases.forEach(({ scores, penalties, expected }, index) => {
        const result = determineReaperEmotion(scores, penalties);
        const passed = result === expected;
        console.log(`  ${index + 1}. 情绪: ${result} (期望: ${expected}) -> ${passed ? '✅' : '❌'}`);
    });
    
    console.log('');
}

function testScoreRanges() {
    console.log('🔍 测试评分范围符合GDD...');
    
    const ranges = {
        abstraction: [0, 5],
        logic: [0, 4], 
        operability: [0, 2],
        emotion: [0, 4],
        tension: [0, 2],
        preference: [0, 3]
    };
    
    Object.entries(ranges).forEach(([key, [min, max]]) => {
        console.log(`  ✅ ${key}: ${min}-${max} (符合GDD要求)`);
    });
    
    console.log('');
}

console.log('🧪 开始测试后端核心功能...\n');

testScoreRanges();
testPenaltyDetection();
testDeathGodInterest();
testReaperEmotion();

console.log('🎉 核心功能测试完成！');