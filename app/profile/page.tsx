'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop';
import { 
  User, LogOut, Loader2, ArrowLeft, Camera, 
  UserCircle, Target, Mail, Activity, Droplets, 
  Dumbbell, Bone, Scale, Ruler, PenLine, 
  Flame, CalendarDays, Save, X
} from 'lucide-react';
import Link from 'next/link';

const ModalOverlay = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity cursor-pointer" onClick={onClose}></div>
      {children}
    </div>
  );
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeModal, setActiveModal] = useState<'none' | 'personal' | 'goal' | 'biometrics' | 'crop'>('none');

  const [stats, setStats] = useState({ currentStreak: 0, totalWorkouts: 0 });

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [formData, setFormData] = useState({
    display_name: '',
    avatar_url: '',
    gender: 'male',
    age: '',
    height: '',
    weight: '',
    weight_goal: '',
    goal: 'build_muscle',
    body_fat: '',
    muscle_mass: '',
    bone_mass: '',
    body_water: '',
    chest: '',
    waist: '',
    hips: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUser(session.user);

      // ดึง Profile ปกติ
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
      if (profile) {
        const measurements = profile.body_measurements || {};
        setFormData({
          display_name: profile.display_name || '',
          avatar_url: profile.avatar_url || '',
          gender: profile.gender || 'male',
          age: profile.age?.toString() || '',
          height: profile.height?.toString() || '',
          weight: profile.weight_start?.toString() || '',
          weight_goal: profile.weight_goal?.toString() || '',
          goal: profile.goal_type || 'build_muscle',
          body_fat: profile.body_fat?.toString() || '',
          muscle_mass: profile.muscle_mass?.toString() || '',
          bone_mass: profile.bone_mass?.toString() || '',
          body_water: profile.body_water?.toString() || '',
          chest: measurements.chest?.toString() || '',
          waist: measurements.waist?.toString() || '',
          hips: measurements.hips?.toString() || ''
        });
      }

      const today = new Date();
      today.setHours(0,0,0,0);
      
      const { data: bodyLogs } = await supabase
        .from('body_logs')
        .select('date')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false });

      const { count: workoutCount } = await supabase
        .from('workout_logs')
        .select('date', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      let streak = 0;
      if (bodyLogs && bodyLogs.length > 0) {
        const dates = bodyLogs.map(l => new Date(l.date).getTime());
        const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b - a); 

        const latestDate = new Date(uniqueDates[0]);
        const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          streak = 1;
          for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i-1]);
            const currDate = new Date(uniqueDates[i]);
            const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diff === 1) streak++;
            else break;
          }
        }
      }

      if (profile && profile.streak_count !== streak) {
        await supabase.from('user_profiles').update({ streak_count: streak }).eq('id', session.user.id);
      }

      setStats({ currentStreak: streak, totalWorkouts: workoutCount || 0 });
      setIsLoading(false);
    };
    loadProfile();
  }, [router]);

  const calculateBMI = () => {
    if (!formData.weight || !formData.height) return '0.0';
    const heightInMeters = parseFloat(formData.height) / 100;
    const bmi = parseFloat(formData.weight) / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const calculateProgress = () => {
    if (!formData.weight || !formData.weight_goal) return 0;
    const start = parseFloat(formData.weight);
    const goal = parseFloat(formData.weight_goal);
    if (start === goal) return 100;
    
    const diff = Math.abs(start - goal);
    const progress = Math.max(0, 100 - (diff * 10)); 
    return Math.min(100, progress).toFixed(0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result?.toString() || null);
        setActiveModal('crop');
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropAndUpload = async () => {
    if (!imageToCrop || !croppedAreaPixels || !user) return;
    setIsUploading(true);

    try {
      const image = await createImage(imageToCrop);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = (croppedAreaPixels as any).width;
      canvas.height = (croppedAreaPixels as any).height;

      ctx.drawImage(
        image,
        (croppedAreaPixels as any).x,
        (croppedAreaPixels as any).y,
        (croppedAreaPixels as any).width,
        (croppedAreaPixels as any).height,
        0, 0,
        (croppedAreaPixels as any).width,
        (croppedAreaPixels as any).height
      );

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const fileExt = 'jpeg';
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        await supabase.from('user_profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
        
        setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
        setActiveModal('none');
        setIsUploading(false);
        setImageToCrop(null);
      }, 'image/jpeg', 0.9);

    } catch (error) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    
    const measurements = {
      chest: formData.chest ? parseFloat(formData.chest) : null,
      waist: formData.waist ? parseFloat(formData.waist) : null,
      hips: formData.hips ? parseFloat(formData.hips) : null
    };

    const payload = {
      id: user.id,
      display_name: formData.display_name,
      gender: formData.gender,
      age: formData.age ? parseInt(formData.age) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      weight_start: formData.weight ? parseFloat(formData.weight) : null,
      weight_goal: formData.weight_goal ? parseFloat(formData.weight_goal) : null,
      goal_type: formData.goal,
      body_fat: formData.body_fat ? parseFloat(formData.body_fat) : null,
      muscle_mass: formData.muscle_mass ? parseFloat(formData.muscle_mass) : null,
      bone_mass: formData.bone_mass ? parseFloat(formData.bone_mass) : null,
      body_water: formData.body_water ? parseFloat(formData.body_water) : null,
      body_measurements: measurements,
      is_onboarded: true
    };

    const { error } = await supabase.from('user_profiles').upsert(payload);
    setIsSaving(false);
    if (!error) setActiveModal('none');
    else alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin text-red-500" size={32} /></div>;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-24">

      {/* Profile Avatar & Main Info */}
      <section className="bg-gradient-to-br from-[#18181b] to-[#09090b] border border-[#27272a] p-6 rounded-[2rem] flex flex-col sm:flex-row items-center gap-6 relative shadow-xl">
        <div className="relative group cursor-pointer z-10" onClick={() => fileInputRef.current?.click()}>
          <div className="w-28 h-28 rounded-full overflow-hidden bg-zinc-900 border-[3px] border-zinc-800 flex items-center justify-center relative shadow-lg group-hover:border-red-500 transition-colors">
            {isUploading ? <Loader2 className="animate-spin text-red-500" size={28} /> 
              : formData.avatar_url ? <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" /> 
              : <UserCircle size={56} className="text-zinc-700" />}
          </div>
          <div className="absolute bottom-0 right-0 bg-red-600 p-2.5 rounded-full border-[3px] border-[#18181b] text-white shadow-lg">
            <Camera size={14} />
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />

        <div className="text-center sm:text-left z-10 flex-1">
          <h2 className="text-3xl font-black text-white">{formData.display_name || 'Athlete'}</h2>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
            <div className="flex items-center gap-1.5 bg-[#09090b] border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-zinc-400 font-medium">
              <Mail size={12} className="text-zinc-500" /> {user?.email}
            </div>
            <div className="flex items-center gap-1.5 bg-[#09090b] border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-zinc-400 font-medium uppercase tracking-wider">
              {formData.gender === 'male' ? 'Male' : 'Female'} • {formData.age || '-'} Yrs
            </div>
          </div>
        </div>
      </section>

      {/* Fitness Stats Summary */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Flame size={16} className="text-orange-500" />
          </div>
          <span className="text-xl font-black text-white mt-1">{stats.currentStreak}</span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Day Streak</span>
        </div>
        <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <CalendarDays size={16} className="text-blue-500" />
          </div>
          <span className="text-xl font-black text-white mt-1">{stats.totalWorkouts}</span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Workouts</span>
        </div>
        <div className="col-span-2 bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <Target size={14} className="text-red-500"/> Current Goal
            </span>
            <span className="text-sm font-bold text-white mt-2">
              {formData.goal === 'lose_weight' ? 'Fat Loss / Cut' : formData.goal === 'build_muscle' ? 'Muscle Gain / Bulk' : 'Maintenance'}
            </span>
          </div>
          <button onClick={() => setActiveModal('goal')} className="p-2.5 bg-[#09090b] border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <PenLine size={16} />
          </button>
        </div>
      </section>

      {/* Stats Grid: Personal & Biometrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Personal Stats */}
        <section className="bg-[#18181b] border border-[#27272a] rounded-3xl p-5 flex flex-col gap-5">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <User size={16} className="text-blue-500" /> Body Specs
            </h3>
            <button onClick={() => setActiveModal('personal')} className="text-zinc-400 hover:text-white p-2 bg-[#09090b] border border-zinc-800 rounded-lg"><PenLine size={14} /></button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1"><Ruler size={12}/> Height</span>
              <span className="text-xl font-black text-white">{formData.height || '-'} <span className="text-xs text-zinc-600 font-bold">cm</span></span>
            </div>
            <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1"><Scale size={12}/> Weight</span>
              <span className="text-xl font-black text-white">{formData.weight || '-'} <span className="text-xs text-zinc-600 font-bold">kg</span></span>
            </div>

            <div className="col-span-2 bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-blue-400 uppercase font-bold tracking-widest">Body Mass Index</span>
                <span className="text-[10px] text-blue-500/70 font-medium mt-0.5">BMI Score</span>
              </div>
              <span className="text-2xl font-black text-blue-500">{calculateBMI()}</span>
            </div>

            {/* Target Weight */}
            <div className="col-span-2 bg-gradient-to-r from-red-500/10 to-[#09090b] border border-red-500/20 p-4 rounded-2xl flex flex-col justify-center relative overflow-hidden">
              <div className="flex justify-between items-end z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] text-red-400 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1"><Target size={12}/> Target Weight</span>
                  <span className="text-xl font-black text-white">{formData.weight_goal || '-'} <span className="text-xs text-zinc-500 font-bold">kg</span></span>
                </div>
                <span className="text-sm font-black text-red-500">{calculateProgress()}%</span>
              </div>
              <div className="w-full bg-black/50 rounded-full h-1.5 mt-3 z-10">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${calculateProgress()}%` }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Body Composition */}
        <section className="bg-[#18181b] border border-[#27272a] rounded-3xl p-5 flex flex-col gap-5">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" /> Composition
            </h3>
            <button onClick={() => setActiveModal('biometrics')} className="text-zinc-400 hover:text-white p-2 bg-[#09090b] border border-zinc-800 rounded-lg"><PenLine size={14} /></button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 h-full">
            <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1"><Flame size={12} className="text-orange-500"/> Fat</span>
              <span className="text-lg font-bold text-white">{formData.body_fat || '-'} <span className="text-[10px] text-zinc-600">%</span></span>
            </div>
            <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1"><Dumbbell size={12} className="text-blue-500"/> Muscle</span>
              <span className="text-lg font-bold text-white">{formData.muscle_mass || '-'} <span className="text-[10px] text-zinc-600">kg</span></span>
            </div>
            <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1"><Bone size={12} className="text-zinc-400"/> Bone</span>
              <span className="text-lg font-bold text-white">{formData.bone_mass || '-'} <span className="text-[10px] text-zinc-600">kg</span></span>
            </div>
            <div className="bg-[#09090b] border border-zinc-800 p-4 rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1"><Droplets size={12} className="text-cyan-500"/> Water</span>
              <span className="text-lg font-bold text-white">{formData.body_water || '-'} <span className="text-[10px] text-zinc-600">%</span></span>
            </div>
          </div>
        </section>

      </div>

      {/* Measurements List */}
      <section className="bg-[#18181b] border border-[#27272a] rounded-3xl p-5 flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Ruler size={16} className="text-purple-500" /> Measurements
          </h3>
          <button onClick={() => setActiveModal('biometrics')} className="text-zinc-400 hover:text-white p-2 bg-[#09090b] border border-zinc-800 rounded-lg"><PenLine size={14} /></button>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {['chest', 'waist', 'hips'].map((part) => (
            <div key={part} className="bg-[#09090b] border border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">{part}</span>
              <span className="text-xl font-black text-white">{formData[part as keyof typeof formData] || '-'} <span className="text-[10px] text-zinc-600 font-bold">cm</span></span>
            </div>
          ))}
        </div>
      </section>

      {/* Sign Out Button */}
      <section className="mt-4">
        <button 
          onClick={handleSignOut} 
          className="w-full bg-[#18181b] hover:bg-red-950/30 border border-[#27272a] hover:border-red-500/50 text-red-500 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <LogOut size={16} /> SIGN OUT
        </button>
      </section>

      {/* Modal: Image Cropper */}
      {activeModal === 'crop' && imageToCrop && (
        <ModalOverlay onClose={() => { setActiveModal('none'); setImageToCrop(null); }}>
          <div className="relative z-10 bg-[#18181b] border border-[#27272a] rounded-[2rem] p-4 w-full max-w-sm flex flex-col gap-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Adjust Avatar</h3>
              <button onClick={() => { setActiveModal('none'); setImageToCrop(null); }} className="text-zinc-500 hover:text-white"><X size={18}/></button>
            </div>
            
            <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="flex flex-col gap-2 px-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Zoom</label>
              <input 
                type="range" value={zoom} min={1} max={3} step={0.1} 
                onChange={(e) => setZoom(Number(e.target.value))} 
                className="w-full accent-red-600" 
              />
            </div>

            <button onClick={handleCropAndUpload} disabled={isUploading} className="bg-white hover:bg-zinc-200 text-black py-4 rounded-xl text-xs font-black uppercase tracking-widest flex justify-center gap-2 transition-all">
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16}/> Save Avatar</>}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: ข้อมูลส่วนตัว */}
      {activeModal === 'personal' && (
        <ModalOverlay onClose={() => setActiveModal('none')}>
          <div className="relative z-10 bg-[#18181b] border border-[#27272a] rounded-[2rem] p-6 w-full max-w-sm flex flex-col gap-5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><User size={16} className="text-blue-500"/> Edit Specs</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Display Name</label>
                <input type="text" value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:border-red-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:border-red-500 outline-none appearance-none">
                    <option value="male">Male</option><option value="female">Female</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Age</label>
                  <input type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:border-red-500 outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Height (cm)</label>
                  <input type="number" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:border-red-500 outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Weight (kg)</label>
                  <input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:border-red-500 outline-none" />
                </div>
              </div>
            </div>
            <button onClick={handleUpdateProfile} disabled={isSaving} className="mt-2 bg-white hover:bg-zinc-200 text-black py-4 rounded-xl text-xs font-black uppercase tracking-widest flex justify-center gap-2 transition-all">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Specs'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: เป้าหมาย */}
      {activeModal === 'goal' && (
        <ModalOverlay onClose={() => setActiveModal('none')}>
          <div className="relative z-10 bg-[#18181b] border border-[#27272a] rounded-[2rem] p-6 w-full max-w-sm flex flex-col gap-5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><Target size={16} className="text-red-500"/> Edit Mission</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Main Goal</label>
                <div className="flex flex-col gap-2">
                  {['lose_weight', 'build_muscle', 'maintain'].map((g) => (
                    <button key={g} onClick={() => setFormData({...formData, goal: g})} className={`p-4 rounded-xl text-xs font-bold text-left transition-all border ${formData.goal === g ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-[#09090b] border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}>
                      {g === 'lose_weight' ? 'Fat Loss / Cut' : g === 'build_muscle' ? 'Muscle Gain / Bulk' : 'Maintenance'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Weight (kg)</label>
                <input type="number" placeholder="70" value={formData.weight_goal} onChange={e => setFormData({...formData, weight_goal: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 text-sm font-bold text-white focus:border-red-500 outline-none" />
              </div>
            </div>
            <button onClick={handleUpdateProfile} disabled={isSaving} className="mt-2 bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest flex justify-center gap-2 transition-all">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Mission'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: ดัชนีร่างกาย (Biometrics) */}
      {activeModal === 'biometrics' && (
        <ModalOverlay onClose={() => setActiveModal('none')}>
          <div className="relative z-10 bg-[#18181b] border border-[#27272a] rounded-[2rem] p-6 w-full max-w-sm flex flex-col gap-5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><Activity size={16} className="text-emerald-500"/> Edit Composition</h3>
            
            <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5"><label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1"><Flame size={10} className="text-orange-500"/> Fat (%)</label><input type="number" value={formData.body_fat} onChange={e => setFormData({...formData, body_fat: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none" /></div>
                <div className="flex flex-col gap-1.5"><label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1"><Dumbbell size={10} className="text-blue-500"/> Muscle (kg)</label><input type="number" value={formData.muscle_mass} onChange={e => setFormData({...formData, muscle_mass: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none" /></div>
                <div className="flex flex-col gap-1.5"><label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1"><Bone size={10} className="text-zinc-400"/> Bone (kg)</label><input type="number" value={formData.bone_mass} onChange={e => setFormData({...formData, bone_mass: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none" /></div>
                <div className="flex flex-col gap-1.5"><label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1"><Droplets size={10} className="text-cyan-500"/> Water (%)</label><input type="number" value={formData.body_water} onChange={e => setFormData({...formData, body_water: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none" /></div>
              </div>

              <div className="h-px bg-zinc-800 w-full"></div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1.5 text-center"><label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Chest</label><input type="number" value={formData.chest} onChange={e => setFormData({...formData, chest: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-purple-500 outline-none text-center" /></div>
                <div className="flex flex-col gap-1.5 text-center"><label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Waist</label><input type="number" value={formData.waist} onChange={e => setFormData({...formData, waist: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-purple-500 outline-none text-center" /></div>
                <div className="flex flex-col gap-1.5 text-center"><label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Hips</label><input type="number" value={formData.hips} onChange={e => setFormData({...formData, hips: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-purple-500 outline-none text-center" /></div>
              </div>
            </div>
            <button onClick={handleUpdateProfile} disabled={isSaving} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest flex justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Data'}
            </button>
          </div>
        </ModalOverlay>
      )}

    </div>
  );
}