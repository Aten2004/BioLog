'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  User, Activity, Target, ChevronRight, Loader2, 
  Droplets, Dumbbell, Bone, Ruler 
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    display_name: '',
    gender: 'male',
    age: '',
    height: '',
    weight: '',
    goal: 'build_muscle',
    // Body Comp (Optional)
    body_fat: '',
    muscle_mass: '',
    bone_mass: '',
    body_water: '',
    // Measurements (Optional)
    chest: '',
    waist: '',
    hips: ''
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      setIsLoading(false);
    };
    checkUser();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    const measurements = {
      chest: formData.chest ? parseFloat(formData.chest) : null,
      waist: formData.waist ? parseFloat(formData.waist) : null,
      hips: formData.hips ? parseFloat(formData.hips) : null
    };

    const payload = {
      id: user.id,
      display_name: formData.display_name || user.email?.split('@')[0],
      gender: formData.gender,
      age: formData.age ? parseInt(formData.age) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      weight_start: formData.weight ? parseFloat(formData.weight) : null,
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
    if (!error) {
      router.push('/');
    } else {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-red-500" size={32} /></div>;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 py-10 max-w-md mx-auto px-4">
      <section className="text-center flex flex-col gap-2 mb-4">
        <h2 className="text-3xl font-bold text-white">Welcome to BioLog</h2>
        <p className="text-zinc-400 text-sm px-4">ตั้งค่าโปรไฟล์และร่างกายของคุณเพื่อเริ่มติดตามผล</p>
      </section>

      <div className="bg-[#18181b] border border-[#27272a] rounded-[2rem] overflow-hidden shadow-xl">
        <div className="p-6 flex flex-col gap-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          <section className="flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <User size={14} /> Basic Information
            </h3>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">ชื่อที่ต้องการให้แอปเรียก</label>
              <input type="text" placeholder="ชื่อเล่นของคุณ" value={formData.display_name} onChange={(e) => setFormData({...formData, display_name: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">เพศ</label>
                <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none appearance-none">
                  <option value="male">ชาย (Male)</option>
                  <option value="female">หญิง (Female)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">อายุ</label>
                <input type="number" placeholder="เช่น 21" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">ส่วนสูง (cm)</label>
                <input type="number" placeholder="175" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">น้ำหนัก (kg)</label>
                <input type="number" placeholder="57.2" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none" />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Target size={14} /> Main Goal
            </h3>
            <div className="flex flex-col gap-2">
              {['lose_weight', 'build_muscle', 'maintain'].map((g) => (
                <button 
                  key={g}
                  onClick={() => setFormData({...formData, goal: g})}
                  className={`py-3.5 px-4 rounded-xl text-xs font-bold text-left transition-all border ${formData.goal === g ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'bg-[#09090b] border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                >
                  {g === 'lose_weight' ? '🔥 ลดน้ำหนัก / ลดไขมัน' : g === 'build_muscle' ? '💪 เพิ่มน้ำหนัก / สร้างกล้ามเนื้อ' : '⚖️ รักษาสุขภาพทั่วไป'}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 border-t border-zinc-800 pt-6">
              <Activity size={14} /> Body Composition (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1 flex items-center gap-1"><Activity size={10} className="text-orange-400" /> ไขมัน (%)</label>
                <input type="number" placeholder="0.0" value={formData.body_fat} onChange={(e) => setFormData({...formData, body_fat: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-zinc-600 outline-none" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1 flex items-center gap-1"><Dumbbell size={10} className="text-blue-400" /> กล้ามเนื้อ (kg)</label>
                <input type="number" placeholder="0.0" value={formData.muscle_mass} onChange={(e) => setFormData({...formData, muscle_mass: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-zinc-600 outline-none" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1 flex items-center gap-1"><Bone size={10} className="text-zinc-200" /> มวลกระดูก (kg)</label>
                <input type="number" placeholder="0.0" value={formData.bone_mass} onChange={(e) => setFormData({...formData, bone_mass: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-zinc-600 outline-none" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1 flex items-center gap-1"><Droplets size={10} className="text-cyan-400" /> น้ำ (%)</label>
                <input type="number" placeholder="0.0" value={formData.body_water} onChange={(e) => setFormData({...formData, body_water: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-zinc-600 outline-none" />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 border-t border-zinc-800 pt-6">
              <Ruler size={14} /> Measurements (Optional)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-2 text-center">
                <label className="text-[10px] font-bold text-zinc-600 uppercase">อก</label>
                <input type="number" placeholder="0.0" value={formData.chest} onChange={(e) => setFormData({...formData, chest: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl py-3 text-sm text-center text-white focus:border-zinc-600 outline-none" />
              </div>
              <div className="flex flex-col gap-2 text-center">
                <label className="text-[10px] font-bold text-zinc-600 uppercase">เอว</label>
                <input type="number" placeholder="0.0" value={formData.waist} onChange={(e) => setFormData({...formData, waist: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl py-3 text-sm text-center text-white focus:border-zinc-600 outline-none" />
              </div>
              <div className="flex flex-col gap-2 text-center">
                <label className="text-[10px] font-bold text-zinc-600 uppercase">สะโพก</label>
                <input type="number" placeholder="0.0" value={formData.hips} onChange={(e) => setFormData({...formData, hips: e.target.value})} className="bg-[#09090b] border border-zinc-800 rounded-xl py-3 text-sm text-center text-white focus:border-zinc-600 outline-none" />
              </div>
            </div>
          </section>

        </div>

        <div className="p-6 bg-[#1c1c21] border-t border-[#27272a]">
          <button 
            onClick={handleSaveProfile}
            disabled={isSaving || !formData.age || !formData.height || !formData.weight}
            className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-[0_10px_30px_-5px_rgba(220,38,38,0.4)] flex items-center justify-center gap-3 group"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                เริ่มการเดินทาง <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          <p className="text-[10px] text-zinc-500 text-center mt-4">กรอกข้อมูลเฉพาะที่มีเครื่องหมาย <span className="text-red-500">*</span> หรือข้อมูลที่จำเป็นเบื้องต้นเพื่อความแม่นยำ</p>
        </div>
      </div>
    </div>
  );
}