import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Wind, 
  MonitorPlay, 
  Clock, 
  Plus, 
  Square, 
  History, 
  Activity,
  CheckCircle2,
  Table,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInMinutes, addMinutes } from 'date-fns';
import { cn } from './lib/utils';

// --- 类型定义 ---
type Section = 'registry' | 'acid' | 'exchange' | 'test';
type TestType = 'CO2' | 'O2';

interface RegisteredSample {
  id: string;
  name: string;
  weight: string;
  status: {
    acid: boolean;
    exchange: boolean;
    test: boolean;
  };
}

interface LabLog {
  id: string;
  sampleId?: string;
  category: string;
  taskName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

interface ActiveTimer {
  startTime: Date;
  targetMinutes: number;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('registry');
  const [registeredSamples, setRegisteredSamples] = useState<RegisteredSample[]>([]);
  const [logs, setLogs] = useState<LabLog[]>([]);
  
  // 登记表单
  const [regName, setRegName] = useState('');
  const [regWeight, setRegWeight] = useState('');

  // 各环节选中的样品 ID
  const [selectedAcidId, setSelectedAcidId] = useState('');
  const [selectedExchangeId, setSelectedExchangeId] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');

  // 酸解状态
  const [acidPumping, setAcidPumping] = useState<{sampleId: string, timer: ActiveTimer} | null>(null);
  const [acidReaction, setAcidReaction] = useState<{sampleId: string, timer: ActiveTimer} | null>(null);

  // 交换状态
  const [exchangePumping, setExchangePumping] = useState<{sampleId: string, timer: ActiveTimer} | null>(null);
  const [exchangeReaction, setExchangeReaction] = useState<{sampleId: string, timer: ActiveTimer} | null>(null);

  // 测样状态
  const [activeTests, setActiveTests] = useState<{id: string, sampleId: string, type: TestType, timer: ActiveTimer}[]>([]);

  // 时间更新
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 处理函数 ---
  const registerSample = () => {
    if (!regName.trim()) return;
    const newSample: RegisteredSample = {
      id: Math.random().toString(36).substr(2, 9),
      name: regName,
      weight: regWeight,
      status: { acid: false, exchange: false, test: false }
    };
    setRegisteredSamples([...registeredSamples, newSample]);
    setRegName('');
    setRegWeight('');
  };

  const updateSampleStatus = (sampleId: string, type: keyof RegisteredSample['status']) => {
    setRegisteredSamples(prev => prev.map(s => 
      s.id === sampleId ? { ...s, status: { ...s.status, [type]: true } } : s
    ));
  };

  const startAcidTimer = (type: 'pumping' | 'reaction') => {
    if (!selectedAcidId) return;
    const timer = { startTime: new Date(), targetMinutes: type === 'pumping' ? 50 : 30 };
    if (type === 'pumping') setAcidPumping({ sampleId: selectedAcidId, timer });
    else setAcidReaction({ sampleId: selectedAcidId, timer });
  };

  const stopAcidTimer = (type: 'pumping' | 'reaction') => {
    const active = type === 'pumping' ? acidPumping : acidReaction;
    if (!active) return;
    const sample = registeredSamples.find(s => s.id === active.sampleId);
    const endTime = new Date();
    const duration = differenceInMinutes(endTime, active.timer.startTime);
    
    setLogs([{
      id: Math.random().toString(36).substr(2, 9),
      sampleId: active.sampleId,
      category: '酸解',
      taskName: `${sample?.name} - ${type === 'pumping' ? '抽气' : '反应'}`,
      startTime: active.timer.startTime,
      endTime,
      duration
    }, ...logs]);

    if (type === 'reaction') updateSampleStatus(active.sampleId, 'acid');
    if (type === 'pumping') setAcidPumping(null); else setAcidReaction(null);
  };

  const startExchange = (type: 'pumping' | 'reaction') => {
    if (!selectedExchangeId) return;
    const timer = { startTime: new Date(), targetMinutes: 50 };
    if (type === 'pumping') setExchangePumping({ sampleId: selectedExchangeId, timer });
    else setExchangeReaction({ sampleId: selectedExchangeId, timer });
  };

  const stopExchange = (type: 'pumping' | 'reaction') => {
    const active = type === 'pumping' ? exchangePumping : exchangeReaction;
    if (!active) return;
    const sample = registeredSamples.find(s => s.id === active.sampleId);
    const endTime = new Date();
    const duration = differenceInMinutes(endTime, active.timer.startTime);

    setLogs([{
      id: Math.random().toString(36).substr(2, 9),
      sampleId: active.sampleId,
      category: '交换',
      taskName: `${sample?.name} - ${type === 'pumping' ? '抽气' : '交换反应'}`,
      startTime: active.timer.startTime,
      endTime,
      duration
    }, ...logs]);

    if (type === 'reaction') updateSampleStatus(active.sampleId, 'exchange');
    if (type === 'pumping') setExchangePumping(null); else setExchangeReaction(null);
  };

  const startTest = (type: TestType) => {
    if (!selectedTestId) return;
    const sample = registeredSamples.find(s => s.id === selectedTestId);
    let targetMinutes = 120; // Default for O2

    if (type === 'CO2') {
      targetMinutes = sample?.status.exchange ? 30 : 15;
    }

    const timer = { startTime: new Date(), targetMinutes };
    setActiveTests([{ 
      id: Math.random().toString(36).substr(2, 9), 
      sampleId: selectedTestId, 
      type, 
      timer 
    }, ...activeTests]);
  };

  const completeTest = (id: string) => {
    const test = activeTests.find(t => t.id === id);
    if (!test) return;
    const sample = registeredSamples.find(s => s.id === test.sampleId);
    const endTime = new Date();
    setLogs([{
      id: test.id,
      sampleId: test.sampleId,
      category: '测样',
      taskName: `${sample?.name} (${test.type})`,
      startTime: test.timer.startTime,
      endTime,
      duration: differenceInMinutes(endTime, test.timer.startTime)
    }, ...logs]);
    updateSampleStatus(test.sampleId, 'test');
    setActiveTests(activeTests.filter(t => t.id !== id));
  };

  // --- 正在运行汇总 ---
  const runningTasks = [
    acidPumping && { name: `酸解抽气: ${registeredSamples.find(s=>s.id===acidPumping.sampleId)?.name}`, end: addMinutes(acidPumping.timer.startTime, acidPumping.timer.targetMinutes) },
    acidReaction && { name: `酸解反应: ${registeredSamples.find(s=>s.id===acidReaction.sampleId)?.name}`, end: addMinutes(acidReaction.timer.startTime, acidReaction.timer.targetMinutes) },
    exchangePumping && { name: `交换抽气: ${registeredSamples.find(s=>s.id===exchangePumping.sampleId)?.name}`, end: addMinutes(exchangePumping.timer.startTime, exchangePumping.timer.targetMinutes) },
    exchangeReaction && { name: `交换反应: ${registeredSamples.find(s=>s.id===exchangeReaction.sampleId)?.name}`, end: addMinutes(exchangeReaction.timer.startTime, exchangeReaction.timer.targetMinutes) },
    ...activeTests.map(t => ({ name: `测样(${t.type}): ${registeredSamples.find(s=>s.id===t.sampleId)?.name}`, end: addMinutes(t.timer.startTime, t.timer.targetMinutes) }))
  ].filter(Boolean) as { name: string, end: Date }[];

  // --- 子组件 ---
  const TimerDisplay = ({ timer, label }: { timer: ActiveTimer, label: string }) => {
    const elapsed = differenceInMinutes(now, timer.startTime);
    const remaining = Math.max(0, timer.targetMinutes - elapsed);
    const progress = Math.min(100, (elapsed / timer.targetMinutes) * 100);

    return (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
          <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            预计 {format(addMinutes(timer.startTime, timer.targetMinutes), 'HH:mm')} 完成
          </div>
        </div>
        <div className="text-3xl font-mono font-bold mb-3 tracking-tighter text-slate-800">
          {remaining > 0 ? `剩余 ${remaining} 分钟` : '阶段已完成'}
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className={cn("h-full rounded-full", remaining > 0 ? "bg-blue-500" : "bg-emerald-500")}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-slate-900 font-sans pb-32">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Activity className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-black tracking-tighter">
            GEO<span className="text-blue-600">CHRONOS</span>
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-bold uppercase">实验室时间</div>
          <div className="text-sm font-mono font-bold">{format(now, 'HH:mm:ss')}</div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-8">
        
        <AnimatePresence mode="wait">
          {activeSection === 'registry' && (
            <motion.div 
              key="registry"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                  <Table className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">每日实验通告板</h2>
                  <p className="text-xs text-slate-400">登记今日酸解新样与待交换的往日样</p>
                </div>
              </div>

              {/* 分块登记 */}
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                    <h3 className="text-sm font-bold">1. 登记今日酸解样品 (新样)</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <input 
                      type="text" 
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="样品名(如GC-01)"
                      className="col-span-1 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
                    />
                    <input 
                      type="text" 
                      value={regWeight}
                      onChange={(e) => setRegWeight(e.target.value)}
                      placeholder="重量"
                      className="col-span-1 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
                    />
                  </div>
                  <button 
                    onClick={registerSample}
                    disabled={!regName.trim()}
                    className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold shadow-md active:scale-95 disabled:opacity-30 transition-all text-xs"
                  >
                    登记为待酸解样品
                  </button>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                    <h3 className="text-sm font-bold">2. 登记待交换样品 (往日已酸解样)</h3>
                  </div>
                  <input 
                    type="text" 
                    id="manual-exchange-name"
                    placeholder="手动输入上一批次样品名..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val) {
                          setRegisteredSamples([...registeredSamples, {
                            id: Math.random().toString(36).substr(2, 9),
                            name: val,
                            weight: '往日批次',
                            status: { acid: true, exchange: false, test: false }
                          }]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm mb-2"
                  />
                  <p className="text-[10px] text-slate-400 px-1">回车(Enter)确认，登记完成后可在交换版块找到</p>
                </div>
              </div>

              {/* 进度表展示 */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 tracking-widest uppercase px-2">今日实验池实时进度 ({registeredSamples.length})</h3>
                {registeredSamples.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 text-slate-300 text-xs font-bold font-mono">
                    EMPTY QUEUE / 暂未登记
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className="grid grid-cols-6 gap-2 bg-slate-50/80 backdrop-blur p-3 text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                      <div className="col-span-2 px-1">样品ID / 记录</div>
                      <div className="text-center">酸解</div>
                      <div className="text-center">交换</div>
                      <div className="text-center">质谱</div>
                      <div className="text-center">状态</div>
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[40vh] overflow-y-auto">
                      {registeredSamples.map(sample => (
                        <div key={sample.id} className="grid grid-cols-6 gap-2 p-3 items-center">
                          <div className="col-span-2 px-1">
                            <div className="text-xs font-bold text-slate-700 truncate">{sample.name}</div>
                            <div className="text-[9px] text-slate-400 font-medium">{sample.weight || '批次记'}</div>
                          </div>
                          <div className="flex justify-center">
                            <div className={cn("w-1.5 h-1.5 rounded-full", sample.status.acid ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "bg-slate-200")} />
                          </div>
                          <div className="flex justify-center">
                            <div className={cn("w-1.5 h-1.5 rounded-full", sample.status.exchange ? "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" : "bg-slate-200")} />
                          </div>
                          <div className="flex justify-center">
                            <div className={cn("w-1.5 h-1.5 rounded-full", sample.status.test ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-slate-200")} />
                          </div>
                          <div className="flex justify-center">
                            {sample.status.test ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Clock className="w-3 h-3 text-slate-300" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === 'acid' && (
            <motion.div 
              key="acid"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">酸解区域</h2>
                  <p className="text-xs text-slate-400">碳酸岩酸解、抽真空操作</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">选择酸解样品</label>
                <select 
                  value={selectedAcidId}
                  onChange={(e) => setSelectedAcidId(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none mb-4 appearance-none"
                >
                  <option value="">点击选择待处理样品...</option>
                  {registeredSamples.filter(s => !s.status.acid).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.weight})</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    disabled={!selectedAcidId}
                    onClick={() => startAcidTimer('pumping')}
                    className="flex flex-col items-center gap-1 bg-slate-900 text-white p-4 rounded-2xl font-bold disabled:opacity-30 active:scale-95 transition-all text-center"
                  >
                    <Wind className="w-5 h-5" />
                    <span className="text-xs">抽气 (50m)</span>
                  </button>
                  <button 
                    disabled={!selectedAcidId}
                    onClick={() => startAcidTimer('reaction')}
                    className="flex flex-col items-center gap-1 bg-amber-500 text-white p-4 rounded-2xl font-bold disabled:opacity-30 active:scale-95 transition-all text-center"
                  >
                    <Activity className="w-5 h-5" />
                    <span className="text-xs">反应 (30m)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {acidPumping && (
                  <div className="space-y-2">
                    <TimerDisplay 
                      timer={acidPumping.timer} 
                      label={`抽气中: ${registeredSamples.find(s=>s.id===acidPumping.sampleId)?.name}`} 
                    />
                    <button onClick={() => stopAcidTimer('pumping')} className="w-full text-xs font-bold text-red-500 py-2">停止抽气并记录</button>
                  </div>
                )}
                {acidReaction && (
                  <div className="space-y-2">
                    <TimerDisplay 
                      timer={acidReaction.timer} 
                      label={`反应中: ${registeredSamples.find(s=>s.id===acidReaction.sampleId)?.name}`} 
                    />
                    <button onClick={() => stopAcidTimer('reaction')} className="w-full text-xs font-bold text-red-500 py-2">完成反应并登记进度</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === 'exchange' && (
            <motion.div 
              key="exchange"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Wind className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">交换区域</h2>
                  <p className="text-xs text-slate-400">同位素交换反应与抽气</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase">选择待交换样品</label>
                  <button 
                    onClick={() => {
                      const name = prompt("请输入上一批次(如昨天)的样品名:");
                      if (name) {
                        const newId = Math.random().toString(36).substr(2, 9);
                        setRegisteredSamples([...registeredSamples, {
                          id: newId,
                          name,
                          weight: '往日批次',
                          status: { acid: true, exchange: false, test: false }
                        }]);
                        setSelectedExchangeId(newId);
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> 手动输入 (往日样)
                  </button>
                </div>
                <select 
                  value={selectedExchangeId}
                  onChange={(e) => setSelectedExchangeId(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none mb-4 appearance-none text-sm"
                >
                  <option value="">点击此处选择样品...</option>
                  {registeredSamples.filter(s => s.status.acid && !s.status.exchange).map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.weight ? `(${s.weight})` : ''}</option>
                  ))}
                  <option disabled>──────────</option>
                  {registeredSamples.filter(s => !s.status.acid).map(s => (
                    <option key={s.id} value={s.id}>{s.name} (未酸解 - 仅供强行处理)</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    disabled={!selectedExchangeId}
                    onClick={() => startExchange('pumping')}
                    className="flex flex-col items-center gap-1 bg-indigo-600 text-white p-4 rounded-2xl font-bold disabled:opacity-30 active:scale-95 transition-all"
                  >
                    <Wind className="w-5 h-5" />
                    <span className="text-xs">开始抽气</span>
                  </button>
                  <button 
                    disabled={!selectedExchangeId}
                    onClick={() => startExchange('reaction')}
                    className="flex flex-col items-center gap-1 bg-indigo-600 text-white p-4 rounded-2xl font-bold disabled:opacity-30 active:scale-95 transition-all"
                  >
                    <Activity className="w-5 h-5" />
                    <span className="text-xs">开始反应</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {exchangePumping && (
                  <div className="space-y-2">
                    <TimerDisplay 
                      timer={exchangePumping.timer} 
                      label={`抽气: ${registeredSamples.find(s=>s.id===exchangePumping.sampleId)?.name}`} 
                    />
                    <button onClick={() => stopExchange('pumping')} className="w-full text-xs font-bold text-red-500 py-2">确认完成抽气</button>
                  </div>
                )}
                {exchangeReaction && (
                  <div className="space-y-2">
                    <TimerDisplay 
                      timer={exchangeReaction.timer} 
                      label={`反应: ${registeredSamples.find(s=>s.id===exchangeReaction.sampleId)?.name}`} 
                    />
                    <button onClick={() => stopExchange('reaction')} className="w-full text-xs font-bold text-red-500 py-2">完成反应并登记进度</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === 'test' && (
            <motion.div 
              key="test"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                  <MonitorPlay className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">测样区域</h2>
                  <p className="text-xs text-slate-400">质谱仪数据测量维护</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase">选择上机样品</label>
                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-2 rounded">库中选样</span>
                  </div>
                  <select 
                    value={selectedTestId}
                    onChange={(e) => setSelectedTestId(e.target.value)}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none appearance-none text-sm"
                  >
                    <option value="">点击选择样品...</option>
                    
                    {/* 分组展示 */}
                    <optgroup label="✅ 氧交换已完成 (推荐O2/交换后CO2)">
                      {registeredSamples.filter(s => s.status.exchange && !s.status.test).map(s => (
                        <option key={s.id} value={s.id}>{s.name} (已交换)</option>
                      ))}
                    </optgroup>

                    <optgroup label="⚠️ 酸解已完成 (仅推荐交换前CO2)">
                      {registeredSamples.filter(s => s.status.acid && !s.status.exchange && !s.status.test).map(s => (
                        <option key={s.id} value={s.id}>{s.name} (未交换)</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[9px] font-black text-slate-300 uppercase italic">选择测试项目</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      disabled={!selectedTestId}
                      onClick={() => startTest('CO2')}
                      className="flex flex-col items-center justify-center gap-2 p-4 border border-emerald-100 bg-white rounded-2xl hover:bg-emerald-50 transition-all disabled:opacity-30 active:scale-95 shadow-sm group"
                    >
                      <span className="font-black text-emerald-600">CO₂ 测样</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] text-emerald-400 font-bold">
                          {registeredSamples.find(s=>s.id===selectedTestId)?.status.exchange ? '30分钟完成' : '15分钟完成'}
                        </span>
                        <span className="text-[7px] text-slate-400 mt-1 opacity-100 transition-opacity">
                          {registeredSamples.find(s=>s.id===selectedTestId)?.status.exchange ? '交换后样' : '交换前样'}
                        </span>
                      </div>
                    </button>
                    <button 
                      disabled={!selectedTestId || !registeredSamples.find(s=>s.id===selectedTestId)?.status.exchange}
                      onClick={() => startTest('O2')}
                      className="flex flex-col items-center justify-center gap-2 p-4 border border-blue-100 bg-white rounded-2xl hover:bg-blue-50 transition-all disabled:opacity-30 active:scale-95 shadow-sm group"
                    >
                      <span className="font-black text-blue-600">O₂ 测样</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] text-blue-400 font-bold">2小时完成</span>
                        <span className="text-[7px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">需走完交换流程</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {activeTests.map(test => (
                  <div key={test.id} className="relative group">
                    <TimerDisplay 
                      timer={test.timer} 
                      label={`${test.type} 测样: ${registeredSamples.find(s=>s.id===test.sampleId)?.name}`} 
                    />
                    <button 
                      onClick={() => completeTest(test.id)}
                      className="absolute top-4 right-4 bg-emerald-500 text-white p-2 rounded-xl shadow-lg active:scale-90 transition-transform"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 正在运行汇总 (底部悬浮提示的前置展示) */}
        {runningTasks.length > 0 && (
          <section className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">目前实验进展 ({runningTasks.length} 项)</h3>
            </div>
            <div className="space-y-3">
              {runningTasks.map((task, i) => (
                <div key={i} className="flex items-center justify-between border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                  <div className="text-sm font-bold truncate max-w-[200px]">{task.name}</div>
                  <div className="flex flex-col items-end">
                    <div className="text-xs font-mono font-bold text-blue-400">{format(task.end, 'HH:mm')}</div>
                    <div className="text-[8px] font-black text-slate-500 uppercase">预计完成</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 日志记录 */}
        <section className="pt-4">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-sm font-black flex items-center gap-2 text-slate-400 uppercase tracking-widest">
              <History className="w-4 h-4" /> 今日实验日志
            </h3>
            {logs.length > 0 && (
              <button 
                onClick={() => setLogs([])}
                className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded"
              >
                清理日志
              </button>
            )}
          </div>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 text-slate-300 text-xs font-bold">
                今天还没留下打点记录
              </div>
            ) : (
              logs.map(log => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={log.id} 
                  className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[10px]",
                      log.category === '酸解' ? "bg-amber-100 text-amber-600" : 
                      log.category === '交换' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                      {log.category.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-700">{log.taskName}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5">{format(log.startTime, 'HH:mm')} - {log.endTime ? format(log.endTime, 'HH:mm') : '计算中'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-mono font-bold text-slate-800 tracking-tighter">{log.duration}分</div>
                    <div className="text-[8px] font-black text-slate-400 uppercase">用时</div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex items-center justify-between pb-10 z-50">
        {[
          { id: 'registry', icon: History, label: '登记' },
          { id: 'acid', icon: FlaskConical, label: '酸解' },
          { id: 'exchange', icon: Wind, label: '交换' },
          { id: 'test', icon: MonitorPlay, label: '测样' }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveSection(item.id as Section)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300",
              activeSection === item.id ? "text-blue-600 scale-110" : "text-slate-300"
            )}
          >
            <item.icon className={cn("w-6 h-6", activeSection === item.id ? "fill-blue-50" : "")} />
            <span className="text-[10px] font-black tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
