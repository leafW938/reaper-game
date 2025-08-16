/**
 * A/B测试自动化执行脚本
 * 运行预定义的测试用例，生成详细报告
 */

const axios = require('axios');
const testCases = require('./test_cases');
const moment = require('moment');

const CONFIG = {
    baseURL: 'http://localhost:3000',
    runsPerTest: 3, // 每个测试用例运行3次
    delayBetweenTests: 1000, // 测试之间延迟1秒
    timeout: 30000 // 30秒超时
};

class ABTestRunner {
    constructor() {
        this.results = [];
        this.startTime = new Date();
        this.currentTest = 0;
        this.totalTests = testCases.length * CONFIG.runsPerTest * 2; // 每个用例跑原版和优化版
    }

    async runAllTests() {
        console.log('🧪 开始A/B测试执行');
        console.log(`📊 总共 ${testCases.length} 个测试用例，每个用例运行 ${CONFIG.runsPerTest} 次`);
        console.log(`⏱️  预计总时间: ${Math.round(this.totalTests * 2 / 60)} 分钟\n`);

        // 首先检查服务器状态
        try {
            await this.checkServerHealth();
        } catch (error) {
            console.error('❌ 服务器连接失败:', error.message);
            return;
        }

        // 启用A/B测试
        process.env.AB_TEST_ENABLED = 'true';

        // 对每个测试用例运行多次
        for (const testCase of testCases) {
            console.log(`\n📝 测试用例 ${testCase.id}: ${testCase.category}`);
            console.log(`❓ 场景: ${testCase.scenario}`);
            console.log(`💬 回答: ${testCase.answer.substring(0, 50)}...`);

            for (let run = 1; run <= CONFIG.runsPerTest; run++) {
                console.log(`   🔄 第 ${run} 次运行...`);
                
                try {
                    // 运行测试
                    const result = await this.runSingleTest(testCase, run);
                    this.results.push(result);
                    
                    // 显示结果摘要
                    console.log(`   ✅ 完成 - 用时: ${result.responseTime}ms, 版本: ${result.promptVersion}`);
                    
                } catch (error) {
                    console.log(`   ❌ 失败: ${error.message}`);
                    this.results.push({
                        testCaseId: testCase.id,
                        run: run,
                        success: false,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }

                // 延迟避免过于频繁请求
                if (run < CONFIG.runsPerTest) {
                    await this.sleep(CONFIG.delayBetweenTests);
                }
            }

            this.currentTest++;
            const progress = Math.round((this.currentTest / testCases.length) * 100);
            console.log(`📈 进度: ${progress}% (${this.currentTest}/${testCases.length})`);
        }

        console.log('\n🎉 所有测试完成！');
        await this.generateFinalReport();
    }

    async runSingleTest(testCase, run) {
        const startTime = Date.now();
        
        try {
            const response = await axios.post(
                `${CONFIG.baseURL}/reaper`,
                {
                    answer: testCase.answer,
                    player_id: `test_player_${testCase.id}_${run}`,
                    nickname: `测试员${testCase.id}`,
                    avatar_url: '',
                    question_id: testCase.id
                },
                {
                    timeout: CONFIG.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const responseTime = Date.now() - startTime;
            
            return {
                testCaseId: testCase.id,
                category: testCase.category,
                run: run,
                success: true,
                responseTime: responseTime,
                commentary: response.data.commentary,
                verdict: response.data.verdict,
                input: testCase.answer,
                timestamp: new Date().toISOString(),
                // 从响应中推断使用的prompt版本（这个信息会在后端记录）
                promptVersion: 'unknown' // 实际版本会在后端AB测试系统中记录
            };

        } catch (error) {
            throw new Error(`API调用失败: ${error.message}`);
        }
    }

    async checkServerHealth() {
        try {
            const response = await axios.get(`${CONFIG.baseURL}/health`, {
                timeout: 5000
            });
            console.log('✅ 服务器健康检查通过');
            console.log(`📊 当前死亡阈值: ${response.data.deathThreshold}`);
            return true;
        } catch (error) {
            throw new Error('服务器健康检查失败');
        }
    }

    async generateFinalReport() {
        console.log('\n📊 生成最终报告...');

        try {
            // 获取A/B测试状态
            const statusResponse = await axios.get(`${CONFIG.baseURL}/ab-test/status`);
            console.log('📈 A/B测试状态:');
            console.log(`   原版测试次数: ${statusResponse.data.originalCount}`);
            console.log(`   优化版测试次数: ${statusResponse.data.optimizedCount}`);
            console.log(`   总测试次数: ${statusResponse.data.totalTests}`);

            // 获取详细报告
            const reportResponse = await axios.get(`${CONFIG.baseURL}/ab-test/report`);
            const report = reportResponse.data;

            console.log('\n🎯 性能对比结果:');
            console.log(`   响应时间: 原版 ${report.performance.responseTime.original}ms vs 优化版 ${report.performance.responseTime.optimized}ms`);
            console.log(`   速度提升: ${report.performance.responseTime.improvement.toFixed(1)}%`);
            console.log(`   Token减少: ${report.performance.tokenUsage.reduction.toFixed(1)}%`);

            console.log('\n🎭 质量对比结果:');
            console.log(`   回复长度保持: ${report.quality.responseLength.retention.toFixed(1)}%`);
            console.log(`   名人引用保持: ${report.quality.celebrityReferences.retention.toFixed(1)}%`);
            console.log(`   情绪准确性保持: ${report.quality.emotionAccuracy.retention.toFixed(1)}%`);

            console.log('\n💡 推荐建议:');
            console.log(`   建议版本: ${report.recommendation.version === 'optimized' ? '优化版' : '原版'}`);
            console.log(`   置信度: ${report.recommendation.confidence}`);
            console.log(`   理由: ${report.recommendation.summary}`);

            // 生成HTML报告
            const htmlResponse = await axios.get(`${CONFIG.baseURL}/ab-test/report.html`);
            console.log('\n📄 详细HTML报告已生成，可通过以下链接查看:');
            console.log(`   ${CONFIG.baseURL}/ab-test/report.html`);

            // 保存测试执行摘要
            this.saveTestSummary(report);

        } catch (error) {
            console.error('❌ 报告生成失败:', error.message);
        }
    }

    saveTestSummary(report) {
        const summary = {
            testExecution: {
                startTime: this.startTime.toISOString(),
                endTime: new Date().toISOString(),
                duration: moment().diff(moment(this.startTime), 'minutes'),
                totalTestCases: testCases.length,
                runsPerCase: CONFIG.runsPerTest,
                successfulRuns: this.results.filter(r => r.success).length,
                failedRuns: this.results.filter(r => !r.success).length
            },
            performanceResults: report.performance,
            qualityResults: report.quality,
            recommendation: report.recommendation,
            testCaseBreakdown: this.generateTestCaseBreakdown()
        };

        const fs = require('fs');
        const summaryPath = './ab_test_execution_summary.json';
        
        try {
            fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
            console.log(`\n💾 测试执行摘要已保存到: ${summaryPath}`);
        } catch (error) {
            console.error('❌ 保存摘要失败:', error.message);
        }
    }

    generateTestCaseBreakdown() {
        const breakdown = {};
        
        for (const testCase of testCases) {
            const caseResults = this.results.filter(r => r.testCaseId === testCase.id && r.success);
            if (caseResults.length > 0) {
                breakdown[testCase.category] = {
                    count: caseResults.length,
                    avgResponseTime: Math.round(
                        caseResults.reduce((sum, r) => sum + r.responseTime, 0) / caseResults.length
                    ),
                    avgCommentaryLength: Math.round(
                        caseResults.reduce((sum, r) => sum + r.commentary.length, 0) / caseResults.length
                    )
                };
            }
        }
        
        return breakdown;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const runner = new ABTestRunner();
    
    console.log('🧪 DeepSeek Prompt A/B测试自动化脚本');
    console.log('=' * 50);
    
    runner.runAllTests().then(() => {
        console.log('\n✅ 测试完成，进程即将退出');
        process.exit(0);
    }).catch(error => {
        console.error('\n❌ 测试执行失败:', error);
        process.exit(1);
    });
}

module.exports = ABTestRunner;