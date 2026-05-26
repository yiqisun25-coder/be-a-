import React, { useState } from 'react';
import { Project, TopicIdea, Platform } from '../types';
import { genTopics, mockTopics } from '../services/geminiService';
import { Sparkles, Check, Users, TrendingUp, Zap, RefreshCw } from 'lucide-react';

const PLATFORMS: Platform[] = ['抖音', '小红书', 'B站', '视频号', 'YouTube'];
const PLATFORM_EMOJI: Record<Platform, string> = {
  抖音: '🎵', 小红书: '📕', B站: '📺', 视频号: '💬', YouTube: '▶️',
};

interface Props {
  project: Project;
  onChange: (p: Partial<Project>) => void;
}

export default function TopicPanel({ project, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [niche, setNiche] = useState(project.niche);
  const [platform, setPlatform] = useState<Platform>(project.platform);
  const [err, setErr] = useState('');

  async function handleGen() {
    if (!niche.trim()) { setErr('请先填写赛道'); return; }
    setErr('');
    setLoading(true);
    try {
      const topics = await genTopics(niche.trim(), platform);
      onChange({ topics, niche: niche.trim(), platform, topic: undefined });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(`AI 调用失败：${msg}`);
      // 仅在真正无 key 时才用模板兜底
      onChange({ topics: mockTopics(niche.trim()), niche: niche.trim(), platform, topic: undefined });
    } finally {
      setLoading(false);
    }
  }

  function selectTopic(t: TopicIdea) {
    onChange({ topic: t, status: 'scripting', step: 'schedule' });
  }

  const TYPE_COLOR: Record<string, string> = {
    hook: 'bg-orange-500/20 text-orange-300',
    narration: 'bg-sky-500/20 text-sky-300',
    action: 'bg-violet-500/20 text-violet-300',
    broll: 'bg-slate-500/20 text-slate-300',
    cta: 'bg-emerald-500/20 text-emerald-300',
  };

  return (
    <div className="space-y-6">
      {/* Platform picker */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">发布平台</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                platform === p
                  ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/40'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {PLATFORM_EMOJI[p]} {p}
            </button>
          ))}
        </div>
      </div>

      {/* Niche input */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          赛道 / 内容方向
        </label>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
            placeholder="例：职场干货、美食探店、健身减脂、数码评测…"
            value={niche}
            onChange={e => { setNiche(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && handleGen()}
          />
          <button
            onClick={handleGen}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-white text-sm font-semibold transition-all whitespace-nowrap shadow-lg shadow-violet-900/40"
          >
            {loading ? (
              <><RefreshCw size={14} className="animate-spin" />生成中…</>
            ) : (
              <><Sparkles size={14} />AI 生成选题</>
            )}
          </button>
        </div>
        {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
      </div>

      {/* Topic cards */}
      {project.topics && project.topics.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {project.topics.length} 个选题方案
            </span>
            <button onClick={handleGen} disabled={loading} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              <RefreshCw size={11} /> 重新生成
            </button>
          </div>

          {project.topics.map(t => {
            const chosen = project.topic?.id === t.id;
            return (
              <div
                key={t.id}
                className={`rounded-xl border p-4 transition-all cursor-pointer group ${
                  chosen
                    ? 'border-violet-500 bg-violet-950/40 shadow-lg shadow-violet-900/20'
                    : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                }`}
                onClick={() => selectTopic(t)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-100 text-sm leading-snug mb-2">{t.title}</div>
                    <div className="text-xs text-slate-400 italic mb-3 line-clamp-2">「{t.hook}」</div>
                    <div className="text-xs text-slate-500 mb-3">{t.angle}</div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Users size={11} />{t.audience}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <TrendingUp size={11} />{t.potential}
                      </span>
                    </div>
                  </div>
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    chosen ? 'border-violet-500 bg-violet-500' : 'border-slate-600 group-hover:border-slate-400'
                  }`}>
                    {chosen && <Check size={12} className="text-white" />}
                  </div>
                </div>

                {chosen && (
                  <div className="mt-3 pt-3 border-t border-violet-800/40 flex items-center gap-1.5 text-xs text-violet-400 font-medium">
                    <Zap size={11} /> 已选择 · 点击下一步继续排期
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!project.topics && (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
          <Sparkles size={32} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">填写赛道，点击 AI 生成 4 个差异化选题</p>
        </div>
      )}
    </div>
  );
}
