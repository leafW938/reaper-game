module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
        status: 'alive',
        service: 'Reaper AI Judge (Vercel Serverless)',
        version: '3.0.0',
        criteria: {
            '智慧创新': '独特思维、创造性解决方案、跳脱常规想象',
            '逻辑可行': '基本逻辑、因果关系、实现可能性',
            '情感深度': '人性光辉、情感共鸣、自我牺牲',
            '死神兴趣': '哲学思考、人文引用、生死理解'
        },
        survival_rule: '满足3项以上维度可存活'
    });
};
