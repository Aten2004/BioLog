'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Flame, Beef, Wheat, Droplet, Sparkles, Copy, Plus, PenLine, 
  CheckCircle, SearchX, Loader2, X, Clock 
} from 'lucide-react';

export default function NutritionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [inputMode, setInputMode] = useState<'ai' | 'manual'>('ai');
  const [pasteData, setPasteData] = useState('');
  const [manualData, setManualData] = useState({ name: '', cal: '', p: '', c: '', f: '' });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [meals, setMeals] = useState<any[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<any[]>([]);

  const [goals, setGoals] = useState({ cal: 2000, protein: 150, carb: 200, fat: 55 });

  useEffect(() => {
    const loadNutritionData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUser(session.user);

      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
      
      if (profile && profile.weight_start && profile.height && profile.age) {
        const weight = parseFloat(profile.weight_start);
        const height = parseFloat(profile.height);
        const age = parseInt(profile.age);
        const gender = profile.gender || 'male';

        let bmr = (10 * weight) + (6.25 * height) - (5 * age);
        bmr = gender === 'male' ? bmr + 5 : bmr - 161;

        const tdee = Math.round(bmr * 1.55);

        let targetCal = tdee;
        if (profile.goal_type === 'lose_weight') targetCal -= 500; // ลดไขมัน
        if (profile.goal_type === 'build_muscle') targetCal += 300; // สร้างกล้ามเนื้อ (Lean Bulk)

        const targetPro = Math.round(weight * 2.2); // โปรตีน 2.2g / น้ำหนักตัว 1kg
        const targetFat = Math.round((targetCal * 0.25) / 9); // ไขมัน 25% ของแคลรวม
        const remainingCals = targetCal - (targetPro * 4) - (targetFat * 9);
        const targetCarb = Math.round(Math.max(0, remainingCals / 4)); // ที่เหลือเป็นคาร์บ

        setGoals({ cal: targetCal, protein: targetPro, fat: targetFat, carb: targetCarb });
      }

      const today = new Date().toISOString().split('T')[0];

      const { data: todayMeals } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .order('created_at', { ascending: true });
        
      if (todayMeals) setMeals(todayMeals);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: historyMeals } = await supabase
        .from('food_logs')
        .select('name, calories, protein, carbs, fat')
        .eq('user_id', session.user.id)
        .gte('date', thirtyDaysAgoStr)
        .order('created_at', { ascending: false });

      if (historyMeals) {
        const uniqueFoods: any[] = [];
        const seenNames = new Set();
        for (const item of historyMeals) {
          const lowerName = item.name.toLowerCase().trim();
          if (!seenNames.has(lowerName)) {
            seenNames.add(lowerName);
            uniqueFoods.push(item);
          }
          if (uniqueFoods.length >= 8) break; // ดึงมาแค่ 8 รายการล่าสุด
        }
        setFrequentFoods(uniqueFoods);
      }

      setIsLoading(false);
    };
    loadNutritionData();
  }, [router]);

  const currentMacros = {
    cal: meals.reduce((sum, meal) => sum + (meal.calories || 0), 0),
    protein: meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0),
    carb: meals.reduce((sum, meal) => sum + (Number(meal.carbs) || 0), 0),
    fat: meals.reduce((sum, meal) => sum + (Number(meal.fat) || 0), 0),
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const copyPrompt = () => {
    const prompt = `ทำหน้าที่เป็นผู้เชี่ยวชาญด้านโภชนาการและดึงข้อมูลจากภาพ เมื่อฉันส่งรูปให้คุณ ให้ทำตามกฎนี้อย่างเคร่งครัด:
    1. หากมี "ฉลากโภชนาการ" หรือ "ตัวเลข" ให้ดึงตัวเลขจากรูป 100% ห้ามเดา
    2. หากเป็นรูปอาหารปกติ ให้ประเมินปริมาณให้แม่นยำที่สุด
    ตอบกลับมาเฉพาะโค้ด JSON เท่านั้น ห้ามมีคำอธิบาย โดยใช้รูปแบบ: {"name": "ชื่ออาหาร", "cal": 0, "p": 0, "c": 0, "f": 0}`;
    navigator.clipboard.writeText(prompt);
    triggerToast('คัดลอก Prompt สำหรับ AI สำเร็จ!');
  };

  const saveMeal = async (mealData: { name: string, cal: number, p: number, c: number, f: number }) => {
    if (!user) return;
    setIsSaving(true);
    const today = new Date().toISOString().split('T')[0];

    const payload = {
      user_id: user.id,
      date: today,
      name: mealData.name,
      calories: mealData.cal,
      protein: mealData.p,
      carbs: mealData.c,
      fat: mealData.f
    };

    const { data, error } = await supabase.from('food_logs').insert(payload).select().single();
    setIsSaving(false);

    if (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกอาหาร');
    } else if (data) {
      setMeals([...meals, data]); 
      setPasteData('');
      setManualData({ name: '', cal: '', p: '', c: '', f: '' });
      triggerToast('บันทึกอาหารเรียบร้อย!');
      
      if (!frequentFoods.find(f => f.name.toLowerCase() === mealData.name.toLowerCase())) {
        setFrequentFoods([{ name: mealData.name, calories: mealData.cal, protein: mealData.p, carbs: mealData.c, fat: mealData.f }, ...frequentFoods]);
      }
    }
  };

  const handleManualSave = () => {
    if (!manualData.name || !manualData.cal) { alert('กรุณากรอกชื่อและแคลอรี่'); return; }
    saveMeal({
      name: manualData.name.trim(),
      cal: parseInt(manualData.cal) || 0,
      p: parseFloat(manualData.p) || 0,
      c: parseFloat(manualData.c) || 0,
      f: parseFloat(manualData.f) || 0
    });
  };

  const handleAISave = () => {
    try {
      const parsed = JSON.parse(pasteData);
      if (parsed.name && parsed.cal !== undefined) {
        saveMeal({
          name: parsed.name,
          cal: Number(parsed.cal),
          p: Number(parsed.p) || 0,
          c: Number(parsed.c) || 0,
          f: Number(parsed.f) || 0
        });
      } else {
        alert('รูปแบบ JSON ไม่ถูกต้อง');
      }
    } catch (e) {
      alert('ไม่สามารถอ่าน JSON ได้ กรุณาตรวจสอบให้แน่ใจว่าก๊อปปี้มาถูกต้อง');
    }
  };

  const deleteMeal = async (id: string) => {
    const { error } = await supabase.from('food_logs').delete().eq('id', id);
    if (!error) setMeals(meals.filter(m => m.id !== id));
  };

  if (isLoading) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin text-red-500" size={32} /></div>;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-24">
      
      {/* Header */}
      <section className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold text-white">Nutrition</h2>
        </div>
        <button 
          onClick={copyPrompt}
          className="flex items-center gap-2 bg-red-600/10 border border-red-500/30 hover:bg-red-600 hover:text-white text-red-400 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm"
        >
          <Copy size={14} /> AI Prompt
        </button>
      </section>

      {/* Input Section */}
      <section className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex flex-col gap-4 shadow-xl">
        <div className="flex bg-[#09090b] p-1.5 rounded-xl border border-zinc-800">
          <button 
            onClick={() => setInputMode('ai')} 
            className={`flex-1 flex items-center justify-center gap-2 text-xs uppercase tracking-widest py-2.5 rounded-lg font-bold transition-all ${inputMode === 'ai' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Sparkles size={14} className={inputMode === 'ai' ? 'text-red-500' : ''} /> AI Paste
          </button>
          <button 
            onClick={() => setInputMode('manual')} 
            className={`flex-1 flex items-center justify-center gap-2 text-xs uppercase tracking-widest py-2.5 rounded-lg font-bold transition-all ${inputMode === 'manual' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <PenLine size={14} /> Manual
          </button>
        </div>

        {inputMode === 'ai' ? (
          <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
            <input 
              type="text" 
              placeholder='{"name": "อกไก่", "cal": 200, "p": 40}' 
              className="flex-1 bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-red-500 transition-colors placeholder:text-zinc-700"
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
            />
            <button onClick={handleAISave} disabled={!pasteData || isSaving} className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white w-12 flex items-center justify-center rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:shadow-none">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
            <input 
              type="text" placeholder='Food name (e.g. Chicken Breast)' 
              className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
              value={manualData.name} onChange={(e) => setManualData({...manualData, name: e.target.value})}
            />
            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col gap-1"><span className="text-[10px] text-zinc-500 font-bold uppercase text-center">Kcal</span><input type="number" placeholder="0" className="bg-[#09090b] border border-zinc-800 rounded-xl px-1 py-3 text-sm font-black text-center text-white focus:outline-none focus:border-orange-500" value={manualData.cal} onChange={(e) => setManualData({...manualData, cal: e.target.value})} /></div>
              <div className="flex flex-col gap-1"><span className="text-[10px] text-red-500 font-bold uppercase text-center">Pro</span><input type="number" placeholder="0" className="bg-[#09090b] border border-zinc-800 rounded-xl px-1 py-3 text-sm font-black text-center text-white focus:outline-none focus:border-red-500" value={manualData.p} onChange={(e) => setManualData({...manualData, p: e.target.value})} /></div>
              <div className="flex flex-col gap-1"><span className="text-[10px] text-amber-500 font-bold uppercase text-center">Carb</span><input type="number" placeholder="0" className="bg-[#09090b] border border-zinc-800 rounded-xl px-1 py-3 text-sm font-black text-center text-white focus:outline-none focus:border-amber-500" value={manualData.c} onChange={(e) => setManualData({...manualData, c: e.target.value})} /></div>
              <div className="flex flex-col gap-1"><span className="text-[10px] text-yellow-500 font-bold uppercase text-center">Fat</span><input type="number" placeholder="0" className="bg-[#09090b] border border-zinc-800 rounded-xl px-1 py-3 text-sm font-black text-center text-white focus:outline-none focus:border-yellow-500" value={manualData.f} onChange={(e) => setManualData({...manualData, f: e.target.value})} /></div>
            </div>
            <button onClick={handleManualSave} disabled={isSaving || !manualData.name || !manualData.cal} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-[#09090b] disabled:text-zinc-600 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl transition-colors mt-1 flex justify-center items-center">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Log Food'}
            </button>
          </div>
        )}
      </section>

      {/* Macros Summary Panel */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Calories */}
        <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-full blur-xl -mr-5 -mt-5"></div>
          <div className="flex items-center justify-between text-zinc-400 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Calories</span>
            <Flame size={14} className="text-orange-500" />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-xl font-black text-white">{currentMacros.cal}</span>
            <span className="text-[10px] font-bold text-zinc-500">/ {goals.cal} kcal</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-1 mt-1 relative z-10">
            <div className="bg-orange-500 h-1 rounded-full transition-all" style={{ width: `${Math.min((currentMacros.cal / goals.cal) * 100, 100)}%` }}></div>
          </div>
        </div>

        {/* Protein */}
        <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full blur-xl -mr-5 -mt-5"></div>
          <div className="flex items-center justify-between text-zinc-400 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Protein</span>
            <Beef size={14} className="text-red-500" />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-xl font-black text-white">{Math.round(currentMacros.protein)}g</span>
            <span className="text-[10px] font-bold text-zinc-500">/ {goals.protein}g</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-1 mt-1 relative z-10">
            <div className="bg-red-500 h-1 rounded-full transition-all" style={{ width: `${Math.min((currentMacros.protein / goals.protein) * 100, 100)}%` }}></div>
          </div>
        </div>

        {/* Carbs */}
        <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl -mr-5 -mt-5"></div>
          <div className="flex items-center justify-between text-zinc-400 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Carbs</span>
            <Wheat size={14} className="text-amber-500" />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-xl font-black text-white">{Math.round(currentMacros.carb)}g</span>
            <span className="text-[10px] font-bold text-zinc-500">/ {goals.carb}g</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-1 mt-1 relative z-10">
            <div className="bg-amber-500 h-1 rounded-full transition-all" style={{ width: `${Math.min((currentMacros.carb / goals.carb) * 100, 100)}%` }}></div>
          </div>
        </div>

        {/* Fat */}
        <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 rounded-full blur-xl -mr-5 -mt-5"></div>
          <div className="flex items-center justify-between text-zinc-400 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">Fat</span>
            <Droplet size={14} className="text-yellow-500" />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-xl font-black text-white">{Math.round(currentMacros.fat)}g</span>
            <span className="text-[10px] font-bold text-zinc-500">/ {goals.fat}g</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-1 mt-1 relative z-10">
            <div className="bg-yellow-500 h-1 rounded-full transition-all" style={{ width: `${Math.min((currentMacros.fat / goals.fat) * 100, 100)}%` }}></div>
          </div>
        </div>
      </section>

      {/* Today's Log */}
      <section className="flex flex-col gap-3 mt-2">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Today's Log</h3>
        
        {meals.length === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] border-dashed p-6 rounded-2xl flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-1">
              <SearchX size={18} className="text-zinc-600" />
            </div>
            <span className="text-sm font-bold text-white">No Meals Logged</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Start tracking your first meal</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {meals.map((meal) => (
              <div key={meal.id} className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex justify-between items-center group relative overflow-hidden transition-all hover:border-zinc-700">
                <div className="flex flex-col gap-1 z-10">
                  <span className="text-white font-bold text-sm">{meal.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-orange-500">{meal.calories} kcal</span>
                    <span className="text-[10px] text-zinc-500 font-bold tracking-widest">
                      P:{Number(meal.protein).toFixed(0)} • C:{Number(meal.carbs).toFixed(0)} • F:{Number(meal.fat).toFixed(0)}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => deleteMeal(meal.id)}
                  className="z-10 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent / Frequent Foods (History) */}
      {frequentFoods.length > 0 && (
        <section className="flex flex-col gap-3 mt-2 border-t border-zinc-800/50 pt-6">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
            <Clock size={12} /> Recent Meals
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {frequentFoods.map((food, idx) => (
              <div key={`freq-${idx}`} className="bg-[#09090b] border border-[#27272a] p-3 rounded-xl flex justify-between items-center hover:border-zinc-700 transition-colors">
                <div className="flex flex-col">
                  <span className="text-zinc-300 font-bold text-xs">{food.name}</span>
                  <span className="text-[10px] text-zinc-600 font-bold tracking-widest">{food.calories} kcal</span>
                </div>
                <button 
                  onClick={() => saveMeal({ name: food.name, cal: food.calories, p: food.protein, c: food.carbs, f: food.fat })}
                  disabled={isSaving}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in zoom-in-90 slide-in-from-top-8 duration-300 ease-out">
          <div className="bg-[#09090b]/90 backdrop-blur-xl border border-emerald-500/50 shadow-[0_15px_40px_-10px_rgba(16,185,129,0.3)] px-5 py-3 rounded-2xl flex items-center gap-3 w-max max-w-[90vw]">
            <CheckCircle size={16} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">{toastMessage}</span>
          </div>
        </div>
      )}

    </div>
  );
}