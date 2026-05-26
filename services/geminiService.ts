import { GoogleGenAI } from "@google/genai";
import { Platform, TopicIdea, Script, ShootingGuide, PublishKit, ScriptLine } from "../types";

// ── Provider detection ────────────────────────────────────────────────────────
// Priority: OpenRouter → Gemini → mock fallback
const OPENROUTER_KEY  = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL= process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
const GEMINI_KEY      = process.env.GEMINI_API_KEY ?? process.env.API_KEY;

export function activeProvider(): 'openrouter' | 'gemini' | 'mock' {
  if (OPENROUTER_KEY) return 'openrouter';
  if (GEMINI_KEY)     return 'gemini';
  return 'mock';
}

// ── OpenRouter (OpenAI-compatible) ────────────────────────────────────────────
async function askOpenRouter(prompt: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Short Video Assistant',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的短视频内容策划。请严格按照用户要求的 JSON 格式返回结果，不要包含任何 markdown 标记、代码块或额外解释，只输出纯 JSON。',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned empty content');
  // 兼容部分模型用 markdown 代码块包裹 JSON 的情况
  return extractJSON(content);
}

// 从可能含 markdown 的字符串中提取 JSON
function extractJSON(text: string): string {
  // 去掉 ```json ... ``` 或 ``` ... ```
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  // 尝试直接找第一个 { 或 [
  const start = text.search(/[{[]/);
  if (start !== -1) return text.slice(start);
  return text;
}

// ── Gemini ────────────────────────────────────────────────────────────────────
async function askGemini(prompt: string): Promise<string> {
  if (!GEMINI_KEY) throw new Error('NO_GEMINI_KEY');
  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
  const r = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });
  if (!r.text) throw new Error('Gemini returned empty');
  return r.text;
}

// ── Unified ask() ─────────────────────────────────────────────────────────────
async function ask(prompt: string): Promise<string> {
  if (OPENROUTER_KEY) return askOpenRouter(prompt);
  if (GEMINI_KEY)     return askGemini(prompt);
  throw new Error('NO_KEY');
}

// ── 1. 选题 ───────────────────────────────────────────────────────────────
export async function genTopics(niche: string, platform: Platform): Promise<TopicIdea[]> {
  const platformHints: Record<Platform, string> = {
    抖音:    "15-60秒竖屏，情绪驱动，强钩子，快剪",
    小红书:  "图文或1-3分钟，干货种草，真实感，标题含关键词",
    B站:     "3-15分钟横屏，深度内容，知识性，弹幕文化",
    视频号:  "1-3分钟，偏中年，温情实用，微信生态裂变",
    YouTube: "5-20分钟，SEO驱动，结构清晰，订阅引导",
  };

  const raw = await ask(`
你是中国顶级短视频内容策划，精通${platform}生态（${platformHints[platform]}）。

创作者赛道：${niche}

生成4个高潜力选题。每个选题必须：
- 有强烈好奇心/情绪/信息差驱动
- 符合${platform}算法偏好
- 普通创作者能独立完成

返回JSON数组，不要markdown标记：
[
  {
    "id": "1",
    "title": "标题（含emoji，≤20字）",
    "hook": "前3秒钩子（≤25字，制造悬念/冲击/共鸣）",
    "angle": "差异化切入角度（一句话）",
    "audience": "精准人群画像（≤15字）",
    "potential": "预估量级（如：10万+）"
  }
]`);

  return JSON.parse(raw) as TopicIdea[];
}

// ── 3. 脚本 ───────────────────────────────────────────────────────────────
export async function genScript(
  topic: TopicIdea,
  platform: Platform,
  duration: string
): Promise<Script> {
  const raw = await ask(`
你是专业${platform}短视频编剧，写高完播率分镜脚本。

选题：${topic.title}
钩子：${topic.hook}
角度：${topic.angle}
目标时长：${duration}

返回JSON（不要markdown）：
{
  "duration": "实际预估时长",
  "lines": [
    {
      "ts": "0:00-0:04",
      "type": "hook",
      "copy": "口播文案（口语化，能直接读）",
      "visual": "画面/动作/转场说明"
    },
    {
      "ts": "0:04-0:12",
      "type": "narration",
      "copy": "...",
      "visual": "..."
    }
  ]
}

type枚举：hook / narration / action / broll / cta
lines应有6-10条，覆盖完整叙事弧。文案要接地气，直接可用。`);

  return JSON.parse(raw) as Script;
}

// ── 4. 拍摄指南 ───────────────────────────────────────────────────────────
export async function genShootingGuide(
  script: Script,
  platform: Platform
): Promise<ShootingGuide> {
  const visualSummary = script.lines
    .map(l => `[${l.ts}] ${l.type}: ${l.visual}`)
    .join("\n");

  const raw = await ask(`
你是短视频拍摄导演，为手机竖屏独立创作者设计拍摄方案。

平台：${platform}
脚本画面摘要：
${visualSummary}

返回JSON（不要markdown）：
{
  "gear": [
    "设备1（具体型号或类型，价格区间）",
    "设备2"
  ],
  "shots": [
    {
      "order": 1,
      "ref": "对应脚本时间段",
      "angle": "机位名称（如：正面平拍/45°仰角/俯拍）",
      "duration": "建议拍摄时长",
      "notes": "具体执行要点（动作、站位、表情）"
    }
  ],
  "lighting": [
    "打光要点（具体可操作）"
  ],
  "editing": [
    "剪辑建议（节奏/字幕/BGM/转场）"
  ]
}

gear 4-5条，shots 4-6条，lighting 3条，editing 4条。实用为主。`);

  return JSON.parse(raw) as ShootingGuide;
}

// ── 5. 发布配置 ───────────────────────────────────────────────────────────
export async function genPublishKit(
  topic: TopicIdea,
  platform: Platform
): Promise<PublishKit> {
  const bestTimes: Record<Platform, string> = {
    抖音:    "12:00–13:00 / 18:00–20:00 / 21:00–22:00",
    小红书:  "07:00–09:00 / 12:00–13:00 / 21:00–23:00",
    B站:     "17:00–21:00（工作日）/ 10:00–12:00（周末）",
    视频号:  "08:00–10:00 / 20:00–22:00",
    YouTube: "15:00–17:00（美西）/ 周四–周六",
  };

  const raw = await ask(`
你是${platform}运营专家，写高点击率发布配置。

选题：${topic.title}
钩子：${topic.hook}
人群：${topic.audience}
平台：${platform}
最佳时段参考：${bestTimes[platform]}

返回JSON（不要markdown）：
{
  "title": "发布标题（≤20字，含emoji，高点击率）",
  "caption": "正文/简介（3-5句，含互动引导，口语化）",
  "hashtags": ["话题1","话题2","话题3","话题4","话题5","话题6","话题7","话题8"],
  "bestTime": "${bestTimes[platform]}",
  "coverTip": "封面构图建议（具体：构图/文字/表情）",
  "tips": [
    "${platform}特有运营技巧1",
    "技巧2",
    "技巧3"
  ]
}

hashtags选大流量+精准垂类的组合。`);

  return JSON.parse(raw) as PublishKit;
}

// ── Mock fallbacks（无API Key时使用） ─────────────────────────────────────
export function mockTopics(niche: string): TopicIdea[] {
  return [
    { id:"1", title:`🔥 ${niche}入门最容易踩的3个坑`, hook:"我花了6个月和5000块踩坑，今天全告诉你", angle:"踩坑总结，降低试错成本", audience:"刚入门的新手", potential:"50万+" },
    { id:"2", title:`💡 靠${niche}月入过万的真实路径`, hook:"99%的人不知道这个变现方式，同行看到可能会删掉我这条", angle:"揭秘信息差，激发curiosity", audience:"想副业变现的上班族", potential:"百万+" },
    { id:"3", title:`📈 坚持${niche}30天，我变了多少`, hook:"30天前和现在对比，连我自己都不敢相信", angle:"变化对比，情绪共鸣", audience:"想改变现状的普通人", potential:"30万+" },
    { id:"4", title:`⚡ ${niche}这件事，越早知道越好`, hook:"如果你也想做这个，先停下来听我说完", angle:"经验输出，建立专家人设", audience:"有意向但还在观望的人", potential:"20万+" },
  ];
}

export function mockScript(topic: TopicIdea): Script {
  const lines: ScriptLine[] = [
    { ts:"0:00-0:04", type:"hook",      copy: topic.hook, visual:"正对镜头，表情坚定/惊讶，可加字幕特效" },
    { ts:"0:04-0:12", type:"narration", copy:"我做这件事已经一年了，踩过很多坑，今天全部告诉你们，直接跳过弯路。", visual:"面对镜头口播，背景整洁" },
    { ts:"0:12-0:28", type:"narration", copy:"第一点，也是最重要的——你必须先搞清楚自己的定位。很多人一上来就拍，结果100条没有一条爆，就是因为这个。", visual:"口播+手势辅助，切换字幕动画" },
    { ts:"0:28-0:42", type:"action",    copy:"第二点，内容要有信息增量。观众看你的视频要能带走点什么，不然他为什么要关注你？", visual:"切换演示画面/PPT/手机截图展示对比" },
    { ts:"0:42-0:52", type:"broll",     copy:"第三点，坚持比什么都重要。前100条可能没什么水花，量变一定引起质变。", visual:"B-roll：日历翻页/工作场景/创作过程" },
    { ts:"0:52-1:00", type:"cta",       copy:"如果对你有帮助，点个赞支持！评论区告诉我你在做哪个方向，我来帮你分析～", visual:"面对镜头，微笑，手指向下方点赞区" },
  ];
  return { duration:"约60秒", lines };
}

export function mockShootingGuide(): ShootingGuide {
  return {
    gear: [
      "手机（推荐竖拍4K，固定在支架上）",
      "手机三脚架 / 稳定器（50元以内即可）",
      "环形补光灯（室内必备，¥80-200）",
      "领夹麦克风（收音效果是手机麦的10倍，¥50-200）",
      "白色泡沫板（充当反光板，消除阴影）",
    ],
    shots: [
      { order:1, ref:"0:00-0:04 Hook",      angle:"正面平拍（镜头≈眼高）",      duration:"拍5-8条备选", notes:"开口前深呼吸，第一句话要有力度，眼神看镜头不看屏幕" },
      { order:2, ref:"0:04-0:28 口播主体",  angle:"正面略微仰角（显气场）",     duration:"按脚本段落分开拍，每段2-3条", notes:"语速比日常稍快，关键词用手势强调，保持稳定站位" },
      { order:3, ref:"0:28-0:42 演示段",    angle:"俯拍桌面 或 侧拍操作",       duration:"每个动作拍10秒以上留余量", notes:"展示产品/操作/对比，后期剪辑覆盖在口播上" },
      { order:4, ref:"0:42-0:52 B-roll",    angle:"多角度补充空镜",             duration:"各10秒", notes:"日历、工作台、道具特写，增加视频质感" },
      { order:5, ref:"0:52-1:00 CTA",       angle:"正面，略靠近镜头",           duration:"拍3条备选", notes:"语气轻松带微笑，说完保持3秒再停录" },
    ],
    lighting: [
      "最优：面向窗户自然光，柔和均匀，避免正午强光",
      "室内：45°斜前方放补光灯，对侧泡沫板反光消除阴影",
      "避坑：头顶正上方吊灯会产生眼袋阴影，务必关掉",
    ],
    editing: [
      "节奏：口播每段不超过5秒切一次，保持张力",
      "字幕：全程字幕，关键词加粗+彩色高亮，字号够大",
      "BGM：纯音乐压到口播音量的15-20%，节奏与内容匹配",
      "开头3秒绝不放logo/片头，直接从第一句话开始",
    ],
  };
}

export function mockPublishKit(topic: TopicIdea, platform: Platform): PublishKit {
  const bestTimes: Record<Platform, string> = {
    抖音:"12:00–13:00 / 18:00–20:00", 小红书:"07:00–09:00 / 21:00–23:00",
    B站:"17:00–21:00", 视频号:"08:00–10:00 / 20:00–22:00", YouTube:"15:00–17:00（美西）",
  };
  return {
    title: topic.title,
    caption: `${topic.hook}\n\n今天把自己踩过的坑全部分享出来，希望对你有帮助～\n\n你们有什么问题评论区告诉我！`,
    hashtags: ["新手必看","干货分享","涨粉攻略","内容创作","副业","个人成长","经验分享","学习"],
    bestTime: bestTimes[platform],
    coverTip: "选视频中表情最自然的帧；叠加大字标题（白字黑边或反色），字在左侧，人在右侧；避免文字被平台UI遮挡",
    tips: [
      `发布后前30分钟密集回复评论，提升${platform}推荐权重`,
      "第一条评论自己写一个引导性问题，促进互动",
      "蹭平台当天热门话题/挑战赛，借助官方流量扶持",
    ],
  };
}
