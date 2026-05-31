import React, { useState } from 'react';
import { Client, Project, ShopInfo, ShopType, Platform } from '../types';
import { SHOP_TYPES, SHOP_TYPE_EMOJI, PLATFORM_EMOJI, STATUS_LABEL, STATUS_COLOR } from '../constants';
import { Plus, ChevronRight, Users, Pencil, Trash2, Phone, StickyNote, Mic2 } from 'lucide-react';

// ── New / Edit Client Form ────────────────────────────────────────────────────
interface FormProps {
  initial?: Client;
  onSave: (c: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

function ClientForm({ initial, onSave, onCancel }: FormProps) {
  const [name,       setName]       = useState(initial?.shopInfo.name       ?? '');
  const [type,       setType]       = useState<ShopType>(initial?.shopInfo.type ?? '餐饮');
  const [avgPrice,   setAvgPrice]   = useState(initial?.shopInfo.avgPrice   ?? '');
  const [highlights, setHighlights] = useState(initial?.shopInfo.highlights ?? '');
  const [area,       setArea]       = useState(initial?.shopInfo.area       ?? '');
  const [contact,    setContact]    = useState(initial?.contact             ?? '');
  const [phone,      setPhone]      = useState(initial?.phone               ?? '');
  const [brandVoice, setBrandVoice] = useState(initial?.brandVoice          ?? '');
  const [notes,      setNotes]      = useState(initial?.notes               ?? '');
  const [err,        setErr]        = useState('');

  function handleSave() {
    if (!name.trim())       { setErr('请填写店名'); return; }
    if (!avgPrice.trim())   { setErr('请填写人均消费'); return; }
    if (!highlights.trim()) { setErr('请填写特色卖点'); return; }
    onSave({
      shopInfo: { name: name.trim(), type, avgPrice: avgPrice.trim(), highlights: highlights.trim(), area: area.trim() || undefined },
      contact: contact.trim() || undefined,
      phone: phone.trim() || undefined,
      brandVoice: brandVoice.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-slate-100">{initial ? '编辑客户档案' : '新建客户档案'}</h2>

      {/* Shop info */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">店铺信息</div>

        <div>
          <label className="text-xs text-slate-500 block mb-1.5">店名 *</label>
          <input autoFocus className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
            placeholder="例：鲜道寿司、快印世界" value={name} onChange={e => { setName(e.target.value); setErr(''); }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">店铺类型</label>
            <div className="flex flex-wrap gap-1.5">
              {SHOP_TYPES.map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${type === t ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  {SHOP_TYPE_EMOJI[t]} {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">人均消费 *</label>
            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
              placeholder="¥68 / ¥30-50" value={avgPrice} onChange={e => { setAvgPrice(e.target.value); setErr(''); }} />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1.5">特色 / 卖点 *</label>
          <textarea rows={2} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none text-sm"
            placeholder="例：老板是日本料理出身，有隐藏菜单，食材每天新鲜配送" value={highlights} onChange={e => { setHighlights(e.target.value); setErr(''); }} />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1.5">区域 / 商圈（选填）</label>
          <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
            placeholder="例：朝阳区三里屯附近" value={area} onChange={e => setArea(e.target.value)} />
        </div>
      </div>

      {/* Contact */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">联系信息（选填）</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">联系人</label>
            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
              placeholder="老板姓名" value={contact} onChange={e => setContact(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">联系电话</label>
            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
              placeholder="138 xxxx xxxx" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Brand voice */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">品牌调性</div>
          <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">AI 参考</span>
        </div>
        <textarea rows={2} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none text-sm"
          placeholder="例：轻松幽默，目标客户是附近上班族，主打性价比和便捷。避免过于正式的商业语气。"
          value={brandVoice} onChange={e => setBrandVoice(e.target.value)} />
        <p className="text-xs text-slate-600">填了之后 AI 生成的选题和脚本会更贴合这家店的风格</p>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-slate-500 block mb-1.5">备注</label>
        <textarea rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none text-sm"
          placeholder="例：每月发4条，每周一交稿，不能提竞争对手名字" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      {err && <p className="text-red-400 text-xs">{err}</p>}

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-sm font-medium transition-all">取消</button>
        <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-900/40 transition-all">
          {initial ? '保存修改' : '创建档案 →'}
        </button>
      </div>
    </div>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────
const ClientCard: React.FC<{
  client: Client; projects: Project[];
  onOpen: () => void; onEdit: () => void; onDelete: () => void;
}> = ({ client, projects, onOpen, onEdit, onDelete }) => {
  const total     = projects.length;
  const published = projects.filter(p => p.published).length;
  const active    = projects.filter(p => !p.published).length;
  const platforms = [...new Set(projects.map(p => p.platform))].slice(0, 3) as Platform[];

  return (
    <div className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 transition-all">
      <div className="flex items-start gap-4 cursor-pointer" onClick={onOpen}>
        <div className="text-3xl flex-shrink-0">{SHOP_TYPE_EMOJI[client.shopInfo.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-slate-100">{client.shopInfo.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {client.shopInfo.type} · 人均 {client.shopInfo.avgPrice}
                {client.shopInfo.area && ` · ${client.shopInfo.area}`}
              </div>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-slate-500">{total} 个项目</span>
            {published > 0 && <span className="text-xs text-emerald-400">✅ {published} 已发布</span>}
            {active > 0    && <span className="text-xs text-sky-400">🎬 {active} 进行中</span>}
          </div>

          {/* Platforms */}
          {platforms.length > 0 && (
            <div className="flex gap-1 mt-2">
              {platforms.map(p => (
                <span key={p} className="text-[11px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  {PLATFORM_EMOJI[p]} {p}
                </span>
              ))}
            </div>
          )}

          {/* Brand voice preview */}
          {client.brandVoice && (
            <div className="mt-2 text-xs text-violet-400/70 truncate">
              🎨 {client.brandVoice}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
        <button onClick={onOpen} className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-xs font-semibold transition-all">
          进入工作空间 →
        </button>
        <button onClick={onEdit} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all" title="编辑档案">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all" title="删除客户">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ── Orphan Project Row ────────────────────────────────────────────────────────
const OrphanRow: React.FC<{ project: Project; onOpen: () => void }> = ({ project, onOpen }) => (
  <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl px-4 py-3 cursor-pointer transition-all" onClick={onOpen}>
    <span className="text-lg">{SHOP_TYPE_EMOJI[project.shopInfo.type]}</span>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-slate-200 truncate">
        {project.topic?.title ?? <span className="text-slate-500 italic">未选选题</span>}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{project.shopInfo.name} · {PLATFORM_EMOJI[project.platform]} {project.platform}</div>
    </div>
    <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
  </div>
);

// ── Main ClientsPage ──────────────────────────────────────────────────────────
interface PageProps {
  clients: Client[];
  projects: Project[];
  onOpenClient: (id: string) => void;
  onOpenProject: (id: string) => void;
  onCreateClient: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateClient: (id: string, data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientsPage({ clients, projects, onOpenClient, onOpenProject, onCreateClient, onUpdateClient, onDeleteClient }: PageProps) {
  const [mode,       setMode]       = useState<'list' | 'new' | 'edit'>('list');
  const [editTarget, setEditTarget] = useState<Client | null>(null);

  const orphans = projects.filter(p => !p.clientId);

  function startEdit(c: Client) { setEditTarget(c); setMode('edit'); }

  function handleDelete(id: string) {
    const c = clients.find(x => x.id === id);
    const count = projects.filter(p => p.clientId === id).length;
    const msg = count > 0
      ? `确认删除「${c?.shopInfo.name}」？该客户下有 ${count} 个项目也会一并删除。`
      : `确认删除「${c?.shopInfo.name}」的档案？`;
    if (confirm(msg)) onDeleteClient(id);
  }

  if (mode === 'new') {
    return <ClientForm onSave={d => { onCreateClient(d); setMode('list'); }} onCancel={() => setMode('list')} />;
  }
  if (mode === 'edit' && editTarget) {
    return <ClientForm initial={editTarget} onSave={d => { onUpdateClient(editTarget.id, d); setMode('list'); }} onCancel={() => setMode('list')} />;
  }

  return (
    <div className="space-y-5">
      {clients.length === 0 && orphans.length === 0 ? (
        <div className="text-center py-24 space-y-4">
          <div className="text-6xl">🏪</div>
          <p className="text-slate-300 font-semibold">还没有客户档案</p>
          <p className="text-slate-500 text-sm">建立客户档案后，AI 会根据店铺信息生成更精准的内容</p>
          <button onClick={() => setMode('new')}
            className="mx-auto flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-semibold text-sm shadow-lg shadow-violet-900/40 transition-all">
            <Plus size={15} /> 新建第一个客户
          </button>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-slate-100">{clients.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">合作客户</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-sky-400">{projects.filter(p => !p.published).length}</div>
              <div className="text-xs text-slate-500 mt-0.5">进行中</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-emerald-400">{projects.filter(p => p.published).length}</div>
              <div className="text-xs text-slate-500 mt-0.5">已发布</div>
            </div>
          </div>

          {/* Client cards */}
          {clients.length > 0 && (
            <div className="space-y-3">
              {clients.map(c => (
                <ClientCard key={c.id} client={c}
                  projects={projects.filter(p => p.clientId === c.id)}
                  onOpen={() => onOpenClient(c.id)}
                  onEdit={() => startEdit(c)}
                  onDelete={() => handleDelete(c.id)} />
              ))}
            </div>
          )}

          {/* New client button */}
          <button onClick={() => setMode('new')}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 border-dashed rounded-xl text-slate-400 hover:text-slate-200 text-sm font-medium transition-all">
            <Plus size={14} /> 新建客户档案
          </button>

          {/* Orphaned projects */}
          {orphans.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">未归档项目 · {orphans.length} 个</div>
              {orphans.map(p => (
                <OrphanRow key={p.id} project={p} onOpen={() => onOpenProject(p.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
