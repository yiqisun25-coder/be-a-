import React, { useState, useEffect, useCallback } from 'react';
import { Project, Platform, WorkflowStep, ShopInfo, ShopType, Client } from './types';
import { APP_NAME, PLATFORMS, PLATFORM_EMOJI, SHOP_TYPES, SHOP_TYPE_EMOJI, STATUS_LABEL, STATUS_COLOR, STEP_META, STORAGE_KEY, CLIENTS_KEY } from './constants';
import TopicPanel    from './components/TopicPanel';
import SchedulePanel from './components/SchedulePanel';
import ScriptPanel   from './components/ScriptPanel';
import ShootingPanel from './components/ShootingPanel';
import PublishPanel  from './components/PublishPanel';
import ClientsPage   from './components/ClientsPage';
import ClientDetail  from './components/ClientDetail';
import SettingsModal from './components/SettingsModal';
import { activeProvider, providerLabel } from './services/geminiService';
import { Plus, ArrowLeft, Trash2, Calendar, ChevronRight, Store, Cpu, Settings } from 'lucide-react';

const PROVIDER_CLS: Record<ReturnType<typeof activeProvider>, string> = {
  custom:     'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  deepseek:   'text-blue-300   bg-blue-500/10   border-blue-500/30',
  openrouter: 'text-violet-300 bg-violet-500/10 border-violet-500/30',
  gemini:     'text-sky-300    bg-sky-500/10    border-sky-500/30',
  mock:       'text-slate-400  bg-slate-500/10  border-slate-500/30',
};

// ── Storage helpers ───────────────────────────────────────────────────────────
function loadProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveProjects(p: Project[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

function loadClients(): Client[] {
  try { return JSON.parse(localStorage.getItem(CLIENTS_KEY) ?? '[]'); } catch { return []; }
}
function saveClients(c: Client[]) { localStorage.setItem(CLIENTS_KEY, JSON.stringify(c)); }

function newProject(platform: Platform, shopInfo: ShopInfo, clientId?: string, brandVoice?: string): Project {
  const now = new Date().toISOString();
  return { id: Date.now().toString(), platform, shopInfo, status: 'idea', step: 'topic', clientId, brandVoice, createdAt: now, updatedAt: now };
}

// ── App ───────────────────────────────────────────────────────────────────────
type AppView = 'clients' | 'client-detail' | 'project-new' | 'editor';

export default function App() {
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [clients,   setClients]   = useState<Client[]>([]);
  const [view,      setView]      = useState<AppView>('clients');
  const [activeClientId,  setActiveClientId]  = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // new-project form state
  const [newPlatform,  setNewPlatform]  = useState<Platform>('抖音本地生活');
  const [newName,      setNewName]      = useState('');
  const [newType,      setNewType]      = useState<ShopType>('餐饮');
  const [newPrice,     setNewPrice]     = useState('');
  const [newHighlight, setNewHighlight] = useState('');
  const [newArea,      setNewArea]      = useState('');
  const [newErr,       setNewErr]       = useState('');

  useEffect(() => {
    setProjects(loadProjects());
    setClients(loadClients());
  }, []);

  // ── Client CRUD ──────────────────────────────────────────────────────────
  const createClient = useCallback((data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const c: Client = { id: Date.now().toString(), ...data, createdAt: now, updatedAt: now };
    setClients(prev => { const next = [c, ...prev]; saveClients(next); return next; });
  }, []);

  const updateClient = useCallback((id: string, data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    setClients(prev => {
      const now = new Date().toISOString();
      const next = prev.map(c => c.id === id ? { ...c, ...data, updatedAt: now } : c);
      saveClients(next); return next;
    });
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => { const next = prev.filter(c => c.id !== id); saveClients(next); return next; });
    setProjects(prev => { const next = prev.filter(p => p.clientId !== id); saveProjects(next); return next; });
  }, []);

  // ── Project CRUD ─────────────────────────────────────────────────────────
  const upsertProject = useCallback((p: Project) => {
    setProjects(prev => {
      const next = prev.some(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev];
      saveProjects(next); return next;
    });
  }, []);

  const patchActive = useCallback((patch: Partial<Project>) => {
    setProjects(prev => {
      const next = prev.map(p => p.id !== activeProjectId ? p : { ...p, ...patch, updatedAt: new Date().toISOString() });
      saveProjects(next); return next;
    });
  }, [activeProjectId]);

  const deleteProject = useCallback((id: string) => {
    if (!confirm('确认删除这个项目？')) return;
    setProjects(prev => { const next = prev.filter(p => p.id !== id); saveProjects(next); return next; });
    if (activeProjectId === id) { setActiveProjectId(null); goToClient(activeClientId); }
  }, [activeProjectId, activeClientId]);

  // ── Navigation ───────────────────────────────────────────────────────────
  function goToClients()           { setView('clients'); setActiveClientId(null); setActiveProjectId(null); }
  function goToClient(id: string | null) { if (id) { setActiveClientId(id); setView('client-detail'); } else { goToClients(); } }
  function openProject(id: string) { setActiveProjectId(id); setView('editor'); }

  function openNewProject(clientId: string) {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      // pre-fill form from client
      setNewPlatform('抖音本地生活');
      setNewName(client.shopInfo.name);
      setNewType(client.shopInfo.type);
      setNewPrice(client.shopInfo.avgPrice);
      setNewHighlight(client.shopInfo.highlights);
      setNewArea(client.shopInfo.area ?? '');
      setNewErr('');
    }
    setView('project-new');
  }

  function createProject() {
    const client = activeClientId ? clients.find(c => c.id === activeClientId) : null;
    if (client) {
      // Use client's shop info directly
      const p = newProject(newPlatform, client.shopInfo, client.id, client.brandVoice);
      upsertProject(p);
      setActiveProjectId(p.id);
      setView('editor');
      return;
    }
    // Standalone project (no client)
    if (!newName.trim())      { setNewErr('请填写店名'); return; }
    if (!newPrice.trim())     { setNewErr('请填写人均价格'); return; }
    if (!newHighlight.trim()) { setNewErr('请填写店的特色'); return; }
    const shopInfo: ShopInfo = { name: newName.trim(), type: newType, avgPrice: newPrice.trim(), highlights: newHighlight.trim(), area: newArea.trim() || undefined };
    const p = newProject(newPlatform, shopInfo);
    upsertProject(p);
    setActiveProjectId(p.id);
    setNewName(''); setNewPrice(''); setNewHighlight(''); setNewArea(''); setNewErr('');
    setView('editor');
  }

  const active      = projects.find(p => p.id === activeProjectId) ?? null;
  const activeClient = clients.find(c => c.id === activeClientId) ?? null;
  const stepIdx     = active ? STEP_META.findIndex(s => s.id === active.step) : 0;
  const isFromClient = !!active?.clientId;

  function goStep(s: WorkflowStep) { patchActive({ step: s }); }

  // ── Back navigation label ─────────────────────────────────────────────────
  function handleBack() {
    if (view === 'editor') {
      if (active?.clientId) { goToClient(active.clientId); }
      else { goToClients(); }
    } else if (view === 'project-new' || view === 'client-detail') {
      goToClients();
    }
  }

  const backLabel = view === 'editor' && active?.clientId
    ? (clients.find(c => c.id === active.clientId)?.shopInfo.name ?? '客户档案')
    : '客户档案';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          {view !== 'clients' ? (
            <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm">
              <ArrowLeft size={16} /> {backLabel}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Store size={20} className="text-violet-400" />
                <span className="font-bold text-slate-100 text-lg tracking-tight">{APP_NAME}</span>
              </div>
              <button onClick={() => setShowSettings(true)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium transition-all hover:opacity-80 ${PROVIDER_CLS[activeProvider()]}`}>
                <Cpu size={10} /> {providerLabel()}
              </button>
            </div>
          )}

          {view === 'clients' && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSettings(true)} className="p-2 text-slate-500 hover:text-slate-300 transition-colors" title="API 设置">
                <Settings size={16} />
              </button>
            </div>
          )}
          {view === 'editor' && active && (
            <button onClick={() => deleteProject(active.id)} className="p-2 text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          )}
        </header>

        {/* ── Clients Home ── */}
        {view === 'clients' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100">客户档案</h2>
              <button onClick={() => { setActiveClientId(null); setView('project-new'); }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                + 无客户项目
              </button>
            </div>
            <ClientsPage
              clients={clients}
              projects={projects}
              onOpenClient={id => goToClient(id)}
              onOpenProject={openProject}
              onCreateClient={createClient}
              onUpdateClient={updateClient}
              onDeleteClient={deleteClient}
            />
          </div>
        )}

        {/* ── Client Detail ── */}
        {view === 'client-detail' && activeClient && (
          <ClientDetail
            client={activeClient}
            projects={projects.filter(p => p.clientId === activeClient.id)}
            onNewProject={() => openNewProject(activeClient.id)}
            onOpenProject={openProject}
          />
        )}

        {/* ── New Project Form ── */}
        {view === 'project-new' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-100">
              {activeClient ? `为「${activeClient.shopInfo.name}」新建项目` : '新建探店项目'}
            </h2>

            {/* Platform */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">发布平台</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setNewPlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${newPlatform === p ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/40' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                    {PLATFORM_EMOJI[p]} {p}
                  </button>
                ))}
              </div>
            </div>

            {/* If from client, show info preview; otherwise show full form */}
            {activeClient ? (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{SHOP_TYPE_EMOJI[activeClient.shopInfo.type]}</span>
                  <div>
                    <div className="font-semibold text-slate-100">{activeClient.shopInfo.name}</div>
                    <div className="text-xs text-slate-400">{activeClient.shopInfo.type} · 人均 {activeClient.shopInfo.avgPrice}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">店铺信息从客户档案自动填入</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">店名</label>
                  <input autoFocus className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="例：鲜道寿司、快印世界" value={newName} onChange={e => { setNewName(e.target.value); setNewErr(''); }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">店铺类型</label>
                    <div className="flex flex-wrap gap-2">
                      {SHOP_TYPES.map(t => (
                        <button key={t} onClick={() => setNewType(t)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${newType === t ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                          {SHOP_TYPE_EMOJI[t]} {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">人均消费</label>
                    <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="¥68、¥30-50" value={newPrice} onChange={e => { setNewPrice(e.target.value); setNewErr(''); }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">特色 / 卖点</label>
                  <textarea className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none" rows={3}
                    placeholder="例：老板日本料理出身，有隐藏菜单，食材新鲜每天配送" value={newHighlight} onChange={e => { setNewHighlight(e.target.value); setNewErr(''); }} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">区域 / 商圈 <span className="text-slate-600 font-normal normal-case">（选填）</span></label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="例：朝阳区三里屯、上海静安寺附近" value={newArea} onChange={e => setNewArea(e.target.value)} />
                </div>
              </>
            )}

            {newErr && <p className="text-red-400 text-xs">{newErr}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={handleBack} className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-sm font-medium transition-all">取消</button>
              <button onClick={createProject} className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-900/40 transition-all">开始制作 →</button>
            </div>
          </div>
        )}

        {/* ── Project Editor ── */}
        {view === 'editor' && active && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{SHOP_TYPE_EMOJI[active.shopInfo.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-100 truncate">{active.shopInfo.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {PLATFORM_EMOJI[active.platform]} {active.platform} · 人均 {active.shopInfo.avgPrice}
                  {active.publishDate && <span className="ml-2 text-violet-400"><Calendar size={10} className="inline mr-0.5" />{active.publishDate}</span>}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLOR[active.status]}`}>
                {STATUS_LABEL[active.status]}
              </span>
            </div>

            {/* Step tabs */}
            <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              {STEP_META.map((s, i) => {
                const isCurrent = active.step === s.id;
                const isDone    = i < stepIdx;
                return (
                  <button key={s.id} onClick={() => goStep(s.id)}
                    className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg text-xs font-medium transition-all ${isCurrent ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : isDone ? 'text-emerald-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}>
                    <span className="text-base leading-none mb-0.5">{isDone && !isCurrent ? '✅' : s.emoji}</span>
                    <span className="hidden sm:block">{s.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-slate-500 -mt-2">{STEP_META[stepIdx]?.desc}</div>

            <div>
              {active.step === 'topic'    && <TopicPanel    project={active} onChange={patchActive} />}
              {active.step === 'schedule' && <SchedulePanel project={active} onChange={patchActive} />}
              {active.step === 'script'   && <ScriptPanel   project={active} onChange={patchActive} />}
              {active.step === 'shooting' && <ShootingPanel project={active} onChange={patchActive} />}
              {active.step === 'publish'  && <PublishPanel  project={active} onChange={patchActive} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
