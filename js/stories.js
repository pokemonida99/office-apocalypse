// 小劇場劇本（theater.js 演）：每年開場一段＋「今年哪裡不一樣」字卡、每年結尾一段
// 角色個性照《不想上班／我想離職》：小葵＝菜鳥設計師、阿傑＝老鳥設計師、小米＝客服、Vivi＝老闆、Kevin＝說「用 AI 就好」的特助
// 第 6 年起的年度主題放在 THEMES（v0.13），開場也走這裡
export const THEMES = [
  { id: 'typhoon', name: '颱風季', icon: '🌀', desc: '風會把手上的貨吹掉幾個，窗外下大雨；颱風假那天收入 ×1.5' },
  { id: 'winter', name: '景氣寒冬', icon: '❄️', desc: '景氣不好，所有收入減半；年度目標也降成 7 成' },
  { id: 'anniv', name: '週年慶', icon: '🎉', desc: '客人一直湧進來，售價 ×1.5，但進貨要跑更快' },
  { id: 'robot', name: 'AI 機器人導入', icon: '🤖', desc: 'Kevin 帶來兩台 AI 機器人，會幫忙搬貨，也會把貨送錯店' },
  { id: 'complain', name: '小米客訴週', icon: '😡', desc: '常有客人回來客訴：走過去選「退款」或「重做」，放著不管小米會幫你加倍賠錢' },
  { id: 'trip', name: '員工旅遊年', icon: '🏖️', desc: '頂樓變海灘，遊樂設施門票 ×2' },
  { id: 'night', name: '加班地獄', icon: '🌙', desc: '辦公室變夜景，咖啡和便當大賣（售價 ×1.3），走路慢一點' },
];
export const themeOf = (year) => year >= 6 ? THEMES[(year - 6) % THEMES.length] : null;

export function yearScript(year, ctx = {}) {
  const bonus = ctx.bonus ? `所有收入永久 ×${ctx.bonus.toFixed(2)}` : '收入加成又多了一點';
  if (year === 2) return {
    title: '第 2 年　新辦公室',
    cast: { kui: { x: -1.6 }, jie: { x: -0.4 }, vivi: { x: 4.6, hidden: true }, kevin: { x: 4.6, hidden: true } },
    steps: [
      { who: 'vivi', face: 'smug', text: '恭喜大家！公司搬進新辦公室了～', act: [['enter', 'vivi', 'right', 1.3]] },
      { who: 'kui', face: 'happy', text: '哇！還有電梯耶！', act: [['jump', 'kui'], ['emote', 'kui', '✨']] },
      { who: 'jie', face: 'smug', text: '聽說頂樓是遊樂園，2 樓還能布置自己的辦公室。' },
      { who: 'vivi', face: 'happy', text: '對了，我請了一位特助，大家歡迎～', act: [['walk', 'vivi', 0.6], ['enter', 'kevin', 'right', 2.0]] },
      { who: 'kevin', face: 'smug', text: '大家好，我是 Kevin。以後很多事情……用 AI 就好了。', act: [['emote', 'kui', '💢'], ['emote', 'jie', '💦']] },
      { who: 'kui', face: 'angry', text: '（這個人看起來會來搗亂……）' },
    ],
    card: { title: '第 2 年哪裡不一樣', items: ['🛗 可以搭電梯：2F 辦公室、RF 頂樓遊樂園', '🤖 特助 Kevin 會說「用 AI 就好」，快去揍跑他', `🏢 ${bonus}`] },
  };
  if (year === 3) return {
    title: '第 3 年　早餐街開張',
    wall: 0xfff1dd,
    cast: { kui: { x: -1.2 }, mi: { x: 0.2 }, yan: { x: -4.6, hidden: true }, heilun: { x: 4.6, hidden: true } },
    steps: [
      { who: 'kui', face: 'shock', text: '咦？後面的牆被打通了！', act: [['shake'], ['emote', 'kui', '❗']] },
      { who: 'mi', face: 'happy', text: '後面開了早餐街！有手搖飲、早餐店跟甜點店～' },
      { who: 'yan', face: 'tired', text: '急件！客戶十分鐘後要開會，誰幫我拿東西！', act: [['enter', 'yan', 'left', -2.4], ['emote', 'yan', '💦']] },
      { who: 'heilun', face: 'smug', text: '我帶了幾個大客戶來喔～業績算我的。', act: [['enter', 'heilun', 'right', 1.8]] },
      { who: 'kui', face: 'cry', text: '工讀生今天直接報到了，可是我好像更忙了……', act: [['emote', 'kui', '💧']] },
    ],
    card: { title: '第 3 年哪裡不一樣', items: ['🧋 後牆打通：早餐街三攤', '📋 PM 小燕的限時急件、🤝 業務黑輪帶 VIP（會抽成）', '👟 兩個工讀生直接報到', '🚪 後門：早餐街要去搬原料、垃圾車來了要丟垃圾、外送員來拿單'] },
  };
  if (year === 4) return {
    title: '第 4 年　總務部報到',
    wall: 0xeef4ff,
    cast: { kui: { x: -1.7 }, cha: { x: -0.55 }, qiang: { x: 0.55 }, senpai: { x: 1.7 } },
    steps: [
      { who: 'kui', face: 'happy', text: '今年來了總務部！大家好～', act: [['emote', 'kui', '👋']] },
      { who: 'cha', face: 'happy', text: '阿強～這箱好重喔，你幫人家搬好不好？', act: [['face', 'cha', 'right'], ['emote', 'cha', '💕']] },
      { who: 'qiang', face: 'smug', text: '交給我！', act: [['jump', 'qiang']] },
      { who: 'senpai', face: 'tired', text: '……又來了。', act: [['face', 'senpai', 'left']] },
      { who: 'qiang', face: 'shock', text: '哇！電風扇！我的帽子！！', act: [['cap', 'qiang'], ['shake']] },
      { who: 'senpai', face: 'smug', text: '他很在意這個，大家當作沒看到。', act: [['emote', 'qiang', '💦']] },
      { who: 'senpai', face: 'tired', text: '對了，這棟的機器很舊。壞了就來總務部窗口報修。', act: [['face', 'senpai', 'cam']] },
      { who: 'cha', face: 'happy', text: '修東西就交給阿強囉～人家去找大家聊天💕', act: [['emote', 'cha', '💬']] },
    ],
    card: { title: '第 4 年哪裡不一樣', items: ['🔧 總務部成立：茶茶、阿強、學姊', '⚠️ 機器會故障、停止出貨：去總務部窗口報修，阿強會去修', '💬 茶茶會拉人聊天害人罷工，過去打斷她；阿強被帶走時學姊會去拉回來', '💧 阿強、學姊會順手換飲水機的水', '🚪 阿強也會幫後門：丟垃圾、交外送、搬原料'] },
  };
  if (year === 5) return {
    title: '第 5 年',
    wall: 0xfdf0e6,
    cast: { kui: { x: -0.8 }, jie: { x: 0.8 } },
    steps: [
      { who: 'jie', face: 'smug', text: '第五年了啊……你最近在看什麼？', act: [['face', 'jie', 'left']] },
      { who: 'kui', face: 'happy', text: '國外設計學校的資料……我想去看看更大的世界。', act: [['emote', 'kui', '✈️']] },
      { who: 'jie', face: 'happy', text: '去啊。我也一直想開自己的工作室。', act: [['emote', 'jie', '💡']] },
      { who: 'kui', face: 'tired', text: '可是……大家怎麼辦？' },
      { who: 'jie', face: 'smug', text: '尾牙那天再決定吧。', act: [['face', 'jie', 'cam']] },
    ],
    card: { title: '第 5 年哪裡不一樣', items: ['✉️ 今年尾牙可以「遞辭呈」，看小葵的離職結局', '🏢 不遞也可以繼續上班，第 10 年還有另一個結局', `🏢 ${bonus}`] },
  };
  const th = themeOf(year);
  if (th) return {
    title: `第 ${year} 年　${th.icon} ${th.name}`,
    wall: { typhoon: 0xdfe6ee, winter: 0xe4ecf4, anniv: 0xffeede, robot: 0xe6ecf5, complain: 0xfdeeee, trip: 0xe8f7ff, night: 0x2a3550 }[th.id],
    floor: th.id === 'night' ? 0x6b5a48 : undefined,
    cast: { kui: { x: -1.2 }, ...(th.id === 'robot' ? { kevin: { x: 1.2 } } : ['anniv', 'trip', 'winter'].includes(th.id) ? { vivi: { x: 1.2 } } : th.id === 'complain' ? { mi: { x: 1.2 } } : { jie: { x: 1.2 } }) },
    steps: ({
      typhoon: [{ who: 'kui', face: 'shock', text: '颱風要來了！外面風好大！', act: [['shake'], ['emote', 'kui', '🌀']] }, { who: 'jie', face: 'tired', text: '手上的貨抱緊一點，會被吹掉喔。' }],
      winter: [{ who: 'vivi', face: 'tired', text: '今年景氣寒冬……大家的收入都要先打對折了。', act: [['emote', 'vivi', '❄️']] }, { who: 'kui', face: 'cry', text: '年終呢？', act: [['emote', 'kui', '💧']] }, { who: 'vivi', face: 'smug', text: '目標我也降一點啦，撐過今年就好！' }],
      complain: [{ who: 'mi', face: 'angry', text: '這禮拜客訴電話爆炸了！客人還會直接跑回來找你。', act: [['shake'], ['emote', 'mi', '😡']] }, { who: 'kui', face: 'shock', text: '那要怎麼辦？' }, { who: 'mi', face: 'tired', text: '走過去看是要退錢，還是重做一份給他。放著不管，我只好加倍賠了……' }],
      anniv: [{ who: 'vivi', face: 'smug', text: '今年是週年慶！客人會多到爆～', act: [['emote', 'vivi', '🎉']] }, { who: 'kui', face: 'tired', text: '（又要跑更快了……）', act: [['emote', 'kui', '💦']] }],
      robot: [{ who: 'kevin', face: 'smug', text: '我帶了兩台 AI 機器人，以後搬貨交給它們就好。', act: [['emote', 'kevin', '🤖']] }, { who: 'kui', face: 'angry', text: '上次它把咖啡送去印表機欸……', act: [['emote', 'kui', '💢']] }],
      trip: [{ who: 'vivi', face: 'happy', text: '今年員工旅遊！頂樓直接變海灘～', act: [['emote', 'vivi', '🏖️']] }, { who: 'kui', face: 'happy', text: '那我們還要上班嗎？', act: [['jump', 'kui']] }],
      night: [{ who: 'kui', face: 'tired', text: '今年……是不是都沒下班過？', act: [['emote', 'kui', '🌙']] }, { who: 'jie', face: 'tired', text: '泡麵跟咖啡賣得特別好，你說呢。' }],
    })[th.id],
    card: { title: `第 ${year} 年哪裡不一樣`, items: [`${th.icon} 年度主題：${th.name}`, th.desc, year === 10 ? '✉️ 今年尾牙可以「遞辭呈」，看結局二' : `🏢 ${bonus}`] },
  };
  return null;
}

// 年度結尾（尾牙前）：老闆宣布、大家歡呼
export function yearEndScript(year) {
  return {
    title: `第 ${year} 年　結算`,
    wall: 0xfff0d6,
    cast: { kui: { x: -1.6 }, vivi: { x: 0 }, jie: { x: 1.6 } },
    steps: [
      { who: 'vivi', face: 'smug', text: `第 ${year} 年結束了！大家辛苦了～`, act: [['emote', 'vivi', '🎉']] },
      { who: 'kui', face: 'happy', text: '耶——！終於可以吃尾牙了！', act: [['jump', 'kui'], ['jump', 'jie']] },
      { who: 'jie', face: 'smug', text: year >= 5 ? '今年尾牙……有人有話要說吧？' : '今年的年終應該會多一點吧？', act: [['emote', 'jie', '😏']] },
      { who: 'vivi', face: 'happy', text: '走！上台領獎！', auto: 1.6 },
    ],
  };
}

// ---------- 離職結局（第 5 年、第 10 年尾牙「遞辭呈」）：寫實劇照＋小葵的旁白，主角是小葵，阿傑稍微帶到 ----------
// 劇照用 GPT 照《我想離職》系列的小葵、阿傑參考照畫（art/ending/*.webp）。用阿傑或小葵過關都看同一個結局
export const ENDINGS = {
  dream: { no: 1, year: 5, title: '結局一　追夢', icon: '✈️', shots: [
    ['e5_1', '第五年的某個晚上，我又在辦公室待到很晚。桌上那份國外設計學校的簡章，我已經看了好幾遍。'],
    ['e5_2', '隔天早上，我把信封放在老闆桌上。手有點抖，但心裡很清楚。'],
    ['e5_3', '收東西的時候，螢幕上貼滿了大家的便利貼。「加油！」「要回來看我們喔！」'],
    ['e5_4', '出發那天，機場好亮。原來離開，也可以是往前走。'],
    ['e5_5', '在新的城市，我每天都在畫畫。那些在茶水間搬咖啡的日子，好像都變成了養分。'],
    ['e5_6', '聽說阿傑也開了自己的工作室。我們偶爾視訊，他還是老樣子，嘴上說不累。'],
  ] },
  studio: { no: 2, year: 10, title: '結局二　自己的工作室', icon: '🏠', shots: [
    ['e10_1', '第十年，我終於開了自己的工作室。剪綵那天，好多熟悉的臉都來了。'],
    ['e10_2', '現在換我帶新人了。看著他們手忙腳亂，就想起當年抱著水桶衝刺的自己。'],
    ['e10_3', '阿傑升上了部門經理。他說：「你走了，設計部總要有人撐著。」'],
  ] },
};
export const endingOfYear = (y) => Object.entries(ENDINGS).find(([, e]) => e.year === y)?.[0] || null;
