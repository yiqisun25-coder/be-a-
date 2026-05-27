import { Platform, ShopType, VideoStatus, WorkflowStep } from './types';

export const APP_NAME = '探店助手';

export const PLATFORMS: Platform[] = ['抖音本地生活', '小红书', '大众点评', '视频号', '快手', 'TikTok'];

export const PLATFORM_EMOJI: Record<Platform, string> = {
  '抖音本地生活': '🎵', '小红书': '📕', '大众点评': '🍴', '视频号': '💬', '快手': '⚡', 'TikTok': '🌐',
};

export const SHOP_TYPES: ShopType[] = ['餐饮', '咖啡/饮品', '快印/文印', '美发/美甲', '零售', '健身/运动', '其他'];

export const SHOP_TYPE_EMOJI: Record<ShopType, string> = {
  '餐饮': '🍜', '咖啡/饮品': '☕', '快印/文印': '🖨️',
  '美发/美甲': '💅', '零售': '🛍️', '健身/运动': '💪', '其他': '🏪',
};

export const STATUS_LABEL: Record<VideoStatus, string> = {
  idea: '选题中', scripting: '写脚本', shooting: '拍摄中', editing: '剪辑中', published: '已发布',
};

export const STATUS_COLOR: Record<VideoStatus, string> = {
  idea:      'text-yellow-400  bg-yellow-400/10  border-yellow-400/20',
  scripting: 'text-sky-400     bg-sky-400/10     border-sky-400/20',
  shooting:  'text-orange-400  bg-orange-400/10  border-orange-400/20',
  editing:   'text-violet-400  bg-violet-400/10  border-violet-400/20',
  published: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

export const STEP_META: { id: WorkflowStep; label: string; emoji: string; desc: string }[] = [
  { id: 'topic',    label: '选题', emoji: '💡', desc: '确定探店视频的切入角度' },
  { id: 'schedule', label: '排期', emoji: '📅', desc: '安排探店和发布时间'     },
  { id: 'script',   label: '脚本', emoji: '📝', desc: 'AI 生成探店分镜脚本'    },
  { id: 'shooting', label: '拍摄', emoji: '🎬', desc: '拍摄清单 + 打卡指南'    },
  { id: 'publish',  label: '发布', emoji: '🚀', desc: '标题文案 + 本地标签'    },
];

export const STORAGE_KEY = 'dianpu_projects_v1';
