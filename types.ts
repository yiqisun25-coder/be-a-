// ── Shop Info ─────────────────────────────────────────────────────────────────
export type ShopType = '餐饮' | '咖啡/饮品' | '快印/文印' | '美发/美甲' | '零售' | '健身/运动' | '其他';
export type Platform = '抖音本地生活' | '小红书' | '大众点评' | '视频号' | '快手' | 'TikTok';

export interface ShopInfo {
  name: string;        // 店名
  type: ShopType;
  avgPrice: string;    // 人均，e.g. "¥68"
  highlights: string;  // 特色/卖点
  area?: string;       // 区域/商圈
}

// ── Workflow ──────────────────────────────────────────────────────────────────
export type VideoStatus = 'idea' | 'scripting' | 'shooting' | 'editing' | 'published';
export type WorkflowStep = 'topic' | 'schedule' | 'script' | 'shooting' | 'publish';

// ── Topic ─────────────────────────────────────────────────────────────────────
export interface TopicIdea {
  id: string;
  title: string;       // 视频标题
  hook: string;        // 开场钩子 ≤3s
  angle: string;       // 切入角度（测评/种草/探秘/性价比）
  audience: string;    // 目标人群
  potential: string;   // 预估播放量
}

// ── Script ────────────────────────────────────────────────────────────────────
export interface ScriptLine {
  ts: string;
  type: 'hook' | 'arrival' | 'environment' | 'product' | 'price' | 'verdict' | 'cta';
  copy: string;        // 口播文案
  visual: string;      // 画面/动作
}

export interface Script {
  duration: string;
  lines: ScriptLine[];
}

// ── Shooting ──────────────────────────────────────────────────────────────────
export interface Shot {
  order: number;
  ref: string;
  angle: string;
  duration: string;
  notes: string;
}

export interface ShootingGuide {
  gear: string[];
  shots: Shot[];
  lighting: string[];
  editing: string[];
}

// ── Publish ───────────────────────────────────────────────────────────────────
export interface PublishKit {
  title: string;
  caption: string;
  hashtags: string[];
  bestTime: string;
  coverTip: string;
  tips: string[];
}

// ── Script Format ─────────────────────────────────────────────────────────────
export type ScriptFormat = 'explore' | 'cloud' | 'qa' | 'bts';

// ── Project ───────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  platform: Platform;
  shopInfo: ShopInfo;
  status: VideoStatus;
  step: WorkflowStep;

  shootDate?: string;
  publishDate?: string;
  publishTime?: string;

  topics?: TopicIdea[];
  topic?: TopicIdea;
  script?: Script;
  scriptFormat?: ScriptFormat;
  rawScript?: string;            // plain-text output for cloud/qa/bts formats
  formatInputs?: Record<string, string>; // saved inputs for non-explore formats
  shootingGuide?: ShootingGuide;
  checkedGear?: string[];
  checkedShots?: number[];
  publishKit?: PublishKit;
  published?: boolean;

  createdAt: string;
  updatedAt: string;
}
