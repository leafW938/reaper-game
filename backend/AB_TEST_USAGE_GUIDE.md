# 📚 DeepSeek Prompt A/B测试系统使用指南

## 🎯 系统概述

本A/B测试系统专为优化DeepSeek Prompt而设计，能够在不影响正常游戏流程的情况下，对比测试原版prompt和优化版prompt的性能与质量差异。

## 🚀 快速开始

### 1. 启用A/B测试

```bash
# 方法1: 环境变量启动
AB_TEST_ENABLED=true node index.js

# 方法2: 修改.env文件
echo "AB_TEST_ENABLED=true" >> .env
node index.js
```

### 2. 检查测试状态

```bash
curl http://localhost:3000/ab_test/status
```

预期输出:
```json
{
  "enabled": true,
  "originalCount": 0,
  "optimizedCount": 0,
  "totalTests": 0,
  "startTime": "2025-07-19T11:21:29.959Z"
}
```

### 3. 运行测试用例

```bash
# 使用提供的快速测试脚本
node quick_test.js

# 或手动测试单个用例
curl -X POST http://localhost:3000/reaper \
  -H "Content-Type: application/json" \
  -d '{"answer":"测试回答","player_id":"test_user","nickname":"测试员"}'
```

### 4. 查看测试报告

```bash
# JSON格式报告
curl http://localhost:3000/ab_test/report

# HTML格式报告
open http://localhost:3000/ab_test/report.html
```

## 📊 API端点详解

### `/ab_test/status` - 获取测试状态
- **方法**: GET
- **描述**: 返回A/B测试的当前状态
- **响应**: 测试开关状态、各版本测试次数、开始时间

### `/ab_test/report` - JSON格式报告
- **方法**: GET
- **描述**: 生成详细的JSON格式对比报告
- **要求**: 至少需要原版和优化版各1次成功测试

### `/ab_test/report.html` - HTML格式报告
- **方法**: GET
- **描述**: 生成美观的HTML格式报告，适合演示和分享
- **特点**: 包含样式、图表和详细案例对比

## 🔧 系统配置

### 核心配置 (ab_test_system.js)

```javascript
const AB_TEST_CONFIG = {
    enabled: process.env.AB_TEST_ENABLED === 'true',
    optimizedPromptRatio: 0.5, // 50%概率使用优化版本
    logFilePath: path.join(__dirname, 'ab_test_logs.json'),
    reportPath: path.join(__dirname, 'ab_test_report.html')
};
```

### 可调整参数

1. **optimizedPromptRatio**: 优化版本使用比例（0.0-1.0）
2. **logFilePath**: 测试数据存储路径
3. **reportPath**: HTML报告输出路径

## 📈 测试数据结构

### 单次测试记录格式

```javascript
{
    timestamp: "2025-07-19T11:28:24.652Z",
    version: "optimized", // 或 "original"
    input: "用户回答内容",
    response: "AI完整响应",
    responseTime: 22015, // 毫秒
    tokenCount: 711, // 估算token数量
    success: true,
    error: null,
    scores: { /* 评分详情 */ },
    commentary: "死神评论内容",
    verdict: "你活下来了" // 或 "你死了"
}
```

### 聚合报告格式

```javascript
{
    generatedAt: "时间戳",
    testPeriod: { start: "开始时间", end: "结束时间" },
    sampleSize: { original: 3, optimized: 5, total: 8 },
    performance: {
        responseTime: { original: 27498, optimized: 22015, improvement: 19.9 },
        tokenUsage: { original: 1241, optimized: 711, reduction: 42.7 },
        successRate: { original: 100, optimized: 100, change: 0 }
    },
    quality: {
        responseLength: { original: 228, optimized: 224, retention: 98.4 },
        celebrityReferences: { original: 33.3, optimized: 20, retention: 60 },
        emotionAccuracy: { original: 10, optimized: 10, retention: 100 }
    },
    examples: { /* 原版和优化版的示例回复 */ },
    recommendation: {
        version: "original", // 推荐版本
        confidence: "high", // 置信度
        reasons: ["原因列表"],
        summary: "推荐总结"
    }
}
```

## 📋 最佳实践

### 1. 测试用例设计

确保测试用例覆盖不同类型：
- **逻辑严密类**: 测试prompt对理性回答的处理
- **创意天马行空类**: 测试对抽象度高回答的评估
- **哲学思辨类**: 测试名人引用和深度思考能力
- **情感丰富类**: 测试情绪感染力评估
- **简短无聊类**: 测试对低质量回答的处理
- **包含惩罚项类**: 测试惩罚机制的有效性

### 2. 样本数量建议

- **最小样本**: 每个版本至少5次测试
- **推荐样本**: 每个版本10-20次测试
- **可靠样本**: 每个版本30+次测试

### 3. 质量评估标准

#### 性能指标
- **响应时间**: 目标提升20-30%
- **Token消耗**: 目标减少15-25%
- **成功率**: 必须保持95%+

#### 质量指标  
- **回复长度**: 保持90%+
- **名人引用**: 保持85%+ (死神AI核心特色)
- **情绪准确性**: 保持95%+

### 4. 决策标准

#### 推荐使用优化版的条件:
- 性能提升 ≥ 20% 且 质量保持 ≥ 90%
- 或 性能提升 ≥ 15% 且 质量保持 ≥ 95%

#### 必须使用原版的情况:
- 名人引用能力下降 > 15%
- 回复长度下降 > 20%
- 续写结构缺失严重

## 🛠️ 故障排除

### 常见问题

1. **A/B测试未启用**
   ```bash
   # 检查环境变量
   echo $AB_TEST_ENABLED
   
   # 重新启动服务
   AB_TEST_ENABLED=true node index.js
   ```

2. **报告生成失败**
   ```
   错误: A/B测试未启用或数据不足
   解决: 确保两个版本都有至少1次成功测试
   ```

3. **Token估算不准确**
   ```javascript
   // 调整估算函数 (index.js)
   function estimateTokenCount(text) {
       // 可根据实际情况调整比例
       const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
       const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
       return Math.round(chineseChars * 1.5 + englishWords * 1);
   }
   ```

### 日志监控

```bash
# 查看测试日志
tail -f ab_test_logs.json

# 监控服务器日志
tail -f server.log | grep "A/B"
```

## 📚 文件结构

```
backend/
├── ab_test_system.js       # A/B测试核心系统
├── test_cases.js          # 15个预定义测试用例
├── quick_test.js          # 快速测试脚本
├── run_ab_test.js         # 完整自动化测试脚本
├── ab_test_logs.json      # 测试数据存储文件
├── ab_test_report.html    # 生成的HTML报告
├── FINAL_AB_TEST_REPORT.md # 最终分析报告
└── AB_TEST_USAGE_GUIDE.md # 本使用指南
```

## ⚡ 性能优化建议

### 减少测试延迟
```javascript
// quick_test.js 中调整延迟
await new Promise(resolve => setTimeout(resolve, 500)); // 500ms延迟
```

### 批量测试
```javascript
// 并发测试（谨慎使用，避免API限制）
const promises = testCases.map(testCase => runTest(testCase));
const results = await Promise.all(promises);
```

### 数据持久化
```javascript
// 定期备份测试数据
cp ab_test_logs.json ab_test_logs_backup_$(date +%Y%m%d).json
```

## 🔒 安全注意事项

1. **API密钥保护**: 确保.env文件不被提交到版本控制
2. **访问控制**: 生产环境建议限制A/B测试端点的访问
3. **数据隐私**: 测试日志包含用户输入，需妥善保管

## 📞 支持和维护

如有问题或建议，请参考:
- **系统日志**: server.log
- **测试数据**: ab_test_logs.json  
- **错误排查**: 检查DeepSeek API状态和网络连接

---

**版本**: 1.0  
**更新时间**: 2025-07-19  
**兼容性**: Node.js 14+, DeepSeek API v1