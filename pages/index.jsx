import { useState, useEffect, useRef, useMemo } from 'react';
import {
  LayoutDashboard, TrendingUp, Users, Target, Sparkles, Calculator, LogOut, Lock, Plus, Trash2, Edit3, Check, X, ChevronRight, Menu, Send, Loader2, Award, ArrowRight, Eye, EyeOff, CircleCheck, Settings, Briefcase, Heart, Star, Compass, Brain, Save, UserPlus, Activity, Sparkle, Coins, CircleDashed, ChevronDown, Zap
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DEFAULT_CAREER_LEVELS = [
  { name: 'Trainee', threshold: 0 },
  { name: 'Beraterassistent', threshold: 150000 },
  { name: 'Juniorberater', threshold: 350000 },
  { name: 'Seniorberater', threshold: 750000 },
  { name: 'Teamleiter', threshold: 1750000 },
  { name: 'Repräsentanzleiter', threshold: 3500000 },
  { name: 'Branchmanager', threshold: 7500000 },
  { name: 'Regionalmanager', threshold: 15000000 },
  { name: 'Divisionalmanager', threshold: 30000000 },
  { name: 'Generalmanager', threshold: 60000000 },
];

const APPOINTMENT_TYPES = ['S1', 'S2', 'S3', 'Wachstumsgespräch'];
const APPOINTMENT_STATUS = ['Geplant', 'Durchgeführt', 'Abgeschlossen', 'Storniert'];

const storage = {
  async get(key, fallback = null) {
    try {
      if (typeof window === 'undefined') return fallback;
      const result = await window.storage?.get?.(key);
      if (!result) return localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : fallback;
      try { return JSON.parse(result.value); } catch { return result.value; }
    } catch { return fallback; }
  },
  async set(key, value) {
    try {
      if (typeof window === 'undefined') return false;
      const v = typeof value === 'string' ? value : JSON.stringify(value);
      await window.storage?.set?.(key, v);
      localStorage.setItem(key, v);
      return true;
    } catch { return false; }
  },
  async delete(key) {
    try {
      await window.storage?.delete?.(key);
      localStorage.removeItem(key);
      return true;
    } catch { return false; }
  }
};

const fmtEUR = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0 €';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};

const fmtNum = (n) => new Intl.NumberFormat('de-DE').format(n || 0);
const formatDate = (d) => !d ? '' : new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const getTotalRevenue = (data) => {
  const closed = (data.appointments || []).filter(a => a.closed).reduce((s, a) => s + (Number(a.revenue) || 0), 0);
  const partners = (data.partners || []).reduce((s, p) => s + (Number(p.revenue) || 0), 0);
  const manual = (data.manualRevenue || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
  return closed + partners + manual;
};

const getCareerProgress = (totalRevenue, levels) => {
  const careerLevels = levels || DEFAULT_CAREER_LEVELS;
  let current = careerLevels[0];
  let currentIndex = 0;
  for (let i = careerLevels.length - 1; i >= 0; i--) {
    if (totalRevenue >= careerLevels[i].threshold) {
      current = careerLevels[i];
      currentIndex = i;
      break;
    }
  }
  const next = careerLevels[currentIndex + 1] || null;
  const remainingToNext = next ? next.threshold - totalRevenue : 0;
  const segmentSize = next ? next.threshold - current.threshold : 1;
  const segmentProgress = next ? ((totalRevenue - current.threshold) / segmentSize) * 100 : 100;
  return { current, next, remainingToNext, segmentProgress: Math.max(0, Math.min(100, segmentProgress)), currentIndex };
};

// UI Components
const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled = false }) => {
  const variants = {
    primary: 'bg-stone-900 text-white hover:bg-stone-800',
    secondary: 'bg-stone-100 text-stone-900 hover:bg-stone-200',
    ghost: 'bg-transparent text-stone-700 hover:bg-stone-100',
    outline: 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-50',
    danger: 'bg-white border border-stone-300 text-red-700 hover:bg-red-50'
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, type = 'text', className = '' }) => (
  <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} className={`w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm focus:border-stone-900 focus:outline-none transition-colors ${className}`} />
);

const Label = ({ children }) => <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wider">{children}</label>;

const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-2xl ${sizes[size]} w-full max-h-[90vh] overflow-hidden flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-stone-100 text-stone-700',
    success: 'bg-emerald-50 text-emerald-700',
    info: 'bg-blue-50 text-blue-700',
    danger: 'bg-red-50 text-red-700',
    dark: 'bg-stone-900 text-white'
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>{children}</span>;
};

// MAIN APP
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [data, setData] = useState({
    appointments: [],
    partners: [],
    goals: [],
    manualRevenue: [],
    vision: {},
    chatHistory: [],
    userName: '',
    careerLevels: DEFAULT_CAREER_LEVELS,
  });
  const [savingStatus, setSavingStatus] = useState(null);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      const loaded = await storage.get('app_data', {
        appointments: [],
        partners: [],
        goals: [],
        manualRevenue: [],
        vision: {},
        chatHistory: [],
        userName: '',
        careerLevels: DEFAULT_CAREER_LEVELS,
      });
      setData(loaded);
      setLoading(false);
    })();
  }, [authed]);

  const saveData = async (newData) => {
    setData(newData);
    setSavingStatus('saving');
    await storage.set('app_data', newData);
    setSavingStatus('saved');
    setTimeout(() => setSavingStatus(null), 2000);
  };

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  if (loading) return <div className="min-h-screen bg-stone-100 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-stone-400" /></div>;

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <DashboardView data={data} setView={setView} />;
      case 'karriere': return <KarriereView data={data} />;
      case 'pipeline': return <PipelineView data={data} save={saveData} />;
      case 'rechner': return <RechnerView data={data} save={saveData} />;
      case 'umsaetze': return <UmsaetzeView data={data} save={saveData} />;
      case 'team': return <TeamView data={data} save={saveData} />;
      case 'ziele': return <ZieleView data={data} save={saveData} />;
      case 'coach': return <CoachView data={data} save={saveData} />;
      case 'settings': return <SettingsView data={data} save={saveData} onResetPin={() => { storage.delete('auth_pin'); setAuthed(false); }} />;
      default: return <DashboardView data={data} setView={setView} />;
    }
  };

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'karriere', label: 'Karriere', icon: TrendingUp },
    { id: 'pipeline', label: 'Pipeline', icon: Briefcase },
    { id: 'rechner', label: 'Rechner', icon: Calculator },
    { id: 'umsaetze', label: 'Umsätze', icon: Coins },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'ziele', label: 'Ziele', icon: Target },
    { id: 'coach', label: 'Coach', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-stone-100" style={{ fontFamily: "'Geist', -apple-system, sans-serif" }}>
      {mobileOpen && <div className="fixed inset-0 bg-stone-900/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-60 bg-stone-100 border-r border-stone-200 transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} transition-transform flex flex-col`}>
        <div className="px-6 pt-7 pb-8">
          <div className="text-lg font-semibold text-stone-900">Cockpit</div>
          <div className="text-xs text-stone-500 mt-1">{data.userName || 'Finanzberater'}</div>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => { setView(item.id); setMobileOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${active ? 'bg-white text-stone-900 font-medium shadow-sm' : 'text-stone-600 hover:bg-white/60'}`}>
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-stone-200 space-y-0.5">
          {savingStatus && <div className="px-3 py-1.5 text-xs text-stone-500 flex items-center gap-1.5">{savingStatus === 'saving' ? <><Loader2 className="w-3 h-3 animate-spin" /> Speichert...</> : <><CircleCheck className="w-3 h-3 text-emerald-600" /> Gespeichert</>}</div>}
          <button onClick={() => setView('settings')} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${view === 'settings' ? 'bg-white text-stone-900 font-medium' : 'text-stone-600 hover:bg-white/60'}`}><Settings className="w-4 h-4" /><span>Einstellungen</span></button>
          <button onClick={() => { storage.delete('auth_session'); setAuthed(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-500 hover:bg-white/60"><LogOut className="w-4 h-4" /><span>Abmelden</span></button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-0 z-20 bg-stone-100/95 border-b border-stone-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="p-2 text-stone-700"><Menu className="w-5 h-5" /></button>
          <span className="text-sm font-semibold">Cockpit</span>
          <div className="w-9" />
        </div>
        <div className="p-6 lg:p-10 max-w-6xl mx-auto">{renderView()}</div>
      </main>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await storage.get('auth_pin');
      setIsSetup(!stored);
      setChecking(false);
    })();
  }, []);

  const handleSubmit = async () => {
    if (isSetup) {
      if (pin.length < 4) { setError('Mindestens 4 Zeichen'); return; }
      if (pin !== confirmPin) { setError('PINs stimmen nicht überein'); return; }
      await storage.set('auth_pin', pin);
      await storage.set('auth_session', 'active');
      onLogin();
    } else {
      const stored = await storage.get('auth_pin');
      if (pin === stored) { await storage.set('auth_session', 'active'); onLogin(); }
      else setError('Falsche PIN');
    }
  };

  if (checking) return <div className="min-h-screen bg-stone-100 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-stone-900 mb-2">Vertriebscockpit</h1>
          <p className="text-stone-500 text-sm">{isSetup ? 'Erstelle deine PIN' : 'Willkommen zurück'}</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-stone-200">
          <div className="space-y-4">
            <div>
              <Label>{isSetup ? 'Neue PIN' : 'PIN'}</Label>
              <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••••" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} autoFocus />
            </div>
            {isSetup && (
              <div>
                <Label>PIN bestätigen</Label>
                <Input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} placeholder="••••••" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
              </div>
            )}
            {error && <div className="text-xs text-red-600">{error}</div>}
            <Button onClick={handleSubmit} className="w-full" size="lg"><Lock className="w-4 h-4" />{isSetup ? 'PIN festlegen' : 'Anmelden'}</Button>
          </div>
        </div>
        <p className="text-center text-xs text-stone-400 mt-6">Geschützt durch Cloud-Speicherung</p>
      </div>
    </div>
  );
}

// VIEWS
function DashboardView({ data, setView }) {
  const totalRevenue = useMemo(() => getTotalRevenue(data), [data]);
  const pipelineRevenue = (data.appointments || []).filter(a => !a.closed && a.status !== 'Storniert').reduce((s, a) => s + (Number(a.revenue) || 0), 0);
  const { current, next } = getCareerProgress(totalRevenue, data.careerLevels);

  return (
    <div>
      <h1 className="text-5xl font-bold text-stone-900 mb-10">Guten Tag</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Gesamtumsatz', value: fmtEUR(totalRevenue) },
          { label: 'Pipeline', value: fmtEUR(pipelineRevenue) },
          { label: 'Rang', value: current.name },
          { label: 'Team', value: String((data.partners || []).length) },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-stone-200">
            <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">{kpi.label}</div>
            <div className="text-2xl font-semibold text-stone-900">{kpi.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-stone-200">
          <h3 className="font-semibold text-stone-900 mb-5">Umsatzentwicklung</h3>
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={[{m:'Jan',r:0},{m:'Feb',r:0},{m:'Mär',r:0},{m:'Apr',r:0},{m:'Mai',r:0},{m:'Jun',r:totalRevenue}]}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1c1917" stopOpacity={.2} /><stop offset="100%" stopColor="#1c1917" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#f5f5f4" vertical={false} /><XAxis dataKey="m" /><YAxis /><Tooltip /><Area type="monotone" dataKey="r" stroke="#1c1917" fill="url(#g)" /></AreaChart></ResponsiveContainer></div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-stone-200">
          <h3 className="font-semibold text-stone-900 mb-3">Karriere</h3>
          <div className="text-xs text-stone-500 uppercase mb-2">Aktuelle Stufe</div>
          <div className="text-2xl font-bold text-stone-900 mb-4">{current.name}</div>
          {next && <><div className="text-xs text-stone-500 mb-1">Nächste: {next.name}</div><div className="text-xs font-medium text-stone-900">noch {fmtEUR(next.threshold - totalRevenue)}</div></>}
        </div>
      </div>
    </div>
  );
}

function KarriereView({ data }) {
  const totalRevenue = useMemo(() => getTotalRevenue(data), [data]);
  const { current, next, remainingToNext, segmentProgress } = getCareerProgress(totalRevenue, data.careerLevels);
  return (
    <div>
      <h1 className="text-5xl font-bold text-stone-900 mb-8">Dein Aufstieg</h1>
      <div className="bg-stone-900 text-white rounded-2xl p-8 mb-8">
        <div className="flex justify-between mb-6"><div><div className="text-xs text-stone-400 uppercase">Aktuelle Stufe</div><div className="text-4xl font-bold mt-2">{current.name}</div></div><div className="text-right"><div className="text-xs text-stone-400 uppercase">Umsatz</div><div className="text-4xl font-bold mt-2">{fmtEUR(totalRevenue)}</div></div></div>
        {next && <><div className="flex justify-between text-sm mb-2"><span>37%</span><span>{next.name}</span></div><div className="bg-white/10 rounded-full h-2 mb-2" style={{background: 'linear-gradient(90deg, white 0%, white ' + segmentProgress + '%, rgba(255,255,255,.1) ' + segmentProgress + '%, rgba(255,255,255,.1) 100%)'}}></div></>}
      </div>
      <div className="space-y-2">
        {(data.careerLevels || DEFAULT_CAREER_LEVELS).map((level, idx) => {
          const isReached = totalRevenue >= level.threshold;
          const isCurrent = current.name === level.name;
          return (
            <div key={level.name} className={`p-4 rounded-xl border transition-all ${isCurrent ? 'bg-stone-900 text-white border-stone-900' : isReached ? 'bg-stone-100 border-stone-200' : 'bg-white border-stone-200 opacity-50'}`}>
              <div className="flex items-center justify-between">
                <div><span className="font-semibold">{level.name}</span> {isCurrent && <Badge variant="dark" className="ml-2">Aktuell</Badge>}</div>
                <div className="text-sm">{fmtEUR(level.threshold)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineView({ data, save }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'S1', date: '', status: 'Geplant', revenue: '', closed: false });

  const submit = async () => {
    if (!form.name.trim()) return;
    const updated = editing
      ? (data.appointments || []).map(a => a.id === editing ? { ...form, id: editing, revenue: Number(form.revenue) || 0 } : a)
      : [...(data.appointments || []), { ...form, id: uuid(), revenue: Number(form.revenue) || 0, createdAt: new Date().toISOString() }];
    await save({ ...data, appointments: updated });
    setModalOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-5xl font-bold text-stone-900">Pipeline</h1>
        <Button onClick={() => { setForm({ name: '', type: 'S1', date: '', status: 'Geplant', revenue: '', closed: false }); setEditing(null); setModalOpen(true); }} size="lg"><Plus className="w-4 h-4" />Neuer Termin</Button>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full">
          <thead><tr className="text-xs uppercase text-stone-500 border-b border-stone-200"><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Art</th><th className="px-4 py-3 text-left">Datum</th><th className="px-4 py-3 text-left">Umsatz</th></tr></thead>
          <tbody>
            {(data.appointments || []).map(apt => (
              <tr key={apt.id} className="border-b border-stone-100 hover:bg-stone-50"><td className="px-4 py-3 font-medium">{apt.name}</td><td className="px-4 py-3"><Badge>{apt.type}</Badge></td><td className="px-4 py-3 text-sm">{formatDate(apt.date)}</td><td className="px-4 py-3 text-sm font-medium">{fmtEUR(apt.revenue || 0)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Neuer Termin">
        <div className="space-y-4">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kundenname" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Datum</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div><div><Label>Umsatz (€)</Label><Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} /></div></div>
          <div className="flex gap-2 pt-3"><Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Abbrechen</Button><Button onClick={submit} className="flex-1">Speichern</Button></div>
        </div>
      </Modal>
    </div>
  );
}

function RechnerView({ data, save }) {
  const [age, setAge] = useState('');
  const [av, setAv] = useState('');
  const [bu, setBu] = useState('');

  const calc = useMemo(() => {
    const a = Number(age) || 0;
    const yearsToPension = Math.max(0, 67 - a);
    const avRev = (Number(av) || 0) * 12 * yearsToPension;
    const buRev = (Number(bu) || 0) * 12 * yearsToPension;
    return { avRev, buRev, total: avRev + buRev };
  }, [age, av, bu]);

  return (
    <div>
      <h1 className="text-5xl font-bold text-stone-900 mb-8">Umsatzrechner</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-stone-200">
          <h3 className="font-semibold mb-4">Eingabe</h3>
          <div className="space-y-4">
            <div><Label>Alter</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="35" /></div>
            <div><Label>Monatsbeitrag AV (€)</Label><Input type="number" value={av} onChange={(e) => setAv(e.target.value)} placeholder="150" /></div>
            <div><Label>Monatsbeitrag BU (€)</Label><Input type="number" value={bu} onChange={(e) => setBu(e.target.value)} placeholder="80" /></div>
          </div>
        </div>
        <div className="bg-stone-900 text-white rounded-xl p-6">
          <h3 className="font-semibold mb-4">Ergebnis</h3>
          <div className="space-y-3"><div><div className="text-xs text-stone-400 uppercase">AV</div><div className="text-2xl font-bold">{fmtEUR(calc.avRev)}</div></div><div><div className="text-xs text-stone-400 uppercase">BU</div><div className="text-2xl font-bold">{fmtEUR(calc.buRev)}</div></div><div className="border-t border-stone-700 pt-3"><div className="text-xs text-stone-400 uppercase">Gesamt</div><div className="text-4xl font-bold">{fmtEUR(calc.total)}</div></div></div>
        </div>
      </div>
    </div>
  );
}

function UmsaetzeView({ data, save }) {
  const total = (data.manualRevenue || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
  return (
    <div>
      <h1 className="text-5xl font-bold text-stone-900 mb-8">Manuelle Umsätze</h1>
      <div className="bg-white rounded-xl p-6 border border-stone-200">
        <div className="text-xs text-stone-500 uppercase mb-2">Summe</div>
        <div className="text-4xl font-bold text-stone-900 mb-6">{fmtEUR(total)}</div>
      </div>
    </div>
  );
}

function TeamView({ data, save }) {
  const totalTeamRev = (data.partners || []).reduce((s, p) => s + (Number(p.revenue) || 0), 0);
  return (
    <div>
      <h1 className="text-5xl font-bold text-stone-900 mb-8">Mein Team</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-stone-200">
          <div className="text-xs text-stone-500 uppercase mb-2">Teamgröße</div>
          <div className="text-3xl font-bold">{(data.partners || []).length}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-stone-200">
          <div className="text-xs text-stone-500 uppercase mb-2">Teamumsatz</div>
          <div className="text-3xl font-bold">{fmtEUR(totalTeamRev)}</div>
        </div>
      </div>
    </div>
  );
}

function ZieleView({ data, save }) {
  return (
    <div>
      <h1 className="text-5xl font-bold text-stone-900 mb-8">Ziele & Vision</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'traeume', title: 'Träume' },
          { key: 'wuensche', title: 'Wünsche' },
          { key: 'werte', title: 'Werte' },
          { key: 'vision', title: 'Vision' },
        ].map(item => (
          <div key={item.key} className="bg-white rounded-xl p-6 border border-stone-200">
            <h3 className="font-semibold mb-3">{item.title}</h3>
            <textarea value={(data.vision || {})[item.key] || ''} onChange={(e) => save({ ...data, vision: { ...(data.vision || {}), [item.key]: e.target.value } })} rows={5} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CoachView({ data, save }) {
  const [messages, setMessages] = useState(data.chatHistory || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const result = await response.json();
      const text = (result.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
      const assistantMsg = { role: 'assistant', content: text || 'Entschuldigung, ich konnte nicht antworten.' };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      await save({ ...data, chatHistory: finalMessages });
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Verbindung unterbrochen. Bitte versuche es erneut.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <h1 className="text-5xl font-bold text-stone-900 mb-6">KI-Coach</h1>
      <div className="flex-1 bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && <div className="text-center py-12 text-stone-400">Starte ein Gespräch mit deinem Coach</div>}
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs rounded-xl px-4 py-2 ${m.role === 'user' ? 'bg-stone-900 text-white' : 'bg-stone-100'}`}>
                <div className="text-sm">{m.content}</div>
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="bg-stone-100 rounded-xl px-4 py-2"><Loader2 className="w-4 h-4 animate-spin" /></div></div>}
        </div>
        <div className="border-t border-stone-200 p-4 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Frage deinen Coach..." />
          <Button onClick={send} disabled={loading || !input.trim()}><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ data, save, onResetPin }) {
  const [name, setName] = useState(data.userName || '');
  return (
    <div>
      <h1 className="text-5xl font-bold text-stone-900 mb-8">Einstellungen</h1>
      <div className="bg-white rounded-xl p-6 border border-stone-200 space-y-4">
        <div>
          <Label>Anzeigename</Label>
          <div className="flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" /><Button onClick={() => save({ ...data, userName: name })}>Speichern</Button></div>
        </div>
        <div className="pt-6 border-t"><Button variant="danger" onClick={onResetPin}><Lock className="w-4 h-4" />PIN zurücksetzen</Button></div>
      </div>
    </div>
  );
}
