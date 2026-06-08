import React, { useState, useEffect } from 'react';
import { X, Save, Check, Eye, EyeOff, Cpu } from 'lucide-react';
import { saveApiSettings, loadApiSettings, clearApiSettings, activeProvider, providerLabel } from '../services/geminiService';

interface Props { onClose: () => void; }

const PRESETS = [
  { label: 'SiliconFlow', base: 'https://api.siliconflow.cn/v1',    model: 'Qwen/Qwen2.5-7B-Instruct' },
  { label: 'Groq ⚡',     base: 'https://api.groq.com/openai/v1',   model: 'llama-3.3-70b-versatile' },
  { label: 'OpenRouter',  base: 'https://openrouter.ai/api/v1',     model: 'google/gemini-2.0-flash-001' },
  { label: 'DeepSeek',    base: 'https://api.deepseek.com/v1',       model: 'deepseek-chat' },
  { label: 'Moonshot',    base: 'https://api.moonshot.cn/v1',        model: 'moonshot-v1-8k' },
];

export default function SettingsModal({ onClose }: Props) {
  const [base,    setBase]    = useState('');
  const [key,     setKey]     = useState('');
  const [model,   setModel]   = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    const s = loadApiSettings();
    setBase(s.base);
    setModel(s.model);
    // Don't prefill key — force re-entry for security
  }, []);

  function applyPreset(p: typeof PRESETS[0]) {
    setBase(p.base);
    setModel(p.model);
  }

  const matchedPreset = PRESETS.find(p => p.base === base);

  function handleSave() {
    if (!base || !key) return;
    saveApiSettings(base, key, model);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); window.location.reload(); }, 800);
  }

  function handleClear() {
    if (!confirm('清除保存的 API 设置？')) return;
    clearApiSettings();
    setBase(''); setKey(''); setModel('');
    onClose();
    window.location.reload();
  }

  const provider = activeProvider();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm pt-16 px-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-violet-400" />
            <span className="font-semibold text-slate-100 text-sm">AI 接口设置</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">

          {/* Current status */}
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
            provider === 'mock' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${provider === 'mock' ? 'bg-slate-600' : 'bg-emerald-400'}`} />
            {provider === 'mock' ? '当前：离线模式（未配置 API Key）' : `当前：${providerLabel()} 已连接`}
          </div>

          {/* Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">快速选择服务商</label>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${base === p.base ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">API Base URL</label>
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors font-mono"
              placeholder="https://api.siliconflow.cn/v1"
              value={base} onChange={e => setBase(e.target.value)} />
          </div>

          {/* API Key */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                placeholder="sk-..."
                value={key} onChange={e => setKey(e.target.value)} />
              <button onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">模型名称</label>
            <input
              className={`w-full bg-slate-800 border rounded-xl px-3 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors font-mono ${
                matchedPreset && model !== matchedPreset.model ? 'border-amber-600/60' : 'border-slate-700'
              }`}
              placeholder="Qwen/Qwen2.5-7B-Instruct"
              value={model} onChange={e => setModel(e.target.value)} />
            {matchedPreset && model !== matchedPreset.model && (
              <p className="text-xs text-amber-500 mt-1">
                ⚠️ {matchedPreset.label.replace(' ⚡','')} 推荐模型：
                <button onClick={() => setModel(matchedPreset.model)} className="underline ml-1 hover:text-amber-300">
                  {matchedPreset.model}
                </button>
                （点击自动填入）
              </p>
            )}
            {matchedPreset && model === matchedPreset.model && (
              <p className="text-xs text-slate-600 mt-1">✓ 已匹配 {matchedPreset.label.replace(' ⚡','')} 推荐模型</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            {(base || key) && (
              <button onClick={handleClear} className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-900 text-xs font-medium transition-all">
                清除
              </button>
            )}
            <button onClick={handleSave} disabled={!base || !key}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                saved ? 'bg-emerald-600 text-white' : (!base || !key) ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40'
              }`}>
              {saved ? <><Check size={14} /> 已保存，重新加载…</> : <><Save size={14} /> 保存并应用</> }
            </button>
          </div>

          <p className="text-xs text-slate-600 text-center">Key 保存在本地浏览器，不会上传任何服务器</p>
        </div>
      </div>
    </div>
  );
}
