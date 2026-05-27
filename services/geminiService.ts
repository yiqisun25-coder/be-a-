import { GoogleGenAI } from "@google/genai";
import { Platform, ShopInfo, TopicIdea, Script, ScriptLine, ShootingGuide, PublishKit } from "../types";

// ── API Settings (localStorage takes priority over .env) ──────────────────────
const ENV_BASE  = process.env.CUSTOM_API_BASE;
const ENV_KEY   = process.env.CUSTOM_API_KEY;
const ENV_MODEL = process.env.CUSTOM_API_MODEL ?? 'Qwen/Qwen2.5-72B-Instruct';

function getStored(): { base?: string; key?: string; model?: string } {
  try { return JSON.parse(localStorage.getItem('dianpu_api_settings') ?? '{}'); }
  catch { return {}; }
}

export function saveApiSettings(base: string, key: string, model: string) {
  localStorage.setItem('dianpu_api_settings', JSON.stringify({ base: base.trim(), key: key.trim(), model: model.trim() }));
}
export function loadApiSettings() {
  const s = getStored();
  return { base: s.base ?? ENV_BASE ?? '', key: s.key ?? '', model: s.model ?? ENV_MODEL };
}
export function clearApiSettings() { localStorage.removeItem('dianpu_api_settings'); }

function cBase():  string | undefined { const s = getStored(); return s.base  || ENV_BASE;  }
function cKey():   string | undefined { const s = getStored(); return s.key   || ENV_KEY;   }
function cModel(): string             { const s = getStored(); return s.model || ENV_MODEL; }

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const OR_KEY       = process.env.OPENROUTER_API_KEY;
const OR_MODEL     = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
const GEMINI_KEY   = process.env.GEMINI_API_KEY ?? process.env.API_KEY;

export type ProviderName = 'custom' | 'deepseek' | 'openrouter' | 'gemini' | 'mock';

export function activeProvider(): ProviderName {
  if (cBase() && cKey()) return 'custom';
  if (DEEPSEEK_KEY)       return 'deepseek';
  if (OR_KEY)             return 'openrouter';
  if (GEMINI_KEY)         return 'gemini';
  return 'mock';
}

export function providerLabel(): string {
  const base = cBase(), key = cKey();
  if (base && key) {
    try {
      const host = new URL(base).hostname;
      const parts = host.split('.');
      const name = parts.length >= 2 ? parts[parts.length - 2] : host;
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch { return 'Custom'; }
  }
  if (DEEPSEEK_KEY) return 'DeepSeek';
  if (OR_KEY)       return 'OpenRouter';
  if (GEMINI_KEY)   return 'Gemini';
  return '离线模式';
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
const SYS = '你是专业探店短视频策划。严格按要求返回纯 JSON，不含任何 markdown 或额外文字。';

async function askOpenAICompat(base: string, key: string, model: string, prompt: string, extraHeaders: Record<string,string> = {}, sys = SYS): Promise<string> {
  const url = base.replace(/\/$/, '') + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('API returned empty content');
  return content;
}

async function askGemini(prompt: string): Promise<string> {
  if (!GEMINI_KEY) throw new Error('NO_GEMINI_KEY');
  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
  const r = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
  if (!r.text) throw new Error('Gemini returned empty');
  return r.text;
}

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  const start = text.search(/[{[]/);
  return start !== -1 ? text.slice(start) : text;
}

async function ask(prompt: string, sys?: string): Promise<string> {
  const base = cBase(), key = cKey(), model = cModel();
  if (base && key) return askOpenAICompat(base, key, model, prompt, {}, sys ?? SYS);
  if (DEEPSEEK_KEY) return askOpenAICompat('https://api.deepseek.com/v1', DEEPSEEK_KEY, 'deepseek-chat', prompt, {}, sys ?? SYS);
  if (OR_KEY)       return askOpenAICompat('https://openrouter.ai/api/v1', OR_KEY, OR_MODEL, prompt, { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'Shop Explorer' }, sys ?? SYS);
  if (GEMINI_KEY)   return askGemini(prompt);
  throw new Error('NO_KEY');
}

// ── 店铺信息摘要（供 prompt 复用）────────────────────────────────────────────
function shopDesc(shop: ShopInfo): string {
  return `店名：${shop.name}
类型：${shop.type}
人均：${shop.avgPrice}
特色/卖点：${shop.highlights}${shop.area ? `\n区域：${shop.area}` : ''}`;
}

// ── 1. 选题 ───────────────────────────────────────────────────────────────────
export async function genTopics(shop: ShopInfo, platform: Platform): Promise<TopicIdea[]> {
  const platformHints: Record<Platform, string> = {
    '抖音本地生活': '竖屏15-60秒，钩子强，情绪驱动，带地址/团购引导',
    '小红书':      '种草笔记，真实感，标题含关键词，图文或短视频',
    '大众点评':    '客观评价，打分感，适合信息量大的测评风格',
    '视频号':      '温情真实，适合中年用户，朋友圈裂变属性',
    '快手':        '接地气，下沉市场，性价比和真实感优先',
    'TikTok':      '英文内容，竖屏15-60s，trending sounds，overseas Chinese or local audience，hook in first 2s，no watermark',
  };

  const raw = await ask(`平台：${platform}（${platformHints[platform]}）

${shopDesc(shop)}

为这家店想4个差异化的探店选题，每个角度不一样：测评型、种草型、探秘型、性价比型。

选题要求：
- 标题要有点击欲望，但不能标题党，要和店铺实际情况相关
- 钩子是前3秒的第一句话，要让人停下来看，可以是疑问、反差、悬念、直接说结论
- 每个选题的差异化要真实，不是换个说法的同一件事

返回JSON数组：
[
  {
    "id": "1",
    "title": "视频标题（含emoji，≤20字）",
    "hook": "开场第一句话（≤25字，直接可说，有记忆点）",
    "angle": "这条视频的核心差异化（一句话，说清楚和其他探店视频不一样在哪）",
    "audience": "最可能被这条视频吸引的人（≤15字）",
    "potential": "预估播放量级（如：5万+）"
  }
]`);

  return JSON.parse(extractJSON(raw)) as TopicIdea[];
}

// ── 3. 脚本 ───────────────────────────────────────────────────────────────────
export async function genScript(topic: TopicIdea, shop: ShopInfo, platform: Platform, duration: string): Promise<Script> {
  const angleGuide: Record<string, string> = {
    '种草': '像朋友推荐，有情绪和氛围感，重点在"为什么我爱这家"，不要罗列信息',
    '测评': '有态度的真实测评，给具体分数/对比，说出优缺点，观众信任你的判断',
    '探秘': '层层揭秘节奏，每段都留悬念，"你们绝对想不到…"、"等等这个…"',
    '性价比': '帮粉丝算账，具体报价、份量、对比，结论要斩钉截铁',
  };
  const angleKey = Object.keys(angleGuide).find(k => topic.angle.includes(k)) ?? '种草';

  const isTikTok = platform === 'TikTok';
  const raw = await ask(`你是一个真实的探店博主，正在给${platform}拍一条${duration}的探店视频。${isTikTok ? '\n注意：TikTok 受众为海外用户，口播文案请用英文，画面说明可用中文。标题和字幕用英文。' : ''}

店铺信息：
${shopDesc(shop)}

这条视频的方向：
标题：${topic.title}
开场钩子：${topic.hook}
内容角度：${topic.angle}

写作风格要求（${angleKey}型）：${angleGuide[angleKey]}

口播文案要求：
- 像真人说话，有口头语，不要念稿子感
- 有自己的观点和情绪（"真的绝了"、"说实话有点失望"、"但这个我没想到"）
- 具体，用细节说话，不用"味道不错"这种废话
- 适合${platform}用户的语气

画面说明要求：
- 每个镜头说清楚拍什么、怎么拍（角度、运动方式）
- 具体到能直接执行，比如"手持稳定器跟着走进去"不是"拍环境"

返回JSON：
{
  "duration": "预估时长",
  "lines": [
    {
      "ts": "0:00-0:05",
      "type": "hook",
      "copy": "口播（直接可读的文字）",
      "visual": "画面（具体可操作）"
    }
  ]
}

type只能用：hook / arrival / environment / product / price / verdict / cta
共7-9条，时间戳连续不断层。不要所有段落语气一样，要有起伏。`);

  return JSON.parse(extractJSON(raw)) as Script;
}

// ── 4. 拍摄指南 ───────────────────────────────────────────────────────────────
export async function genShootingGuide(script: Script, shop: ShopInfo): Promise<ShootingGuide> {
  const visualSummary = script.lines.map(l => `[${l.ts}] ${l.type}: ${l.visual}`).join('\n');

  const raw = await ask(`探店视频拍摄指南。

${shopDesc(shop)}

脚本画面摘要：
${visualSummary}

返回JSON：
{
  "gear": ["器材（具体，含价格参考）"],
  "shots": [
    {
      "order": 1,
      "ref": "对应脚本时间段",
      "angle": "机位（如：门头正面平拍）",
      "duration": "建议拍摄时长",
      "notes": "拍摄要点（具体动作/构图/注意事项）"
    }
  ],
  "lighting": ["打光建议"],
  "editing": ["剪辑建议"]
}

gear 4-5条，shots 5-7条（覆盖门头/环境/产品/价格牌/结账等），lighting 3条，editing 4条。`);

  return JSON.parse(extractJSON(raw)) as ShootingGuide;
}

// ── 5. 发布配置 ───────────────────────────────────────────────────────────────
export async function genPublishKit(topic: TopicIdea, shop: ShopInfo, platform: Platform): Promise<PublishKit> {
  const bestTimes: Record<Platform, string> = {
    '抖音本地生活': '11:00-13:00 / 17:00-19:00（饭点前后流量高）',
    '小红书':      '07:00-09:00 / 21:00-23:00',
    '大众点评':    '10:00-12:00 / 14:00-16:00',
    '视频号':      '08:00-10:00 / 20:00-22:00',
    '快手':        '12:00-14:00 / 20:00-22:00',
    'TikTok':      '19:00-21:00 local time / Tue-Thu peak',
  };

  const raw = await ask(`${platform}探店发布配置。

${shopDesc(shop)}

选题：${topic.title}
钩子：${topic.hook}
最佳时段：${bestTimes[platform]}

返回JSON：
{
  "title": "发布标题（≤20字，含emoji，高点击率）",
  "caption": "正文文案（3-5句，含店名/人均/推荐单品/互动引导，口语化）",
  "hashtags": ["话题1","话题2","话题3","话题4","话题5","话题6","话题7","话题8"],
  "bestTime": "${bestTimes[platform]}",
  "coverTip": "封面建议（构图/文字/视觉重点）",
  "tips": ["${platform}本地生活运营技巧1","技巧2","技巧3"]
}

hashtags 要包含：店名、品类、区域探店、${platform}相关话题的组合。`);

  return JSON.parse(extractJSON(raw)) as PublishKit;
}

// ── Mock fallbacks ────────────────────────────────────────────────────────────
export function mockTopics(shop: ShopInfo): TopicIdea[] {
  return [
    { id:'1', title:`🔍 实测${shop.name}，${shop.avgPrice}能吃到什么水平？`, hook:`附近的${shop.type}我都吃遍了，这家让我破防了`, angle:'测评型：客观评分，信息量大', audience:'附近想吃饭的上班族', potential:'5万+' },
    { id:'2', title:`✨ 藏在附近的宝藏${shop.type}！强烈安利`, hook:`这家店我已经来了三次了，今天必须给你们种草`, angle:'种草型：情绪驱动，真实推荐', audience:'喜欢探索本地好店的年轻人', potential:'3万+' },
    { id:'3', title:`🤫 ${shop.name}老板不让我拍，但我还是来了`, hook:`这家${shop.type}低调开了两年，附近人都不知道`, angle:'探秘型：制造悬念，激发好奇', audience:'好奇心强的本地用户', potential:'10万+' },
    { id:'4', title:`💰 ${shop.avgPrice}在${shop.name}能点啥？性价比测评`, hook:`花${shop.avgPrice}在这家${shop.type}到底值不值？我来告诉你`, angle:'性价比型：实用信息，帮助决策', audience:'注重性价比的消费者', potential:'8万+' },
  ];
}

export function mockScript(topic: TopicIdea, shop: ShopInfo): Script {
  const lines: ScriptLine[] = [
    { ts:'0:00-0:05', type:'hook',        copy: topic.hook, visual:'门头外正面拍，字幕特效强调，表情惊讶' },
    { ts:'0:05-0:12', type:'arrival',     copy:`这里是${shop.name}，就在${shop.area || '附近'}，${shop.type}，人均${shop.avgPrice}，今天带大家来实测。`, visual:'门头招牌全景，缓慢推进，带地址字幕' },
    { ts:'0:12-0:22', type:'environment', copy:`进来第一感觉——${shop.highlights.split('，')[0] || '环境不错'}。看这里…`, visual:'店内环境横扫镜头，重点拍特色装修或陈设' },
    { ts:'0:22-0:40', type:'product',     copy:`点了招牌的几样，来看看卖相…味道的话，${shop.highlights}，确实没让我失望。`, visual:'产品/服务特写，慢动作或定格展示，突出质感' },
    { ts:'0:40-0:50', type:'price',       copy:`价格方面，我点了这些，一共花了…人均下来${shop.avgPrice}左右，${shop.type}这个价位我觉得合理的。`, visual:'菜单/价格牌特写，或展示结账小票' },
    { ts:'0:50-0:57', type:'verdict',     copy:`总体来说，${shop.highlights}，值得来打卡。`, visual:'回到门头或店内，边说边点头' },
    { ts:'0:57-1:02', type:'cta',         copy:`你们附近有这样的宝藏店吗？评论区告诉我，关注我带你发现更多本地好店～`, visual:'面对镜头，微笑，手指向下方点赞区' },
  ];
  return { duration:'约60秒', lines };
}

export function mockShootingGuide(shop: ShopInfo): ShootingGuide {
  return {
    gear: [
      '手机（竖拍4K，固定支架避免抖动）',
      '手持稳定器（拍进店走动镜头必备，¥200-500）',
      '广角镜头夹片（拍店内环境更有空间感，¥30-80）',
      '补光灯（餐厅光线复杂时补脸，¥80-200）',
      '领夹麦克风（嘈杂店内收音清晰，¥50-200）',
    ],
    shots: [
      { order:1, ref:'门头/到店 0:05-0:12', angle:'门头正面平拍', duration:'拍5-10秒', notes:'包含店招、门口环境，最好有人进出增加生动感，带入地址字幕' },
      { order:2, ref:'店内环境 0:12-0:22', angle:'进门后横扫全景', duration:'缓慢移动8-10秒', notes:'从入口往里扫，捕捉装修风格、客流、特色陈列，稳定器跟拍' },
      { order:3, ref:'产品特写 0:22-0:40', angle:'俯拍45°或正面特写', duration:'每个产品拍5-8秒', notes:`重点拍${shop.type === '餐饮' ? '菜品摆盘、食材质感' : '产品细节、使用过程'}，可用慢动作增加质感` },
      { order:4, ref:'价格/菜单 0:40-0:50', angle:'正面平拍价格牌/菜单', duration:'3-5秒', notes:'清晰可读，适当停留让观众看清价格，是观众最关心的信息' },
      { order:5, ref:'体验过程', angle:'第一视角或侧拍', duration:'10-15秒', notes:'真实体验过程，展示服务/口感/使用感，真实感比完美画面更重要' },
      { order:6, ref:'结尾总结/CTA', angle:'正面对镜，门头前', duration:'拍3条备选', notes:'表情自然，语气轻松，说完后保持微笑2秒再停录' },
    ],
    lighting: [
      '餐厅暖光不够亮时：用小补光灯45°侧打脸部，避免食物色差失真',
      '拍菜品：关掉强顶光，用手机补光灯从侧上方打，食物质感更好',
      '室外门头：选散射光时段（非正午），避免强阴影影响字幕可读性',
    ],
    editing: [
      '节奏：探店视频每段不超过8秒切一次，保持新鲜感',
      '字幕：全程字幕 + 关键信息（价格/地址/推荐单品）加大字高亮',
      '音乐：轻松愉快的背景音乐，压到口播20%以下，饭点内容用食欲感BGM',
      '开头3秒：直接上最好看的菜品或最吸引人的画面，不要废话',
    ],
  };
}

export function mockPublishKit(topic: TopicIdea, shop: ShopInfo, platform: Platform): PublishKit {
  const bestTimes: Record<Platform, string> = {
    '抖音本地生活':'11:00-13:00 / 17:00-19:00', '小红书':'07:00-09:00 / 21:00-23:00',
    '大众点评':'10:00-12:00', '视频号':'08:00-10:00 / 20:00-22:00', '快手':'12:00-14:00 / 20:00-22:00',
    'TikTok':'19:00-21:00 local time / Tue-Thu peak',
  };
  return {
    title: topic.title,
    caption: `${topic.hook}\n\n📍 ${shop.name} | 人均${shop.avgPrice} | ${shop.type}\n${shop.highlights}\n\n你们去过吗？评论区聊聊～`,
    hashtags: [shop.name, `${shop.type}推荐`, '探店', '本地生活', '附近好店', '宝藏店', `${shop.area || ''}探店`.trim(), platform],
    bestTime: bestTimes[platform],
    coverTip: '封面选最好看的产品特写 + 店名字幕（大字白底或反色），左上角标人均价格，视觉冲击力强',
    tips: [
      `发布时记得添加 ${platform} 的 POI 地址标签，能获得额外本地流量推荐`,
      '发布后第一时间在评论区置顶：地址+营业时间+推荐单品，降低用户决策门槛',
      `${platform}本地探店内容优先推给3公里内用户，发布时间选饭点前1小时效果最好`,
    ],
  };
}

// ── 品牌内容脚本（云剪/痛点问答/幕后制作）────────────────────────────────────
const FORMAT_SYS: Record<string, string> = {
  cloud: `你是抖音本地生活推广专家。写"云剪型"短视频脚本，供达人套模板使用。
总时长30-45秒。结构：【开头3秒钩子】→【产品/服务展示10-15秒】→【核心卖点10秒】→【行动引导5秒】
每段格式：画面描述 | 字幕文案 | 时长
语气干净利落，无废话，字幕直接说结论。不要有剧情，纯功能性内容。
输出纯文本，不要markdown加粗，用换行分段。`,

  qa: `你是抖音本地生活推广专家。写"痛点问答型"短视频脚本，承接搜索流量。
总时长20-35秒。结构：【提问字幕3秒】→【痛点共鸣5秒】→【直接回答+数据10-15秒】→【佐证画面5秒】→【CTA 3秒】
每段格式：画面描述 | 字幕文案 | 时长
开头必须是用户会主动搜索的问题直接出字幕，回答要有具体数字或对比，不出镜也可以字幕驱动。
输出纯文本，不要markdown加粗，用换行分段。`,

  bts: `你是抖音本地生活推广专家。写"幕后制作型"短视频脚本，用过程建立品牌信任。
总时长40-60秒。结构：【制作流程分镜每步5-10秒】→【工艺细节特写10秒】→【成品展示5秒】→【结尾引导5秒】
每段格式：镜头描述 | 字幕/旁白文案 | 时长 | 音效建议
镜头描述要具体（景别/角度/运动方式），字幕不超过12字/条，整体像工业纪录片节奏。
输出纯文本，不要markdown加粗，用换行分段。`,
};

export const FORMAT_FIELDS: Record<'cloud'|'qa'|'bts', { key: string; label: string; placeholder: string; multiline?: boolean }[]> = {
  cloud: [
    { key: 'product', label: '产品/服务名称', placeholder: '例：定制T恤 / 热转印马克杯 / 企业工装' },
    { key: 'hook',    label: '视觉钩子（开头3秒的画面）', placeholder: '例：成品特写、机器运转画面、包装拆箱' },
    { key: 'process', label: '核心服务流程（2-3步）', placeholder: '例：上传图片→选材料→出成品', multiline: true },
    { key: 'cta',     label: '行动引导', placeholder: '例：主页领50件优惠券 / 评论区问价' },
  ],
  qa: [
    { key: 'product',  label: '产品/服务名称', placeholder: '例：定制T恤 / 企业周边' },
    { key: 'question', label: '用户最常问的问题', placeholder: '例：100件和50件的印刷成本差多少？' },
    { key: 'pain',     label: '背后的真实顾虑', placeholder: '例：怕起订量太高浪费，怕品质不稳定' },
    { key: 'answer',   label: '你的回答角度/优势', placeholder: '例：我们50件起印，单件含设计费也比同行低20%' },
    { key: 'proof',    label: '佐证画面', placeholder: '例：报价单截图、客户返单记录、成品对比' },
  ],
  bts: [
    { key: 'product', label: '产品/服务名称', placeholder: '例：丝网印刷T恤' },
    { key: 'steps',   label: '制作关键步骤（3-5步）', placeholder: '例：制版→调色→上机→烘干→质检→包装', multiline: true },
    { key: 'detail',  label: '最值得拍的细节/工艺亮点', placeholder: '例：色彩层叠特写、裁切精度、成品手感' },
    { key: 'voice',   label: '旁白风格', placeholder: '例：简洁字幕无旁白 / 工厂环境音 / 员工说工艺' },
    { key: 'ending',  label: '结尾引导', placeholder: '例：展示客户收货反应 / 直接报价区间' },
  ],
};

export async function genFormatScript(format: 'cloud'|'qa'|'bts', inputs: Record<string, string>, shop: ShopInfo): Promise<string> {
  const fields = FORMAT_FIELDS[format];
  const inputText = fields.map(f => `${f.label}：${inputs[f.key] || '（未填写）'}`).join('\n');
  const prompt = `商家信息：\n${shopDesc(shop)}\n\n内容信息：\n${inputText}\n\n请生成完整可用的短视频脚本。`;
  try {
    return await ask(prompt, FORMAT_SYS[format]);
  } catch {
    return mockFormatScript(format, inputs, shop);
  }
}

function mockFormatScript(format: 'cloud'|'qa'|'bts', inputs: Record<string, string>, shop: ShopInfo): string {
  if (format === 'cloud') return `【开头3秒钩子】
画面：${inputs.hook || shop.name + '产品特写，高饱和色彩'} | 字幕：3秒做好这件事，你的品牌就出圈了 | 3s

【产品/服务展示 10-15秒】
画面：${inputs.product || '产品'}制作全程实拍 | 字幕：${shop.name}·专业定制 | 12s

【核心卖点 10秒】
画面：成品效果对比展示 | 字幕：${inputs.process || '快速出货，品质稳定'} | 10s

【行动引导 5秒】
画面：联系方式+样品展示 | 字幕：${inputs.cta || '评论区留言，今天下单明天出货'} | 5s`;

  if (format === 'qa') return `【提问字幕开场 3秒】
画面：黑底白字全屏字幕 | 字幕：${inputs.question || '定制印刷最少要多少件？'} | 3s

【痛点共鸣 5秒】
画面：产品实拍 | 字幕：很多人都怕${inputs.pain || '起订量太高，浪费预算'} | 5s

【直接回答 10-15秒】
画面：报价单/样品展示 | 字幕：${inputs.answer || '我们50件起印，性价比比同行高20%'} | 12s

【佐证画面 5秒】
画面：${inputs.proof || '客户返单记录/好评截图'} | 字幕：已服务500+企业客户 | 5s

【CTA 3秒】
画面：二维码/联系方式 | 字幕：评论区问价，当天报价 | 3s`;

  return `【制作流程 步骤1】
镜头：机器运转特写，稳定器平移 | 字幕：${(inputs.steps || '制版→印刷→质检').split('→')[0] || '制版'} | 8s | 机器运转环境音

【制作流程 步骤2】
镜头：工艺细节俯拍45° | 字幕：精度控制 | 8s | 环境音渐强

【工艺细节特写】
镜头：${inputs.detail || '色彩层叠特写'} 微距拍摄 | 字幕：每一件都经过质检 | 10s | 舒缓背景音乐

【成品展示】
镜头：成品平铺+手持展示 | 字幕：${shop.name}·品质看得见 | 5s | 音乐高潮

【结尾引导】
镜头：联系方式卡片 | 字幕：${inputs.ending || '评论区问价，快速出货'} | 5s | 音乐淡出`;
}
