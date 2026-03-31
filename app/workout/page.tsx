'use client'
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Dumbbell, Timer, Plus, Check, Pencil, Trash2, Activity, Flame, CheckCircle, Info, X, Play, Square, Loader2, Target } from 'lucide-react';

const EXERCISE_LIBRARY: Record<string, { name: string, target: string, isBodyweight: boolean }[]> = {
  'Upper Body': [
    { name: 'Push-up', target: 'หน้าอกและหลังแขน', isBodyweight: true },
    { name: 'Pull-up', target: 'หลังและหน้าแขน', isBodyweight: true },
    { name: 'Dumbbell Bench Press', target: 'หน้าอก', isBodyweight: false },
    { name: 'Dumbbell Shoulder Press', target: 'หัวไหล่', isBodyweight: false },
    { name: 'One-Arm Dumbbell Row', target: 'กล้ามเนื้อหลัง', isBodyweight: false },
    { name: 'Dumbbell Lateral Raise', target: 'หัวไหล่ด้านข้าง', isBodyweight: false },
    { name: 'Dumbbell Bicep Curl', target: 'หน้าแขน', isBodyweight: false },
    { name: 'Dumbbell Triceps Extension', target: 'หลังแขน', isBodyweight: false }
  ],
  'Lower Body': [
    { name: 'Squat', target: 'ขาด้านหน้าและก้น', isBodyweight: false },
    { name: 'Lunges', target: 'ขาและก้น', isBodyweight: false },
    { name: 'Dumbbell Romanian Deadlift', target: 'ต้นขาด้านหลังและก้น', isBodyweight: false },
    { name: 'Calf Raise', target: 'น่อง', isBodyweight: false }
  ],
  'Full Body & Core': [
    { name: 'Burpees', target: 'ทุกส่วนและคาร์ดิโอ', isBodyweight: true },
    { name: 'Mountain Climbers', target: 'แกนกลางลำตัวและคาร์ดิโอ', isBodyweight: true },
    { name: 'Dumbbell Thrusters', target: 'ขาและไหล่พร้อมกัน', isBodyweight: false },
    { name: 'Plank', target: 'หน้าท้องและแกนกลาง', isBodyweight: true }
  ],
  'Custom (กำหนดเอง)': []
};

type WorkoutSet = { id: number; weight: number; reps: number; done: boolean; };
type Exercise = { id: string | number; name: string; category: string; target: string; isBodyweight: boolean; sets: WorkoutSet[]; };
type ToastType = 'success' | 'info' | 'error';

export default function WorkoutPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  
  const [toast, setToast] = useState<{ show: boolean, message: string, type: ToastType }>({ show: false, message: '', type: 'success' });
  
  const [editModal, setEditModal] = useState<{ 
    show: boolean, exerciseId: string | number | null, 
    category: string, name: string, target: string, isBodyweight: boolean 
  }>({ show: false, exerciseId: null, category: 'Upper Body', name: '', target: '', isBodyweight: false });

  const [deleteModal, setDeleteModal] = useState<{ show: boolean, exerciseId: string | number | null }>({ show: false, exerciseId: null });

  const [timerModal, setTimerModal] = useState(false);
  const [timerInput, setTimerInput] = useState({ h: 0, m: 0, s: 0 });
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const showNotification = (message: string, type: ToastType = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const loadTodayWorkout = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUser(session.user);

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('workout_logs').select('*').eq('user_id', session.user.id).eq('date', today).order('created_at', { ascending: true });

      if (data && data.length > 0) {
        const loadedExercises: Exercise[] = data.map((d: any) => {
          const notesData = d.notes ? JSON.parse(d.notes) : {};
          const isArray = Array.isArray(notesData);
          const parsedSets = isArray ? notesData : (notesData.sets || []);
          const parsedIsBodyweight = isArray ? false : (notesData.isBodyweight || false);
          
          const parsedCategory = isArray ? 'Custom (กำหนดเอง)' : (notesData.category || 'Custom (กำหนดเอง)');
          const parsedTarget = isArray ? '' : (notesData.target || '');

          return {
            id: d.id, 
            name: d.exercise_name,
            category: parsedCategory,
            target: parsedTarget, 
            isBodyweight: parsedIsBodyweight,
            sets: parsedSets 
          };
        });
        setExercises(loadedExercises);
      }
      setIsLoading(false);
    };

    loadTodayWorkout();
  }, [router]);

  const finishWorkout = async () => {
    if (!user) return;
    setIsSaving(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      await supabase.from('workout_logs').delete().eq('user_id', user.id).eq('date', today);

      if (exercises.length > 0) {
        const payload = exercises.map(ex => {
          const completedSets = ex.sets.filter(s => s.done);
          return {
            user_id: user.id, date: today, exercise_name: ex.name,
            sets: completedSets.length,
            reps: completedSets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0), 
            weight_kg: ex.isBodyweight ? 0 : (completedSets.length > 0 ? Math.max(...completedSets.map(s => Number(s.weight) || 0)) : 0),
            notes: JSON.stringify({ isBodyweight: ex.isBodyweight, sets: ex.sets, category: ex.category, target: ex.target }) 
          };
        }).filter(p => p.sets > 0); 

        if (payload.length > 0) await supabase.from('workout_logs').insert(payload);
      }

      showNotification(`บันทึกสำเร็จ! วันนี้ยกไปทั้งหมด ${totalVolume.toLocaleString()} kg`, 'success');
    } catch (error) {
      showNotification('เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const savedTarget = localStorage.getItem('workout_timer_target');
    if (savedTarget) {
      const target = parseInt(savedTarget, 10);
      const now = Date.now();
      if (target > now) {
        setTargetTime(target); setTimeLeft(Math.ceil((target - now) / 1000)); setIsTimerRunning(true);
      } else {
        localStorage.removeItem('workout_timer_target');
        showNotification('หมดเวลาพักแล้ว! ลุยเซตต่อไปกันเลย🔥', 'info');
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    if (isTimerRunning && targetTime) {
      const checkTime = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
        setTimeLeft(remaining);
        
        if (remaining <= 0) { 
          setIsTimerRunning(false); 
          setTargetTime(null); 
          localStorage.removeItem('workout_timer_target');

          if ("vibrate" in navigator) {
            navigator.vibrate([300, 100, 300, 100, 300]); 
          }

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("หมดเวลาพักแล้ว! ⏱️", {
              body: "ลุกขึ้นมาลุยเซตต่อไปกันเลย 🔥",
              vibrate: [300, 100, 300],
            });
          }

          showNotification('หมดเวลาพักแล้ว! ลุยเซตต่อไปกันเลย🔥', 'info');
        }
      };
      checkTime(); 
      interval = setInterval(checkTime, 1000); 
    }
    
    return () => clearInterval(interval);
  }, [isTimerRunning, targetTime]);

  const startTimer = () => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission();
    const totalSeconds = (timerInput.h * 3600) + (timerInput.m * 60) + timerInput.s;
    if (totalSeconds > 0) {
      const newTarget = Date.now() + totalSeconds * 1000;
      setTargetTime(newTarget); setTimeLeft(totalSeconds); setIsTimerRunning(true);
      localStorage.setItem('workout_timer_target', newTarget.toString());
    }
    setTimerModal(false);
  };

  const stopTimer = () => {
    setIsTimerRunning(false); setTargetTime(null); setTimeLeft(0);
    localStorage.removeItem('workout_timer_target'); setTimerModal(false);
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600); const m = Math.floor((totalSeconds % 3600) / 60); const s = totalSeconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleSet = (exerciseId: string | number, setId: number) => {
    setExercises(exercises.map(ex => ex.id === exerciseId ? { ...ex, sets: ex.sets.map(set => set.id === setId ? { ...set, done: !set.done } : set) } : ex));
  };

  const updateSet = (exerciseId: string | number, setId: number, field: 'weight' | 'reps', value: string) => {
    setExercises(exercises.map(ex => ex.id === exerciseId ? { ...ex, sets: ex.sets.map(set => set.id === setId ? { ...set, [field]: value === '' ? 0 : parseFloat(value) } : set) } : ex));
  };

  const addSet = (exerciseId: string | number) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1] || { weight: 0, reps: 0 };
        const newSetId = ex.sets.length > 0 ? Math.max(...ex.sets.map(s => s.id)) + 1 : 1;
        return { ...ex, sets: [...ex.sets, { id: newSetId, weight: lastSet.weight, reps: lastSet.reps, done: false }] };
      }
      return ex;
    }));
  };

  const removeSet = (exerciseId: string | number, setId: number) => {
    setExercises(exercises.map(ex => ex.id === exerciseId ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) } : ex));
  };

  const addExercise = () => {
    const newId = `new-${Date.now()}`; 
    setExercises([...exercises, {
      id: newId, name: "New Exercise", category: "Custom (กำหนดเอง)", target: "", isBodyweight: false, sets: [{ id: 1, weight: 0, reps: 0, done: false }]
    }]);
  };

  const toggleBodyweight = (exerciseId: string | number) => {
    setExercises(exercises.map(ex => ex.id === exerciseId ? { ...ex, isBodyweight: !ex.isBodyweight } : ex));
  };

  const openDeleteModal = (exerciseId: string | number) => setDeleteModal({ show: true, exerciseId });

  const confirmDeleteExercise = () => {
    if (deleteModal.exerciseId) {
      setExercises(exercises.filter(ex => ex.id !== deleteModal.exerciseId));
      showNotification('ลบท่าออกกำลังกายแล้ว', 'error');
    }
    setDeleteModal({ show: false, exerciseId: null });
  };

  const openEditModal = (ex: Exercise) => {
    setEditModal({ 
      show: true, 
      exerciseId: ex.id, 
      category: ex.category || 'Custom (กำหนดเอง)', 
      name: ex.name, 
      target: ex.target || '', 
      isBodyweight: ex.isBodyweight 
    });
  };

  const handlePresetSelect = (presetName: string) => {
    if (!presetName) return;
    const libraryItems = EXERCISE_LIBRARY[editModal.category] || [];
    const selectedPreset = libraryItems.find(item => item.name === presetName);
    if (selectedPreset) {
      setEditModal({
        ...editModal,
        name: selectedPreset.name,
        target: selectedPreset.target,
        isBodyweight: selectedPreset.isBodyweight
      });
    }
  };

  const confirmEditExercise = () => {
    if (editModal.exerciseId && editModal.name.trim() !== '') {
      setExercises(exercises.map(ex => 
        ex.id === editModal.exerciseId ? { 
          ...ex, 
          name: editModal.name.trim(),
          category: editModal.category,
          target: editModal.target.trim(),
          isBodyweight: editModal.isBodyweight
        } : ex
      ));
    }
    setEditModal({ show: false, exerciseId: null, category: 'Upper Body', name: '', target: '', isBodyweight: false });
  };

  const totalVolume = useMemo(() => {
    return exercises.reduce((acc, ex) => {
      const exVolume = ex.sets.reduce((setAcc, set) => {
        if (!set.done) return setAcc;
        const weightToUse = ex.isBodyweight ? 0 : Number(set.weight || 0);
        return setAcc + (weightToUse * Number(set.reps || 0));
      }, 0);
      return acc + exVolume;
    }, 0);
  }, [exercises]);

  const getToastStyle = () => {
    switch (toast.type) {
      case 'success': return { border: 'border-emerald-500/50', bg: 'bg-emerald-500/20', glow: 'bg-emerald-500/30', icon: <CheckCircle size={20} className="text-emerald-500 relative z-10" /> };
      case 'info': return { border: 'border-blue-500/50', bg: 'bg-blue-500/20', glow: 'bg-blue-500/30', icon: <Info size={20} className="text-blue-500 relative z-10" /> };
      case 'error': return { border: 'border-red-500/50', bg: 'bg-red-500/20', glow: 'bg-red-500/30', icon: <Trash2 size={20} className="text-red-500 relative z-10" /> };
    }
  };
  const toastStyle = getToastStyle();

  if (isLoading) {
    return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin text-red-500" size={32} /></div>;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <section className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Workout</h2>
        </div>
        <button 
          onClick={finishWorkout}
          disabled={isSaving}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Finish'}
        </button>
      </section>

      {/* Stats Summary */}
      <section className="grid grid-cols-3 gap-3">
        <div className="bg-[#18181b] border border-[#27272a] p-3 rounded-2xl flex flex-col items-center justify-center gap-1">
          <Dumbbell size={18} className="text-red-500" />
          <span className="text-xl font-bold text-white">{totalVolume.toLocaleString()}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Volume (kg)</span>
        </div>
        
        {/* Timer Box */}
        <div 
          onClick={() => setTimerModal(true)}
          className={`bg-[#18181b] border ${isTimerRunning ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-[#27272a]'} p-3 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-zinc-900 transition-all`}
        >
          <Timer size={18} className={isTimerRunning ? "text-amber-500 animate-pulse" : "text-amber-500"} />
          <span className={`text-xl font-bold ${isTimerRunning ? 'text-amber-500' : 'text-white'}`}>
            {isTimerRunning ? formatTime(timeLeft) : '00:00'}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            {isTimerRunning ? 'Running' : 'Timer'}
          </span>
        </div>

        <div className="bg-[#18181b] border border-[#27272a] p-3 rounded-2xl flex flex-col items-center justify-center gap-1">
          <Activity size={18} className="text-emerald-500" />
          <span className="text-xl font-bold text-white">{exercises.length}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Exercises</span>
        </div>
      </section>

      {/* Exercises List */}
      <section className="flex flex-col gap-4">
        {exercises.length === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] border-dashed p-8 rounded-3xl flex flex-col items-center justify-center gap-2 text-center">
             <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-2">
              <Dumbbell size={20} className="text-zinc-600" />
            </div>
            <span className="text-sm font-bold text-white">ยังไม่มีท่าออกกำลังกาย</span>
            <span className="text-xs text-zinc-500">กดปุ่ม Add Exercise เพื่อเริ่มฟอร์มเลย</span>
          </div>
        ) : (
          exercises.map((ex, index) => (
            <div key={ex.id} className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden flex flex-col">
              
              {/* Exercise Header */}
              <div className="bg-[#09090b] px-4 py-3 flex justify-between items-center border-b border-[#27272a]">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 font-bold text-sm">{index + 1}</span>
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-white font-bold text-sm leading-tight">{ex.name}</span>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {ex.category && ex.category !== 'Custom (กำหนดเอง)' && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                          {ex.category}
                        </span>
                      )}
                      {ex.target && (
                        <span className="text-[9px] font-medium text-zinc-400">
                          {ex.category !== 'Custom (กำหนดเอง)' ? '•' : ''} โดน: {ex.target}
                        </span>
                      )}
                    </div>

                    <button 
                      onClick={() => toggleBodyweight(ex.id)}
                      className={`mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors border ${
                        ex.isBodyweight 
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30' 
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      {ex.isBodyweight ? 'Bodyweight' : '+ Add Weight'}
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-2 text-zinc-500 self-start mt-1">
                  <button onClick={() => openEditModal(ex)} className="p-1.5 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => openDeleteModal(ex.id)} className="p-1.5 hover:text-red-500 hover:bg-red-950/50 rounded-lg transition-colors" title="Remove">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Sets Table */}
              <div className="p-2 flex flex-col gap-1">
                <div className="grid grid-cols-[24px_1fr_1fr_36px_28px] gap-2 px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-zinc-500 text-center items-center">
                  <span>Set</span>
                  <span>{ex.isBodyweight ? '-' : 'kg'}</span>
                  <span>Reps</span>
                  <span className="col-span-2">Action</span>
                </div>
                
                {ex.sets.map((set, i) => (
                  <div key={set.id} className={`grid grid-cols-[24px_1fr_1fr_36px_28px] items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${set.done ? 'bg-zinc-900/50' : ''}`}>
                    <div className="text-center text-xs font-bold text-zinc-400">{i + 1}</div>
                    
                    <div className="relative flex justify-center">
                      <input 
                        type={ex.isBodyweight ? "text" : "number"} 
                        value={ex.isBodyweight ? 'BW' : (set.weight || '')}
                        onChange={(e) => updateSet(ex.id, set.id, 'weight', e.target.value)}
                        disabled={set.done || ex.isBodyweight}
                        placeholder="0"
                        className={`w-full max-w-[70px] bg-[#09090b] border border-zinc-800 rounded-md py-1.5 text-center text-sm focus:outline-none disabled:opacity-50 ${ex.isBodyweight ? 'text-blue-400 font-bold border-transparent bg-transparent' : 'text-white focus:border-red-500'}`}
                      />
                    </div>
                    
                    <div className="relative flex justify-center">
                      <input 
                        type="number" 
                        value={set.reps || ''}
                        onChange={(e) => updateSet(ex.id, set.id, 'reps', e.target.value)}
                        disabled={set.done}
                        placeholder="0"
                        className="w-full max-w-[70px] bg-[#09090b] border border-zinc-800 rounded-md py-1.5 text-center text-sm text-white focus:border-red-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    
                    <div className="flex justify-center">
                      <button 
                        onClick={() => toggleSet(ex.id, set.id)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          set.done 
                          ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]' 
                          : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                        }`}
                      >
                        <Check size={16} strokeWidth={set.done ? 3 : 2} />
                      </button>
                    </div>

                    <div className="flex justify-center">
                      <button 
                        onClick={() => removeSet(ex.id, set.id)}
                        className="text-zinc-600 hover:text-red-500 hover:bg-red-950/50 p-1.5 rounded-lg transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button onClick={() => addSet(ex.id)} className="mt-2 text-xs font-semibold text-zinc-400 hover:text-white py-2 flex items-center justify-center gap-1 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg transition-all">
                  <Plus size={14} /> Add Set
                </button>
              </div>
            </div>
          ))
        )}

        <button onClick={addExercise} className="bg-[#09090b] border border-[#27272a] hover:border-red-500/50 text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm">
          <Plus size={18} />
          Add Exercise
        </button>
      </section>

      {/* Custom Timer Modal */}
      {timerModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Timer className="text-amber-500" size={24} />
                ตั้งเวลาพัก
              </h3>
              <button onClick={() => setTimerModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex justify-center items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <input type="number" value={timerInput.h || ''} placeholder="00" min="0" max="23" onChange={(e) => setTimerInput({...timerInput, h: Number(e.target.value)})} className="w-16 h-16 bg-[#09090b] border border-zinc-800 rounded-2xl text-center text-2xl font-bold text-white focus:border-amber-500 focus:outline-none" />
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">ชั่วโมง</span>
              </div>
              <span className="text-2xl font-bold text-zinc-600 mb-4">:</span>
              <div className="flex flex-col items-center gap-1">
                <input type="number" value={timerInput.m || ''} placeholder="00" min="0" max="59" onChange={(e) => setTimerInput({...timerInput, m: Number(e.target.value)})} className="w-16 h-16 bg-[#09090b] border border-zinc-800 rounded-2xl text-center text-2xl font-bold text-white focus:border-amber-500 focus:outline-none" />
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">นาที</span>
              </div>
              <span className="text-2xl font-bold text-zinc-600 mb-4">:</span>
              <div className="flex flex-col items-center gap-1">
                <input type="number" value={timerInput.s || ''} placeholder="00" min="0" max="59" onChange={(e) => setTimerInput({...timerInput, s: Number(e.target.value)})} className="w-16 h-16 bg-[#09090b] border border-zinc-800 rounded-2xl text-center text-2xl font-bold text-white focus:border-amber-500 focus:outline-none" />
                <span className="text-[10px] text-zinc-500 font-semibold uppercase">วินาที</span>
              </div>
            </div>
            
            <div className="flex gap-3 justify-center mt-2">
              {isTimerRunning && (
                <button onClick={stopTimer} className="flex-1 py-3 rounded-xl text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors flex justify-center items-center gap-2">
                  <Square size={16} /> หยุด
                </button>
              )}
              <button onClick={startTimer} className="flex-1 py-3 rounded-xl text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-colors flex justify-center items-center gap-2">
                <Play size={16} /> {isTimerRunning ? 'เริ่มใหม่' : 'เริ่มจับเวลา'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="text-red-500" size={20} /> แก้ไขท่าออกกำลังกาย
              </h3>
              <button onClick={() => setEditModal({ show: false, exerciseId: null, category: 'Upper Body', name: '', target: '', isBodyweight: false })} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 p-1.5 rounded-full">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              
              {/* เลือกหมวดหมู่ */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">หมวดหมู่ส่วนของร่างกาย</label>
                <select 
                  value={editModal.category}
                  onChange={(e) => setEditModal({...editModal, category: e.target.value})}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm font-bold text-white focus:border-red-500 focus:outline-none appearance-none"
                >
                  {Object.keys(EXERCISE_LIBRARY).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {editModal.category !== 'Custom (กำหนดเอง)' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">เลือกท่ามาตรฐาน</label>
                  <select 
                    onChange={(e) => handlePresetSelect(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none appearance-none"
                  >
                    <option value="">-- เลือกท่าออกกำลังกาย --</option>
                    {EXERCISE_LIBRARY[editModal.category].map(ex => (
                      <option key={ex.name} value={ex.name}>{ex.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="h-px bg-zinc-800/50 w-full my-1"></div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">ชื่อท่า (ปรับแก้ได้)</label>
                <input
                  type="text"
                  value={editModal.name}
                  onChange={(e) => setEditModal({...editModal, name: e.target.value})}
                  placeholder="พิมพ์ชื่อท่าออกกำลังกาย..."
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">ส่วนที่ได้ (อธิบายเพิ่มเติม)</label>
                <input
                  type="text"
                  value={editModal.target}
                  onChange={(e) => setEditModal({...editModal, target: e.target.value})}
                  placeholder="เช่น กล้ามเนื้อหน้าอก, แกนกลางลำตัว..."
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>

            </div>
            
            <button onClick={confirmEditExercise} className="mt-2 w-full px-4 py-4 rounded-xl text-xs uppercase tracking-widest font-black bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-colors flex justify-center">
              บันทึกข้อมูลท่า
            </button>
          </div>
        </div>
      )}

      {/* Custom Delete Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 text-center items-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-2 relative">
              <div className="absolute inset-0 bg-red-500/30 rounded-full blur-md"></div>
              <Trash2 className="text-red-500 relative z-10" size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">ต้องการลบท่านี้ใช่ไหม?</h3>
            <p className="text-sm text-zinc-400 mb-2">ท่าออกกำลังกายและเซตทั้งหมดในนี้จะหายไป</p>
            
            <div className="flex gap-3 justify-center w-full mt-2">
              <button onClick={() => setDeleteModal({ show: false, exerciseId: null })} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors">
                ยกเลิก
              </button>
              <button onClick={confirmDeleteExercise} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)] transition-colors">
                ลบทิ้ง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Alert */}
      {toast.show && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in zoom-in-90 slide-in-from-top-8 duration-300 ease-out">
          <div className={`bg-[#09090b]/90 backdrop-blur-xl border shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] px-5 py-3.5 rounded-2xl flex items-center gap-4 w-max max-w-[90vw] ${toastStyle.border}`}>
            <div className={`p-2 rounded-full relative ${toastStyle.bg}`}>
              <div className={`absolute inset-0 rounded-full blur-md ${toastStyle.glow}`}></div>
              {toastStyle.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-wide">{toast.message}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}