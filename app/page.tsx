'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Scale, Moon, CheckCircle, Target, ChevronRight, Plus, BookOpen, Loader2, 
  Gamepad2, Video, Book, Briefcase, Music, X, Calendar, User, Dumbbell, 
  Utensils, Activity, Code, LineChart, Mic, Flame, Droplets, Bone, Zap
} from 'lucide-react';
import Link from 'next/link';

type ToastType = 'success' | 'info' | 'error';

const ICON_MAP: Record<string, any> = {
  target: <Target size={14} />, code: <Code size={14} />, chart: <LineChart size={14} />, 
  mic: <Mic size={14} />, game: <Gamepad2 size={14} />, video: <Video size={14} />, 
  book: <Book size={14} />, music: <Music size={14} />, work: <Briefcase size={14} />
};

const COLOR_OPTIONS = [
  { id: 'red', class: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { id: 'blue', class: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { id: 'emerald', class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'amber', class: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'purple', class: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'pink', class: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
  { id: 'zinc', class: 'text-zinc-300 bg-zinc-800/50 border-zinc-700' },
];

const INITIAL_TAGS = [
  { id: 'coding', label: 'Code & Build', iconName: 'code', colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { id: 'trading', label: 'Gold Trading', iconName: 'chart', colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);

  const [logMode, setLogMode] = useState<'quick' | 'deep'>('quick');

  const [weight, setWeight] = useState(''); 
  const [sleep, setSleep] = useState('');
  const [notes, setNotes] = useState('');
  
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [boneMass, setBoneMass] = useState('');
  const [bodyWater, setBodyWater] = useState('');
  
  const [customTags, setCustomTags] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [tagModal, setTagModal] = useState(false);
  const [newTag, setNewTag] = useState({ label: '', iconName: 'target', colorClass: COLOR_OPTIONS[0].class });

  const [todayStats, setTodayStats] = useState({ calories: 0, protein: 0, workoutDone: false });
  const [goalStats, setGoalStats] = useState({ calories: 2400, protein: 150 }); 
  
  const [toast, setToast] = useState<{ show: boolean, message: string, type: ToastType }>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const savedTags = localStorage.getItem('biolog_custom_tags');
    if (savedTags) setCustomTags(JSON.parse(savedTags));
    else setCustomTags(INITIAL_TAGS);
    setIsLoaded(true); 
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('biolog_custom_tags', JSON.stringify(customTags));
  }, [customTags, isLoaded]);

  useEffect(() => {
    const loadDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUser(session.user);

      const { data: userProfile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
      if (!userProfile || !userProfile.is_onboarded) { router.push('/onboarding'); return; }
      setProfile(userProfile);
      
      let targetCal = 2200;
      if (userProfile.weight_start && userProfile.height && userProfile.age) {
        const w = parseFloat(userProfile.weight_start);
        const h = parseFloat(userProfile.height);
        const a = parseInt(userProfile.age);
        const gender = userProfile.gender || 'male';
        
        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr = gender === 'male' ? bmr + 5 : bmr - 161;
        const tdee = Math.round(bmr * 1.55);
        
        targetCal = tdee;
        if (userProfile.goal_type === 'lose_weight') targetCal -= 500;
        if (userProfile.goal_type === 'build_muscle') targetCal += 300;
      }

      const targetPro = userProfile.weight_start ? Math.round(userProfile.weight_start * 2.2) : 150;
      setGoalStats({ calories: targetCal, protein: targetPro });

      const today = new Date().toISOString().split('T')[0];

      const { data: bodyLog } = await supabase.from('body_logs').select('*').eq('user_id', session.user.id).eq('date', today).single();
      if (bodyLog) {
        setLogId(bodyLog.id);
        if (bodyLog.weight) setWeight(bodyLog.weight.toString());
        if (bodyLog.sleep_hours) setSleep(bodyLog.sleep_hours.toString());
        if (bodyLog.notes) setNotes(bodyLog.notes);
        if (bodyLog.tags) setActiveTags(bodyLog.tags);
        
        if (userProfile.body_fat) setBodyFat(userProfile.body_fat.toString());
        if (userProfile.muscle_mass) setMuscleMass(userProfile.muscle_mass.toString());
        if (userProfile.bone_mass) setBoneMass(userProfile.bone_mass.toString());
        if (userProfile.body_water) setBodyWater(userProfile.body_water.toString());
      } else {
        if (userProfile.weight_start) setWeight(userProfile.weight_start.toString());
        if (userProfile.body_fat) setBodyFat(userProfile.body_fat.toString());
        if (userProfile.muscle_mass) setMuscleMass(userProfile.muscle_mass.toString());
        if (userProfile.bone_mass) setBoneMass(userProfile.bone_mass.toString());
        if (userProfile.body_water) setBodyWater(userProfile.body_water.toString());
      }

      const [foodRes, workoutRes] = await Promise.all([
        supabase.from('food_logs').select('calories, protein').eq('user_id', session.user.id).eq('date', today),
        supabase.from('workout_logs').select('id').eq('user_id', session.user.id).eq('date', today)
      ]);

      let cal = 0, pro = 0;
      foodRes.data?.forEach(f => { cal += f.calories; pro += Number(f.protein); });
      setTodayStats({ calories: cal, protein: Math.round(pro), workoutDone: (workoutRes.data && workoutRes.data.length > 0) as boolean });

      setIsLoading(false);
    };

    loadDashboardData();
  }, [router]);

  const showNotification = (message: string, type: ToastType = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const startPress = (tag: any) => {
    const timer = setTimeout(() => {
      setEditingTagId(tag.id);
      setNewTag({ label: tag.label, iconName: tag.iconName, colorClass: tag.colorClass });
      setTagModal(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const endPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const toggleTag = (tagId: string) => setActiveTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);

  const saveTag = () => {
    if (!newTag.label.trim()) return;
    if (editingTagId) {
      setCustomTags(prev => prev.map(t => t.id === editingTagId ? { ...t, ...newTag } : t));
    } else {
      const tagId = `custom-${Date.now()}`;
      setCustomTags(prev => [...prev, { id: tagId, ...newTag }]);
      setActiveTags(prev => [...prev, tagId]);
    }
    setTagModal(false);
    setEditingTagId(null);
    setNewTag({ label: '', iconName: 'target', colorClass: COLOR_OPTIONS[0].class });
  };

  const deleteTag = (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation();
    setCustomTags(prev => prev.filter(t => t.id !== tagId));
    setActiveTags(prev => prev.filter(id => id !== tagId));
  };

  const handleSaveCheckIn = async () => {
    if (!user) return;
    setIsSaving(true);
    
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      user_id: user.id, date: today,
      weight: weight ? parseFloat(weight) : null,
      sleep_hours: sleep ? parseFloat(sleep) : null,
      tags: activeTags, notes: notes,
    };

    if (logMode === 'deep') {
      const profileUpdate = {
        weight_start: weight ? parseFloat(weight) : null,
        body_fat: bodyFat ? parseFloat(bodyFat) : null,
        muscle_mass: muscleMass ? parseFloat(muscleMass) : null,
        bone_mass: boneMass ? parseFloat(boneMass) : null,
        body_water: bodyWater ? parseFloat(bodyWater) : null,
      };
      await supabase.from('user_profiles').update(profileUpdate).eq('id', user.id);
    }

    let saveError;
    if (logId) {
      const { error } = await supabase.from('body_logs').update(payload).eq('id', logId);
      saveError = error;
    } else {
      const { data, error } = await supabase.from('body_logs').insert(payload).select().single();
      saveError = error;
      if (data) setLogId(data.id);
    }

    setIsSaving(false);
    if (saveError) showNotification('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    else showNotification('บันทึกข้อมูลวันนี้เรียบร้อย!', 'success');
  };

  if (isLoading) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin text-red-500" size={32} /></div>;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-24">
      
      {/* Compact Header */}
      <section className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold text-white">
            Let's crush it, <span className="text-red-500">{profile?.display_name || 'Athlete'}</span>!
          </h2>
        </div>
      </section>

      {/* Body Logger Section */}
      <section className="bg-gradient-to-b from-[#18181b] to-[#09090b] border border-[#27272a] p-1.5 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        
        {/* Toggle Mode */}
        <div className="flex bg-[#09090b] p-1.5 rounded-[2rem] border border-zinc-800 mb-4 relative z-10">
          <button 
            onClick={() => setLogMode('quick')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${logMode === 'quick' ? 'bg-[#1c1c21] text-white shadow-lg border border-zinc-700/50' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            <Activity size={14} /> Quick Log
          </button>
          <button 
            onClick={() => setLogMode('deep')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${logMode === 'deep' ? 'bg-[#1c1c21] text-white shadow-lg border border-zinc-700/50' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            <Flame size={14} /> Deep Scan
          </button>
        </div>

        <div className="px-3 pb-3 flex flex-col gap-6 relative z-10">
          
          {/* Input Area */}
          {logMode === 'quick' ? (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-[1.5rem] flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl -mr-5 -mt-5"></div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Scale size={12} className="text-blue-400" /> Weight</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.0" className="w-full bg-transparent text-3xl font-black text-white focus:outline-none p-0" />
                  <span className="text-xs font-bold text-zinc-600">kg</span>
                </div>
              </div>
              <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-[1.5rem] flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl -mr-5 -mt-5"></div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Moon size={12} className="text-indigo-400" /> Sleep</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <input type="number" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="0.0" className="w-full bg-transparent text-3xl font-black text-white focus:outline-none p-0" />
                  <span className="text-xs font-bold text-zinc-600">hrs</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-[1.5rem] flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Scale size={14} className="text-blue-400" /> Weight</span>
                <div className="flex items-center gap-2 w-1/3"><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.0" className="w-full bg-transparent text-xl font-black text-white focus:outline-none text-right" /><span className="text-xs font-bold text-zinc-600">kg</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-[1.5rem] flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Flame size={12} className="text-orange-500" /> Body Fat</span>
                  <div className="flex items-baseline gap-1 mt-1"><input type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="0.0" className="w-full bg-transparent text-xl font-black text-white focus:outline-none p-0" /><span className="text-xs font-bold text-zinc-600">%</span></div>
                </div>
                <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-[1.5rem] flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Dumbbell size={12} className="text-emerald-500" /> Muscle</span>
                  <div className="flex items-baseline gap-1 mt-1"><input type="number" value={muscleMass} onChange={(e) => setMuscleMass(e.target.value)} placeholder="0.0" className="w-full bg-transparent text-xl font-black text-white focus:outline-none p-0" /><span className="text-xs font-bold text-zinc-600">kg</span></div>
                </div>
                <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-[1.5rem] flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Bone size={12} className="text-zinc-400" /> Bone</span>
                  <div className="flex items-baseline gap-1 mt-1"><input type="number" value={boneMass} onChange={(e) => setBoneMass(e.target.value)} placeholder="0.0" className="w-full bg-transparent text-xl font-black text-white focus:outline-none p-0" /><span className="text-xs font-bold text-zinc-600">kg</span></div>
                </div>
                <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-[1.5rem] flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Droplets size={12} className="text-cyan-500" /> Water</span>
                  <div className="flex items-baseline gap-1 mt-1"><input type="number" value={bodyWater} onChange={(e) => setBodyWater(e.target.value)} placeholder="0.0" className="w-full bg-transparent text-xl font-black text-white focus:outline-none p-0" /><span className="text-xs font-bold text-zinc-600">%</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="h-px w-full bg-zinc-800/50"></div>

          {/* Focus Tags */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Daily Focus</span>
            <div className="flex flex-wrap gap-2">
              {customTags.map(tag => {
                const isActive = activeTags.includes(tag.id);
                return (
                  <button 
                    key={tag.id} 
                    onClick={() => toggleTag(tag.id)} 
                    onMouseDown={() => startPress(tag)} onMouseUp={endPress} onMouseLeave={endPress} onTouchStart={() => startPress(tag)} onTouchEnd={endPress}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border relative select-none ${isActive ? `${tag.colorClass} ring-1 ring-white/20 shadow-sm` : 'bg-[#09090b] border-zinc-800 text-zinc-500 hover:bg-zinc-900'}`}
                  >
                    {ICON_MAP[tag.iconName] || <Target size={14} />} {tag.label}
                    <div onClick={(e) => deleteTag(e, tag.id)} className="ml-1 p-0.5 bg-black/30 hover:bg-black/50 rounded-full transition-all"><X size={12} className="text-zinc-400 hover:text-white" /></div>
                  </button>
                );
              })}
              <button 
                onClick={() => { setEditingTagId(null); setNewTag({ label: '', iconName: 'target', colorClass: COLOR_OPTIONS[0].class }); setTagModal(true); }}
                className="flex items-center justify-center px-4 py-2.5 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-500 transition-all bg-[#09090b]"
              ><Plus size={16} /></button>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add workout notes or how you feel today..." className="w-full h-20 bg-[#09090b] border border-zinc-800 rounded-2xl p-4 text-xs font-medium text-zinc-300 focus:border-red-500 focus:outline-none transition-colors resize-none placeholder:text-zinc-600"></textarea>
          </div>

          <button 
            onClick={handleSaveCheckIn} disabled={isSaving}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_10px_30px_-10px_rgba(220,38,38,0.5)] flex items-center justify-center gap-2 mt-2"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Log This Day'}
          </button>

        </div>
      </section>

      {/* Dashboard Apps */}
      <section className="flex flex-col gap-3 mt-2">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 px-1">
          <Activity size={14} className="text-zinc-500" />
          Dashboard Apps
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          
          {/* Diet Card */}
          <Link href="/nutrition" className="bg-[#18181b] border border-[#27272a] hover:border-orange-500/50 p-4 rounded-[1.5rem] flex flex-col gap-3 group transition-all relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center"><Utensils size={14} className="text-orange-500" /></div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Diet</span>
              </div>
              <ChevronRight size={14} className="text-zinc-600 group-hover:text-orange-500 transition-colors" />
            </div>
            <div className="flex flex-col gap-1 relative z-10">
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-black ${todayStats.calories > 0 ? 'text-white' : 'text-zinc-600'}`}>{todayStats.calories}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">/ {goalStats.calories} Kcal</span>
              </div>
              <div className="w-full bg-[#09090b] rounded-full h-1 mt-1 border border-zinc-800">
                <div className="bg-orange-500 h-1 rounded-full transition-all" style={{ width: `${Math.min((todayStats.calories / goalStats.calories) * 100, 100)}%` }}></div>
              </div>
            </div>
          </Link>

          {/* Workout Card */}
          <Link href="/workout" className="bg-[#18181b] border border-[#27272a] hover:border-emerald-500/50 p-4 rounded-[1.5rem] flex flex-col justify-between group transition-all relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center"><Dumbbell size={14} className="text-emerald-500" /></div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Workout</span>
              </div>
              <ChevronRight size={14} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
            </div>
            <div className="flex flex-col gap-1 relative z-10">
              <span className={`text-sm font-black uppercase tracking-wider ${todayStats.workoutDone ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {todayStats.workoutDone ? 'Completed' : 'Pending'}
              </span>
              <span className="text-[10px] font-bold text-zinc-600 uppercase">Daily Routine</span>
            </div>
          </Link>

          {/* History Card */}
          <Link href="/calendar" className="bg-[#18181b] border border-[#27272a] hover:border-blue-500/50 p-4 rounded-[1.5rem] flex flex-col justify-between group transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center"><Calendar size={14} className="text-blue-500" /></div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">History</span>
              </div>
              <ChevronRight size={14} className="text-zinc-600 group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="flex flex-col mt-3">
              <span className={`text-sm font-bold ${profile?.streak_count > 0 ? 'text-orange-500' : 'text-zinc-400'}`}>
                {profile?.streak_count > 0 ? `${profile.streak_count} Day Streak 🔥` : 'View Logs'}
              </span>
              <span className="text-[10px] font-bold text-zinc-600 uppercase">Track consistency</span>
            </div>
          </Link>

          {/* Profile Card */}
          <Link href="/profile" className="bg-[#18181b] border border-[#27272a] hover:border-purple-500/50 p-4 rounded-[1.5rem] flex flex-col justify-between group transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center"><User size={14} className="text-purple-500" /></div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Profile</span>
              </div>
              <ChevronRight size={14} className="text-zinc-600 group-hover:text-purple-500 transition-colors" />
            </div>
            <div className="flex flex-col mt-3">
              <span className="text-sm font-bold text-zinc-400">
                {profile?.weight_start ? `${profile.weight_start} kg` : 'Manage Data'}
              </span>
              <span className="text-[10px] font-bold text-zinc-600 uppercase">Current Body Weight</span>
            </div>
          </Link>

        </div>
      </section>

      {tagModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-[#27272a] rounded-[2rem] p-6 w-full max-w-sm shadow-2xl flex flex-col gap-5 animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Target className="text-red-500" size={16} /> {editingTagId ? 'Edit Focus' : 'New Focus'}
              </h3>
              <button onClick={() => setTagModal(false)} className="text-zinc-500 hover:text-white bg-[#09090b] p-1.5 rounded-full border border-zinc-800"><X size={16} /></button>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Label</label>
              <input type="text" value={newTag.label} onChange={(e) => setNewTag({ ...newTag, label: e.target.value })} placeholder="e.g. Reading, Running" className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-4 text-sm font-bold text-white focus:border-red-500 focus:outline-none" autoFocus />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Icon</label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ICON_MAP).map(key => (
                  <button key={key} onClick={() => setNewTag({ ...newTag, iconName: key })} className={`p-3 rounded-xl border transition-all ${newTag.iconName === key ? 'bg-zinc-800 border-zinc-500 text-white shadow-md' : 'bg-[#09090b] border-zinc-800 text-zinc-600 hover:bg-zinc-800/50'}`}>
                    {ICON_MAP[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.id} onClick={() => setNewTag({ ...newTag, colorClass: c.class })} className={`px-4 py-3 rounded-xl text-xs font-black border transition-all ${c.class} ${newTag.colorClass === c.class ? 'ring-2 ring-white/30 scale-105 shadow-md' : 'opacity-50 hover:opacity-100'}`}>
                    Aa
                  </button>
                ))}
              </div>
            </div>
            
            <button onClick={saveTag} disabled={!newTag.label.trim()} className="mt-2 w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-colors">
              {editingTagId ? 'Save Changes' : 'Create Focus'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Toast Alert */}
      {toast.show && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in zoom-in-90 slide-in-from-top-8 duration-300 ease-out">
          <div className={`bg-[#09090b]/90 backdrop-blur-xl border shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] px-5 py-3 rounded-2xl flex items-center gap-3 w-max max-w-[90vw] ${toast.type === 'error' ? 'border-red-500/50' : 'border-emerald-500/50'}`}>
            <CheckCircle size={18} className={`${toast.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`} />
            <span className="text-xs font-bold text-white uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}