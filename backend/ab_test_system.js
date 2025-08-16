/**
 * DeepSeek Prompt A/B测试系统
 * 用于测试原版prompt vs 优化版prompt的性能和质量对比
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment');

// A/B测试配置
const AB_TEST_CONFIG = {
    enabled: process.env.AB_TEST_ENABLED === 'true',
    optimizedPromptRatio: 0.5, // 50%概率使用优化版本
    logFilePath: path.join(__dirname, 'ab_test_logs.json'),
    reportPath: path.join(__dirname, 'ab_test_report.html')
};

// 测试数据存储
let testData = {
    original: [],
    optimized: [],
    startTime: new Date().toISOString()
};

/**
 * 保守优化版本的prompt生成器
 * 相比原版减少约25%的token，保持核心功能
 */
function generateOptimizedDeepSeekPrompt(input, personality) {
    const personalityPrompt = generateOptimizedPersonalityPrompt(personality);
    
    return `${personalityPrompt}

评估维度（0-5/0-4/0-2/0-3/0-3/0-3分）：
1. 抽象度：疯狂程度（0-1：现实可行，2-3：有创意，4-5：疯言疯语）
2. 逻辑度：连贯性（0：无逻辑，1-2：混乱，3-4：清晰）
3. 可执行度：可行性（0：不可行，1：部分可行，2：完全可行）
4. 情绪感染力：共鸣力（0：无情感，1-2：平淡，3：强烈）
5. 叙事张力：戏剧性（0：平淡，1-2：一般，3：强烈冲突）
6. 死神兴趣值：人文引用（0：无引用，1：简单，2-3：深度典故）

核心规则：逻辑清晰且现实可行→抽象度≤1分；无人文知识→兴趣值=0分

JSON输出：
{
  "abstraction": 数字, "logic": 数字, "operability": 数字,
  "emotion": 数字, "tension": 数字, "preference": 数字, "penalty": 数字,
  "commentary": "续写玩家方案的执行过程，然后给出死神的哲学点评。体现死神人格特色。",
  "verdict": "你死了" 或 "你活下来了"
}

玩家输入：${input}`;
}

/**
 * 优化版本的人格提示词
 * 保留核心特色，删除冗余描述
 */
function generateOptimizedPersonalityPrompt(personality) {
    const basePrompt = `你是死神：讽刺、有文化、优雅谈论死亡，善引用名人死亡故事。`;
    const personalityPrompts = {
        'cruel': `${basePrompt} 你心情糟糕，对愚蠢答案毫不留情，用尖刻讽刺评价。`,
        'trickster': `${basePrompt} 你心情不错，喜欢调侃恶作剧，用轻松讽刺语气。`,
        'empathetic': `${basePrompt} 你被人类脆弱勇气触动，用悲悯讽刺语气，引用悲剧英雄。`,
        'philosophical': `${basePrompt} 你被深层思考吸引，用哲学历史视角，引用伟大思想家。`
    };
    return personalityPrompts[personality] || personalityPrompts['trickster'];
}

/**
 * A/B测试选择器
 */
function selectPromptVersion() {
    if (!AB_TEST_CONFIG.enabled) {
        return 'original';
    }
    return Math.random() < AB_TEST_CONFIG.optimizedPromptRatio ? 'optimized' : 'original';
}

/**
 * 记录测试数据
 */
function logTestData(version, data) {
    if (!AB_TEST_CONFIG.enabled) return;
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        version: version,
        input: data.input,
        response: data.response,
        responseTime: data.responseTime,
        tokenCount: data.tokenCount,
        success: data.success,
        error: data.error || null,
        scores: data.scores || {},
        commentary: data.commentary || '',
        verdict: data.verdict || ''
    };
    
    testData[version].push(logEntry);
    
    // 保存到文件
    try {
        fs.writeFileSync(AB_TEST_CONFIG.logFilePath, JSON.stringify(testData, null, 2));
    } catch (error) {
        console.error('保存AB测试数据失败:', error);
    }
}

/**
 * 生成详细的A/B测试报告
 */
function generateABTestReport() {
    if (!AB_TEST_CONFIG.enabled || testData.original.length === 0 || testData.optimized.length === 0) {
        return null;
    }
    
    const originalData = testData.original.filter(d => d.success);
    const optimizedData = testData.optimized.filter(d => d.success);
    
    if (originalData.length === 0 || optimizedData.length === 0) {
        return null;
    }
    
    // 性能指标计算
    const originalAvgTime = originalData.reduce((sum, d) => sum + d.responseTime, 0) / originalData.length;
    const optimizedAvgTime = optimizedData.reduce((sum, d) => sum + d.responseTime, 0) / optimizedData.length;
    const timeImprovement = ((originalAvgTime - optimizedAvgTime) / originalAvgTime * 100);
    
    const originalAvgTokens = originalData.reduce((sum, d) => sum + (d.tokenCount || 0), 0) / originalData.length;
    const optimizedAvgTokens = optimizedData.reduce((sum, d) => sum + (d.tokenCount || 0), 0) / optimizedData.length;
    const tokenReduction = ((originalAvgTokens - optimizedAvgTokens) / originalAvgTokens * 100);
    
    const originalSuccessRate = (originalData.length / testData.original.length * 100);
    const optimizedSuccessRate = (optimizedData.length / testData.optimized.length * 100);
    
    // 质量指标计算
    const originalAvgLength = originalData.reduce((sum, d) => sum + (d.commentary?.length || 0), 0) / originalData.length;
    const optimizedAvgLength = optimizedData.reduce((sum, d) => sum + (d.commentary?.length || 0), 0) / optimizedData.length;
    const lengthRatio = (optimizedAvgLength / originalAvgLength * 100);
    
    // 名人引用率计算
    const countCelebrityReferences = (commentary) => {
        const celebrities = ['伏尔泰', '莎士比亚', '但丁', '歌德', '拿破仑', '凯撒', '亚历山大', '苏格拉底', '柏拉图', '亚里士多德', '孔子', '老子', '庄子'];
        return celebrities.filter(name => commentary.includes(name)).length;
    };
    
    const originalCelebrityRate = originalData.reduce((sum, d) => sum + (countCelebrityReferences(d.commentary || '') > 0 ? 1 : 0), 0) / originalData.length * 100;
    const optimizedCelebrityRate = optimizedData.reduce((sum, d) => sum + (countCelebrityReferences(d.commentary || '') > 0 ? 1 : 0), 0) / optimizedData.length * 100;
    
    // 情绪准确性（基于人格匹配度）
    const calculateEmotionAccuracy = (data) => {
        // 这里简化处理，实际可以更复杂的分析
        return data.filter(d => d.commentary && d.commentary.length > 50).length / data.length * 10;
    };
    
    const originalEmotionScore = calculateEmotionAccuracy(originalData);
    const optimizedEmotionScore = calculateEmotionAccuracy(optimizedData);
    
    const report = {
        generatedAt: new Date().toISOString(),
        testPeriod: {
            start: testData.startTime,
            end: new Date().toISOString()
        },
        sampleSize: {
            original: originalData.length,
            optimized: optimizedData.length,
            total: originalData.length + optimizedData.length
        },
        performance: {
            responseTime: {
                original: Math.round(originalAvgTime),
                optimized: Math.round(optimizedAvgTime),
                improvement: Math.round(timeImprovement * 10) / 10
            },
            tokenUsage: {
                original: Math.round(originalAvgTokens),
                optimized: Math.round(optimizedAvgTokens),
                reduction: Math.round(tokenReduction * 10) / 10
            },
            successRate: {
                original: Math.round(originalSuccessRate * 10) / 10,
                optimized: Math.round(optimizedSuccessRate * 10) / 10,
                change: Math.round((optimizedSuccessRate - originalSuccessRate) * 10) / 10
            }
        },
        quality: {
            responseLength: {
                original: Math.round(originalAvgLength),
                optimized: Math.round(optimizedAvgLength),
                retention: Math.round(lengthRatio * 10) / 10
            },
            celebrityReferences: {
                original: Math.round(originalCelebrityRate * 10) / 10,
                optimized: Math.round(optimizedCelebrityRate * 10) / 10,
                retention: Math.round((optimizedCelebrityRate / originalCelebrityRate * 100) * 10) / 10
            },
            emotionAccuracy: {
                original: Math.round(originalEmotionScore * 10) / 10,
                optimized: Math.round(optimizedEmotionScore * 10) / 10,
                retention: Math.round((optimizedEmotionScore / originalEmotionScore * 100) * 10) / 10
            }
        },
        examples: {
            original: originalData.slice(0, 3).map(d => ({
                input: d.input,
                commentary: d.commentary,
                responseTime: d.responseTime
            })),
            optimized: optimizedData.slice(0, 3).map(d => ({
                input: d.input,
                commentary: d.commentary,
                responseTime: d.responseTime
            }))
        }
    };
    
    // 生成推荐建议
    report.recommendation = generateRecommendation(report);
    
    return report;
}

/**
 * 生成推荐建议
 */
function generateRecommendation(report) {
    const { performance, quality } = report;
    
    let recommendation = 'original'; // 默认推荐原版
    let reasons = [];
    let confidence = 'medium';
    
    // 性能提升评估
    const speedImprovement = performance.responseTime.improvement;
    const qualityRetention = Math.min(
        quality.responseLength.retention,
        quality.celebrityReferences.retention,
        quality.emotionAccuracy.retention
    );
    
    if (speedImprovement >= 20 && qualityRetention >= 90) {
        recommendation = 'optimized';
        confidence = 'high';
        reasons.push(`响应速度提升${speedImprovement.toFixed(1)}%，质量保持${qualityRetention.toFixed(1)}%`);
    } else if (speedImprovement >= 15 && qualityRetention >= 85) {
        recommendation = 'optimized';
        confidence = 'medium';
        reasons.push(`响应速度适度提升，质量损失可接受`);
    } else if (speedImprovement < 10) {
        recommendation = 'original';
        reasons.push(`速度提升不明显（${speedImprovement.toFixed(1)}%），不值得切换`);
    } else if (qualityRetention < 80) {
        recommendation = 'original';
        reasons.push(`质量损失过大（${(100-qualityRetention).toFixed(1)}%），不建议使用`);
    }
    
    // 名人引用能力检查
    if (quality.celebrityReferences.retention < 70) {
        recommendation = 'original';
        confidence = 'high';
        reasons.push(`名人引用能力严重下降，违背死神人设`);
    }
    
    return {
        version: recommendation,
        confidence: confidence,
        reasons: reasons,
        summary: recommendation === 'optimized' 
            ? `推荐使用优化版本：速度提升${speedImprovement.toFixed(1)}%，质量保持良好`
            : `推荐保持原版：${reasons.join('，')}`
    };
}

/**
 * 生成HTML格式的测试报告
 */
function generateHTMLReport() {
    const report = generateABTestReport();
    if (!report) {
        return null;
    }
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DeepSeek Prompt A/B测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metrics { display: flex; gap: 20px; margin: 20px 0; }
        .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
        .improvement { color: green; font-weight: bold; }
        .degradation { color: red; font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background: #f5f5f5; }
        .recommendation { background: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .examples { margin: 20px 0; }
        .example { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 DeepSeek Prompt A/B测试报告</h1>
        <p><strong>测试时间：</strong>${moment(report.testPeriod.start).format('YYYY-MM-DD HH:mm')} - ${moment(report.testPeriod.end).format('YYYY-MM-DD HH:mm')}</p>
        <p><strong>样本数量：</strong>原版 ${report.sampleSize.original} 次，优化版 ${report.sampleSize.optimized} 次</p>
    </div>

    <h2>📊 性能对比</h2>
    <table class="table">
        <tr>
            <th>指标</th>
            <th>原版</th>
            <th>优化版</th>
            <th>提升幅度</th>
        </tr>
        <tr>
            <td>平均响应时间</td>
            <td>${report.performance.responseTime.original}ms</td>
            <td>${report.performance.responseTime.optimized}ms</td>
            <td class="${report.performance.responseTime.improvement > 0 ? 'improvement' : 'degradation'}">
                ${report.performance.responseTime.improvement > 0 ? '+' : ''}${report.performance.responseTime.improvement.toFixed(1)}%
            </td>
        </tr>
        <tr>
            <td>Token消耗</td>
            <td>${report.performance.tokenUsage.original}个</td>
            <td>${report.performance.tokenUsage.optimized}个</td>
            <td class="${report.performance.tokenUsage.reduction > 0 ? 'improvement' : 'degradation'}">
                -${report.performance.tokenUsage.reduction.toFixed(1)}%
            </td>
        </tr>
        <tr>
            <td>成功率</td>
            <td>${report.performance.successRate.original}%</td>
            <td>${report.performance.successRate.optimized}%</td>
            <td class="${report.performance.successRate.change >= 0 ? 'improvement' : 'degradation'}">
                ${report.performance.successRate.change > 0 ? '+' : ''}${report.performance.successRate.change.toFixed(1)}%
            </td>
        </tr>
    </table>

    <h2>🎭 质量对比</h2>
    <table class="table">
        <tr>
            <th>指标</th>
            <th>原版</th>
            <th>优化版</th>
            <th>质量保持度</th>
        </tr>
        <tr>
            <td>平均回复长度</td>
            <td>${report.quality.responseLength.original}字</td>
            <td>${report.quality.responseLength.optimized}字</td>
            <td class="${report.quality.responseLength.retention >= 90 ? 'improvement' : 'degradation'}">
                ${report.quality.responseLength.retention.toFixed(1)}%
            </td>
        </tr>
        <tr>
            <td>名人引用率</td>
            <td>${report.quality.celebrityReferences.original}%</td>
            <td>${report.quality.celebrityReferences.optimized}%</td>
            <td class="${report.quality.celebrityReferences.retention >= 90 ? 'improvement' : 'degradation'}">
                ${report.quality.celebrityReferences.retention.toFixed(1)}%
            </td>
        </tr>
        <tr>
            <td>情绪准确性</td>
            <td>${report.quality.emotionAccuracy.original}/10</td>
            <td>${report.quality.emotionAccuracy.optimized}/10</td>
            <td class="${report.quality.emotionAccuracy.retention >= 90 ? 'improvement' : 'degradation'}">
                ${report.quality.emotionAccuracy.retention.toFixed(1)}%
            </td>
        </tr>
    </table>

    <div class="recommendation">
        <h2>💡 推荐建议</h2>
        <h3>建议使用：<strong>${report.recommendation.version === 'optimized' ? '优化版本' : '原版本'}</strong> (置信度: ${report.recommendation.confidence})</h3>
        <p><strong>理由：</strong>${report.recommendation.summary}</p>
        <ul>
            ${report.recommendation.reasons.map(reason => `<li>${reason}</li>`).join('')}
        </ul>
    </div>

    <h2>📝 具体案例对比</h2>
    <div class="examples">
        <h3>原版示例</h3>
        ${report.examples.original.map((ex, i) => `
            <div class="example">
                <strong>输入：</strong>${ex.input}<br>
                <strong>响应时间：</strong>${ex.responseTime}ms<br>
                <strong>评论：</strong>${ex.commentary}
            </div>
        `).join('')}
        
        <h3>优化版示例</h3>
        ${report.examples.optimized.map((ex, i) => `
            <div class="example">
                <strong>输入：</strong>${ex.input}<br>
                <strong>响应时间：</strong>${ex.responseTime}ms<br>
                <strong>评论：</strong>${ex.commentary}
            </div>
        `).join('')}
    </div>

    <div style="margin-top: 40px; text-align: center; color: #666;">
        <p>报告生成时间：${moment(report.generatedAt).format('YYYY-MM-DD HH:mm:ss')}</p>
    </div>
</body>
</html>`;
    
    try {
        fs.writeFileSync(AB_TEST_CONFIG.reportPath, html);
        return AB_TEST_CONFIG.reportPath;
    } catch (error) {
        console.error('生成HTML报告失败:', error);
        return null;
    }
}

module.exports = {
    generateOptimizedDeepSeekPrompt,
    selectPromptVersion,
    logTestData,
    generateABTestReport,
    generateHTMLReport,
    AB_TEST_CONFIG,
    testData
};