const QUESTIONS = [
    '你和你最好的朋友驾驶光速飞船探索宇宙二十年，遍历群星，没发现任何外星生命。朋友信仰崩塌，开启了飞船自爆程序…',
    '你被百发百中的狙击手瞄中…',
    '你被一个和你一模一样的仿生人囚禁在地下室…',
    '你和一个宇宙通缉犯被困在燃烧的飞船厕所里…',
    '你脚上绑着巨大铁块被沉入深海，更可怕的是，你能无限复活，每当因海水窒息而死又会立刻复活…',
    '你所在的飞机在万米高空上引擎无故熄灭…',
    '一群丧尸包围了你们宿舍，宿舍门岌岌可危…',
    '你的朋友其实是奉命来杀你的杀手，而TA此刻正打算对你出手…',
    '你被困在一座即将核爆的城市地下掩体中，出口被巨石堵死，氧气还能维持十分钟…',
    '你在深海潜艇中发现所有同伴都被未知病毒感染变成疯子，而你是唯一的正常人…',
    '你乘坐的太空电梯在距离地面3万米高度突然断缆，正在自由落体…',
    '你被关在一个每60秒缩小一半的魔法房间里，墙壁正在缓慢逼近…',
    '你发现自己被困在时间循环中，每次死亡后都会重置到同一个必死场景…',
    '你在外星监狱中醒来，发现自己被选为角斗士，必须在明天与不败冠军决斗…',
    '你被困在一艘失控的幽灵船上，船正驶向百慕大三角，而你听到了来自深海的呼唤…'
];

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const randomIndex = Math.floor(Math.random() * QUESTIONS.length);
    res.json({
        question_id: randomIndex + 1,
        prompt: QUESTIONS[randomIndex],
        total_questions: QUESTIONS.length
    });
};
