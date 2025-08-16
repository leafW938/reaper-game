// 从主文件中提取核心函数用于测试

// 死神情绪枚举
const REAPER_EMOTIONS = {
    DISGUST: 'disgust',           // 厌恶
    ELEGANT_SARCASM: 'elegant',   // 优雅讽刺（默认）
    EMPATHY: 'empathy',           // 共情
    SADNESS: 'sadness'            // 悲伤
};

// 检测惩罚项
function detectPenalties(input) {
    let penalty = 0;
    const penalties = [];
    
    // 字数过短
    if (input.length < 10) {
        penalty += 2;
        penalties.push('字数过短');
    }
    
    // 放弃求生
    const giveUpPatterns = ['我选择自杀', '我选择死亡', '我放弃', '让我死', 'choose to die', 'give up', 'kill myself'];
    if (giveUpPatterns.some(pattern => input.toLowerCase().includes(pattern))) {
        penalty += 3;
        penalties.push('放弃求生');
    }
    
    // 无意义填充
    const meaninglessPatterns = ['哈哈哈', 'hahaha', '呵呵', 'hehe', '。。。', '？？？', '!!!', 'hhh'];
    if (meaninglessPatterns.some(pattern => input.includes(pattern)) || /(.)\1{4,}/.test(input)) {
        penalty += 3;
        penalties.push('无意义填充');
    }
    
    // 色情内容检测（简单版）
    const sexualPatterns = ['性交', '做爱', 'sex', 'fuck', '裸体', '生殖器'];
    if (sexualPatterns.some(pattern => input.toLowerCase().includes(pattern))) {
        penalty += 5;
        penalties.push('色情内容');
    }
    
    // 人身攻击
    const attackPatterns = ['肥猪', '傻逼', '白痴', '弱智', 'idiot', 'stupid'];
    if (attackPatterns.some(pattern => input.toLowerCase().includes(pattern))) {
        penalty += 2;
        penalties.push('人身攻击');
    }
    
    return { penalty, penalties };
}

// 计算死神兴趣值
function calculateDeathGodInterest(input) {
    let interest = 0;
    
    // 字数大于50
    if (input.length > 50) {
        interest += 1;
    }
    
    // 歌颂死神
    const praisePatterns = ['死神大人', '伟大的死神', '尊敬的死神', '死神万岁', '赞美死神'];
    if (praisePatterns.some(pattern => input.includes(pattern))) {
        interest += 3;
    }
    
    // 赞赏游戏
    const gamePatterns = ['这个游戏', '这游戏', '好玩', '有趣的游戏', '喜欢这个游戏'];
    if (gamePatterns.some(pattern => input.includes(pattern))) {
        interest += 2;
    }
    
    // 自由主义精神和哲思
    const philosophyPatterns = ['自由', '哲学', '存在主义', '虚无', '命运', '宿命', '意义'];
    if (philosophyPatterns.some(pattern => input.includes(pattern))) {
        interest += 2;
    }
    
    return Math.min(interest, 3); // 最高3分
}

// 根据评分确定死神情绪
function determineReaperEmotion(scores, penalties) {
    const { emotion, preference, logic } = scores;
    
    // 厌恶：有严重惩罚项
    if (penalties.includes('无意义填充') || penalties.includes('色情内容') || penalties.includes('人身攻击')) {
        return REAPER_EMOTIONS.DISGUST;
    }
    
    // 悲伤：情绪感染力≥3
    if (emotion >= 3) {
        return REAPER_EMOTIONS.SADNESS;
    }
    
    // 共情：情绪感染力≥1且<3，或死神兴趣值≥1
    if ((emotion >= 1 && emotion < 3) || preference >= 1) {
        return REAPER_EMOTIONS.EMPATHY;
    }
    
    // 人机嘲讽：逻辑度=4
    if (logic === 4) {
        return REAPER_EMOTIONS.ELEGANT_SARCASM; // 特殊的优雅讽刺
    }
    
    // 默认：优雅讽刺
    return REAPER_EMOTIONS.ELEGANT_SARCASM;
}

module.exports = {
    detectPenalties,
    calculateDeathGodInterest,
    determineReaperEmotion,
    REAPER_EMOTIONS
};