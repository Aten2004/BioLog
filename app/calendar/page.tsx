'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, ChevronRight, Dumbbell, Target, Utensils, 
  Moon, TrendingUp, Code, LineChart, Mic, Coffee, 
  Loader2, Brain, Activity, BookOpen, Image as ImageIcon,
  Gamepad2, Video, Book, Briefcase, Music, X
} from 'lucide-react';

const DAYS_IN_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate()); 
  const [monthData, setMonthData] = useState<Record<number, any>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false); 
  
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState({ avgCal: 0, avgSleep: 0, totalVolume: 0 });

  const [customTags, setCustomTags] = useState<any[]>([]);

  const ICON_MAP: Record<string, any> = {
    target: <Target size={12} />, code: <Code size={12} />, chart: <LineChart size={12} />, 
    mic: <Mic size={12} />, game: <Gamepad2 size={12} />, video: <Video size={12} />, 
    book: <Book size={12} />, music: <Music size={12} />, work: <Briefcase size={12} />,
    coffee: <Coffee size={12} />
  };

  const getTagInfo = (tagId: string) => {
    const foundTag = customTags.find(t => t.id === tagId);
    if (foundTag) {
      return { 
        label: foundTag.label, 
        icon: ICON_MAP[foundTag.iconName] || <Target size={12} />, 
        color: foundTag.colorClass 
      };
    }
    
    switch(tagId) {
      case 'coding': return { label: 'Code & Build', icon: <Code size={12} />, color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' };
      case 'trading': return { label: 'Gold Trading', icon: <LineChart size={12} />, color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' };
      case 'dubbing': return { label: 'Voice Dubbing', icon: <Mic size={12} />, color: 'text-purple-400 bg-purple-500/20 border-purple-500/30' };
      case 'rest': return { label: 'Rest Day', icon: <Coffee size={12} />, color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' };
      default: return { label: 'Activity', icon: <Target size={12} />, color: 'text-zinc-400 bg-zinc-500/20 border-zinc-500/30' };
    }
  };

  useEffect(() => {
    const savedTags = localStorage.getItem('biolog_custom_tags');
    if (savedTags) {
      setCustomTags(JSON.parse(savedTags));
    }
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

  useEffect(() => {
    const fetchMonthData = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;

      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      if (profile) setUserProfile(profile);

      let targetCal = 2000;
      if (profile && profile.weight_start && profile.height && profile.age) {
        const w = parseFloat(profile.weight_start);
        const h = parseFloat(profile.height);
        const a = parseInt(profile.age);
        const gender = profile.gender || 'male';
        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr = gender === 'male' ? bmr + 5 : bmr - 161;
        const tdee = Math.round(bmr * 1.55);
        targetCal = tdee;
        if (profile.goal_type === 'lose_weight') targetCal -= 500;
        if (profile.goal_type === 'build_muscle') targetCal += 300;
      }

      const [bodyRes, foodRes, workoutRes, photosRes] = await Promise.all([
        supabase.from('body_logs').select('*').eq('user_id', userId).order('date', { ascending: true }),
        supabase.from('food_logs').select('date, name, calories, protein, carbs, fat').eq('user_id', userId).gte('date', startDate).lte('date', endDate),
        supabase.from('workout_logs').select('date, exercise_name, sets, reps, weight_kg, notes').eq('user_id', userId).gte('date', startDate).lte('date', endDate),
        supabase.from('body_photos').select('*').eq('user_id', userId).gte('date', startDate).lte('date', endDate)
      ]);

      const newMonthData: Record<number, any> = {};

      if (bodyRes.data) {
        setWeightHistory(bodyRes.data); 
        const currentMonthLogs = bodyRes.data.filter(log => log.date >= startDate && log.date <= endDate);
        currentMonthLogs.forEach(log => {
          const day = parseInt(log.date.split('-')[2], 10);
          if (!newMonthData[day]) newMonthData[day] = { calories: 0, workout: false, volume: 0, photos: [], foods: [], workouts: [] };
          newMonthData[day].weight = log.weight;
          newMonthData[day].sleep = log.sleep_hours;
          newMonthData[day].tags = log.tags;
          newMonthData[day].notes = log.notes;
        });
      }

      photosRes.data?.forEach(photo => {
        const day = parseInt(photo.date.split('-')[2], 10);
        if (!newMonthData[day]) newMonthData[day] = { calories: 0, workout: false, volume: 0, photos: [], foods: [], workouts: [] };
        if (!newMonthData[day].photos) newMonthData[day].photos = [];
        newMonthData[day].photos.push(photo);
      });

      foodRes.data?.forEach(log => {
        const day = parseInt(log.date.split('-')[2], 10);
        if (!newMonthData[day]) newMonthData[day] = { calories: 0, workout: false, volume: 0, photos: [], foods: [], workouts: [] };
        if (!newMonthData[day].foods) newMonthData[day].foods = [];
        newMonthData[day].foods.push(log);
        newMonthData[day].calories += log.calories;
      });

      workoutRes.data?.forEach(log => {
        const day = parseInt(log.date.split('-')[2], 10);
        if (!newMonthData[day]) newMonthData[day] = { calories: 0, workout: false, volume: 0, photos: [], foods: [], workouts: [] };
        if (!newMonthData[day].workouts) newMonthData[day].workouts = [];
        newMonthData[day].workout = true;
        newMonthData[day].workouts.push(log);
        try {
          if (log.notes) {
            const parsed = JSON.parse(log.notes);
            const isArray = Array.isArray(parsed);
            const sets = isArray ? parsed : (parsed.sets || []);
            const isBodyweight = isArray ? false : (parsed.isBodyweight || false);
            
            const volume = sets.reduce((sum: number, set: any) => {
              if (!set.done) return sum;
              const weightToUse = isBodyweight ? 0 : (set.weight || 0);
              return sum + (weightToUse * set.reps);
            }, 0);
            
            newMonthData[day].volume += volume;
          }
        } catch(e) {}
      });

      Object.keys(newMonthData).forEach(day => {
        let score = 0;
        const d = newMonthData[Number(day)];
        
        if (d.weight) score += 10;
        if (d.sleep) {
          if (d.sleep >= 7 && d.sleep <= 9) score += 20;
          else if (d.sleep >= 6) score += 10;
          else score += 5;
        }
        if (d.calories > 0) {
          const calPercent = (d.calories / targetCal) * 100;
          if (calPercent >= 90 && calPercent <= 110) score += 40; 
          else if (calPercent >= 75 && calPercent <= 125) score += 25; 
          else if (calPercent >= 50) score += 10; 
        }
        if (d.workout) {
          score += 30;
        }
        
        newMonthData[Number(day)].score = score;
      });

      setMonthData(newMonthData);

      let sumCal = 0, sumSleep = 0, totVol = 0, countDays = 0;
      for(let i = 0; i < 7; i++) {
        const d = selectedDay - i;
        if (newMonthData[d]) {
          sumCal += newMonthData[d].calories || 0;
          sumSleep += newMonthData[d].sleep || 0;
          totVol += newMonthData[d].volume || 0;
          countDays++;
        }
      }
      setWeeklyStats({ 
        avgCal: countDays ? Math.round(sumCal / countDays) : 0, 
        avgSleep: countDays ? Math.round((sumSleep / countDays) * 10) / 10 : 0, 
        totalVolume: totVol 
      });

      setIsLoading(false);
    };

    fetchMonthData();
  }, [year, month, daysInMonth, selectedDay]);

  const prevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(1); };
  const nextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(1); };

  const getHeatmapColor = (score?: number) => {
    if (score === undefined || score === 0) return 'bg-[#18181b] border-[#27272a] text-zinc-600'; 
    if (score >= 90) return 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'; 
    if (score >= 70) return 'bg-red-700/80 border-red-600/50 text-white'; 
    if (score >= 40) return 'bg-red-900/60 border-red-800/50 text-zinc-300'; 
    return 'bg-red-950/40 border-red-950/50 text-zinc-400'; 
  };

  const selectedData = monthData[selectedDay];

  const getFullTrend = () => {
    if (weightHistory.length === 0) return [];
    
    const trend = [];
    const pad = (n: number) => String(n).padStart(2, '0');
    
    const firstDateStr = weightHistory[0].date;
    let current = new Date(firstDateStr);
    const target = new Date(year, month, selectedDay);
    
    let lastKnownWeight = weightHistory[0].weight || userProfile?.weight_start || 60;
    const weightMap = new Map(weightHistory.map(w => [w.date, w.weight]));

    while (current <= target) {
      const dateStr = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
      if (weightMap.has(dateStr) && weightMap.get(dateStr)) {
        lastKnownWeight = weightMap.get(dateStr);
      }
      trend.push({ date: dateStr, weight: lastKnownWeight });
      current.setDate(current.getDate() + 1);
    }
    return trend;
  };

  const fullTrend = getFullTrend();
  const actualWeights = fullTrend.map(t => t.weight).filter(w => w > 0);
  const minWeight = actualWeights.length > 0 ? Math.min(...actualWeights) - 0.2 : 0;
  const maxWeight = actualWeights.length > 0 ? Math.max(...actualWeights) + 0.2 : 100;
  const weightDiff = maxWeight - minWeight;

  const getScienceAnalysis = () => {
    if (!userProfile) return null;
    
    const w = parseFloat(userProfile.weight_start) || 60;
    const h = parseFloat(userProfile.height) || 170;
    const a = parseInt(userProfile.age) || 25;
    const gender = userProfile.gender || 'male';

    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    bmr = gender === 'male' ? bmr + 5 : bmr - 161;
    const tdee = Math.round(bmr * 1.55);

    let targetCal = tdee;
    const goal = userProfile.goal_type;
    if (goal === 'lose_weight') targetCal -= 500;
    if (goal === 'build_muscle') targetCal += 300;

    let analysisText = "";
    let statusColor = "text-blue-400";
    const avgCal = weeklyStats.avgCal;

    if (avgCal === 0) {
      analysisText = "ยังไม่มีข้อมูลโภชนาการย้อนหลังเพียงพอ รบกวนจดบันทึกอาหารเพื่อการวิเคราะห์ที่แม่นยำครับ";
      statusColor = "text-zinc-400";
    } else {
      if (goal === 'build_muscle') {
        if (avgCal < bmr) {
          analysisText = "Starvation Risk: ระวัง! พลังงานน้อยกว่า BMR ร่างกายจะสลายกล้ามเนื้อมาใช้เป็นพลังงาน แนะนำให้กินเพิ่มด่วน";
          statusColor = "text-red-500";
        } else if (avgCal < tdee) {
          analysisText = "Caloric Deficit: พลังงานติดลบ ร่างกายไม่สามารถสร้างกล้ามเนื้อเพิ่มได้";
          statusColor = "text-amber-500";
        } else if (avgCal >= tdee && avgCal < targetCal - 150) {
          analysisText = "Maintenance / Recomp: พลังงานเท่ากับที่ใช้ไป กล้ามเนื้อจะพัฒนาได้ช้ามาก แนะนำให้เพิ่มอาหารอีกนิดครับ";
          statusColor = "text-blue-400";
        } else if (avgCal >= targetCal - 150 && avgCal <= targetCal + 150) {
          analysisText = "Optimal Lean Bulk: ยอดเยี่ยม! พลังงานอยู่ในจุดที่เหมาะกับการสร้างกล้ามเนื้อโดยที่ไขมันสะสมน้อยที่สุด";
          statusColor = "text-emerald-500";
        } else {
          analysisText = "Dirty Bulk Alert: พลังงานเกินเป้าหมายไปมาก กล้ามเนื้อจะเพิ่มขึ้นแต่จะมาพร้อมกับไขมันสะสมที่ค่อนข้างเยอะ";
          statusColor = "text-orange-500";
        }
      } 
      else if (goal === 'lose_weight') {
        if (avgCal < 1200) {
          analysisText = "Metabolic Damage Risk: อันตราย! กินน้อยกว่า 1,200 kcal เสี่ยงทำให้ระบบเผาผลาญพังและสูญเสียมวลกล้ามเนื้อ";
          statusColor = "text-red-500";
        } else if (avgCal >= 1200 && avgCal < targetCal - 150) {
          analysisText = "Aggressive Cut: ลดน้ำหนักได้ไวมาก แต่ระวังความเครียดสะสม ควรทานโปรตีนให้ถึงเพื่อรักษากล้ามเนื้อไว้";
          statusColor = "text-amber-500";
        } else if (avgCal >= targetCal - 150 && avgCal <= targetCal + 150) {
          analysisText = "Effective Fat Loss: สมบูรณ์แบบ! พลังงานติดลบกำลังดี (Deficit) ช่วยลดไขมันได้อย่างยั่งยืนและสุขภาพดี";
          statusColor = "text-emerald-500";
        } else if (avgCal > targetCal + 150 && avgCal < tdee) {
          analysisText = "Slow Cut: พลังงานติดลบน้อยมาก น้ำหนักจะลดลงอย่างช้าๆ แต่มีข้อดีคือรักษากล้ามเนื้อได้ดีเยี่ยม";
          statusColor = "text-blue-400";
        } else {
          analysisText = "Caloric Surplus: พลังงานเกินกว่าที่ร่างกายใช้ (ไม่ติดลบ) น้ำหนักและไขมันจะไม่ลด แนะนำให้ปรับอาหารลงครับ";
          statusColor = "text-red-500";
        }
      }
      else {
        if (avgCal < tdee - 250) {
          analysisText = "Unintended Weight Loss: พลังงานน้อยเกินไปสำหรับการรักษาน้ำหนัก คุณอาจสูญเสียน้ำหนักและกล้ามเนื้อได้";
          statusColor = "text-amber-500";
        } else if (avgCal >= tdee - 250 && avgCal <= tdee + 250) {
          analysisText = "Perfect Maintenance: สมดุลพลังงานยอดเยี่ยม! น้ำหนัก รูปร่าง และกล้ามเนื้อของคุณจะคงที่อย่างสวยงาม";
          statusColor = "text-emerald-500";
        } else {
          analysisText = "Unintended Weight Gain: พลังงานเริ่มเกินกว่าที่ร่างกายเผาผลาญ ระวังน้ำหนักและไขมันส่วนเกินที่อาจเพิ่มขึ้น";
          statusColor = "text-orange-500";
        }
      }
    }

    return { tdee, targetCal, analysisText, statusColor };
  };

  const analysis = getScienceAnalysis();

  const getWorkoutDistribution = () => {
    if (!selectedData?.workouts?.length) return null;
    
    let dist: Record<string, number> = { 'Upper Body': 0, 'Lower Body': 0, 'Full Body & Core': 0, 'Other': 0 };
    let totalSets = 0;

    selectedData.workouts.forEach((w: any) => {
       const notes = w.notes ? JSON.parse(w.notes) : null;
       const isArray = Array.isArray(notes);
       const sets = isArray ? notes : (notes?.sets || []);
       const completedSets = sets.filter((s: any) => s.done).length;
       
       const cat = isArray ? 'Other' : (notes?.category || 'Other');
       
       if (cat === 'Upper Body') dist['Upper Body'] += completedSets;
       else if (cat === 'Lower Body') dist['Lower Body'] += completedSets;
       else if (cat === 'Full Body & Core') dist['Full Body & Core'] += completedSets;
       else dist['Other'] += completedSets;

       totalSets += completedSets;
    });

    if (totalSets === 0) return null;
    return { dist, totalSets };
  };

  const workoutDist = getWorkoutDistribution();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-24">
      
      {/* Header */}
      <section className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">History</h2>
        </div>
      </section>

      {/* Calendar Heatmap Section */}
      <section className="bg-[#18181b] border border-[#27272a] p-5 rounded-3xl flex flex-col gap-5 relative">
        
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-[#18181b]/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-red-500" />
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-lg font-bold text-white tracking-wide">
            {monthName} <span className="text-red-500">{year}</span>
          </h3>
          <button onClick={nextMonth} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-7 gap-2 mb-1">
            {DAYS_IN_WEEK.map(day => (
              <span key={day} className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square rounded-xl" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const data = monthData[day];
              const isSelected = selectedDay === day;
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`
                    relative aspect-square rounded-xl flex items-center justify-center text-sm font-semibold border transition-all duration-200
                    ${getHeatmapColor(data?.score)}
                    ${isSelected ? 'ring-2 ring-white scale-110 z-10 shadow-lg' : 'hover:scale-105'}
                  `}
                >
                  {day}
                  {data?.notes && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)]"></div>
                  )}
                  {data?.photos && data.photos.length > 0 && (
                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_5px_rgba(96,165,250,0.8)]"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Weight Graph */}
      {fullTrend.length > 0 && (
        <section className="bg-[#18181b] border border-[#27272a] p-5 rounded-3xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-400" />
              <span className="text-sm font-bold text-white">Weight Journey</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">
                {selectedData?.weight || fullTrend[fullTrend.length - 1]?.weight || '-'}
              </span>
              <span className="text-xs font-medium text-zinc-500">kg</span>
            </div>
          </div>
          
          <div className="overflow-x-auto pb-2 custom-scrollbar">
            <div style={{ width: Math.max(300, fullTrend.length * 45), height: 120 }} className="relative mt-4 px-2">
              <svg width="100%" height="100%" className="overflow-visible">
                <polyline
                  points={fullTrend.map((item, i) => {
                    const x = i * 45 + 20;
                    const y = 80 - ((item.weight - minWeight) / (weightDiff > 0 ? weightDiff : 1)) * 60;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-70"
                />
                
                {fullTrend.map((item, i) => {
                  const x = i * 45 + 20;
                  const y = 80 - ((item.weight - minWeight) / (weightDiff > 0 ? weightDiff : 1)) * 60;
                  const isSelectedDay = item.date === `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                  
                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelectedDay ? 6 : 4}
                        fill={isSelectedDay ? "#ffffff" : "#18181b"}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        className="transition-all duration-300"
                      />
                      
                      <text
                        x={x}
                        y={y - 12}
                        fontSize="10"
                        fill={isSelectedDay ? "#ffffff" : "#a1a1aa"}
                        textAnchor="middle"
                        className={isSelectedDay ? "font-bold" : ""}
                      >
                        {item.weight}
                      </text>
                      
                      <text 
                        x={x} 
                        y={y + 18} 
                        fontSize="9" 
                        fill={isSelectedDay ? "#3b82f6" : "#71717a"} 
                        textAnchor="middle" 
                        className={isSelectedDay ? "font-bold" : ""}
                      >
                        {parseInt(item.date.split('-')[2])}/{parseInt(item.date.split('-')[1])}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
          
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center">
            Showing {fullTrend.length} days of progress
          </p>
        </section>
      )}

      {/* Daily Summary Panel */}
      <section className="flex flex-col gap-4">
        
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target size={18} className="text-red-500" />
            Summary: {monthName} {selectedDay}, {year}
          </h3>
          {selectedData && (selectedData.foods?.length > 0 || selectedData.workouts?.length > 0) && (
            <button 
              onClick={() => setShowDetailModal(true)} 
              className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors shadow-sm"
            >
              View Details
            </button>
          )}
        </div>

        {selectedData && (selectedData.weight || selectedData.sleep || selectedData.calories || selectedData.workout || (selectedData.tags && selectedData.tags.length > 0) || selectedData.notes || (selectedData.photos && selectedData.photos.length > 0)) ? (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {selectedData.tags && selectedData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1">
                {selectedData.tags.map((tag: string) => {
                  const tagInfo = getTagInfo(tag);
                  return (
                    <div key={tag} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${tagInfo.color}`}>
                      {tagInfo.icon}
                      {tagInfo.label}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 bg-gradient-to-br from-red-950/40 to-[#18181b] border border-red-900/30 p-5 rounded-3xl flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
                <div className="flex flex-col gap-1 relative z-10">
                  <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Daily Score</span>
                  <span className="text-zinc-400 text-xs">Based on biology goals</span>
                </div>
                <div className="flex items-baseline gap-1 relative z-10">
                  <span className="text-4xl font-black text-white">{selectedData.score}</span>
                  <span className="text-sm font-bold text-zinc-500">/100</span>
                </div>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-3xl flex flex-col gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center mb-1">
                  <Utensils size={14} className="text-orange-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{selectedData.calories || 0}</span>
                  <span className="text-xs font-bold text-zinc-500">/ {analysis?.targetCal || 0}</span>
                </div>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Kcal Eaten</span>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-3xl flex flex-col gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${selectedData.workout ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
                  {selectedData.workout ? <Dumbbell size={14} className="text-emerald-500" /> : <Coffee size={14} className="text-blue-500" />}
                </div>
                <span className="text-2xl font-bold text-white">
                  {selectedData.workout ? 'Done' : 'Rest'}
                </span>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {selectedData.workout ? `Volume: ${selectedData.volume?.toLocaleString() || 0} kg` : 'Recovery Day'}
                </span>
              </div>
            </div>

            {workoutDist && (
              <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-3xl flex flex-col gap-4 animate-in zoom-in-95 duration-300">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity size={14} className="text-emerald-500" /> Workout Focus (Total Sets)
                </span>
                <div className="flex flex-col gap-3.5">
                  {Object.entries(workoutDist.dist).filter(([_, val]) => val > 0).map(([cat, val]) => (
                    <div key={cat} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-baseline px-1">
                        <span className="text-xs font-bold text-white">{cat}</span>
                        <span className="text-[10px] font-bold text-zinc-500">{val} Sets <span className="text-zinc-600 font-medium">({Math.round((val/workoutDist.totalSets)*100)}%)</span></span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            cat === 'Upper Body' ? 'bg-blue-500' : 
                            cat === 'Lower Body' ? 'bg-orange-500' : 
                            cat === 'Full Body & Core' ? 'bg-emerald-500' : 'bg-zinc-500'
                          }`} 
                          style={{ width: `${(val/workoutDist.totalSets)*100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-[#18181b] border border-[#27272a] p-5 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <Moon size={20} className="text-indigo-400" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sleep Duration</span>
                    <span className="text-[10px] text-zinc-600">Recovery & Rest</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-black ${(selectedData.sleep || 0) >= 7 ? 'text-white' : 'text-red-400'}`}>
                    {selectedData.sleep || 0}
                  </span>
                  <span className="text-sm font-medium text-zinc-500">hrs</span>
                </div>
              </div>
            </div>
            
            {selectedData.notes && (
              <div className="bg-[#09090b] p-4 rounded-xl border border-zinc-800 text-sm text-zinc-300 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5">
                  <BookOpen size={12} /> Journal Notes
                </span>
                <p className="leading-relaxed break-words whitespace-pre-wrap">{selectedData.notes}</p>
              </div>
            )}

            {selectedData.photos && selectedData.photos.length > 0 && (
              <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-3xl flex flex-col gap-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <ImageIcon size={12} className="text-zinc-400" /> Progress Photos ({selectedData.photos.length})
                </span>
                
                <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar">
                  {selectedData.photos.map((photo: any, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedImage(photo.photo_url)}
                      className="min-w-[140px] sm:min-w-[160px] aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-zinc-800 flex-shrink-0 relative group cursor-pointer active:scale-95 transition-transform"
                    >
                      <img src={photo.photo_url} alt={photo.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-8">
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest truncate block">
                          {photo.label || 'Progress Photo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="bg-[#18181b] border border-[#27272a] border-dashed p-8 rounded-3xl flex flex-col items-center justify-center gap-2 text-center mt-2">
            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-2">
              <Activity size={20} className="text-zinc-600" />
            </div>
            <span className="text-sm font-bold text-white">ยังไม่มีข้อมูลในวันนี้</span>
            <span className="text-xs text-zinc-500">คุณสามารถย้อนกลับไปบันทึกข้อมูลของวันนี้ได้ในหน้า Overview</span>
          </div>
        )}
      </section>

      {/* Analysis Panel */}
      <section className="bg-gradient-to-br from-blue-900/20 to-[#18181b] border border-blue-500/30 p-5 rounded-3xl flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex items-center gap-2 relative z-10">
          <Brain size={20} className="text-blue-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">BioLog Data Analysis</h3>
        </div>
        
        <div className="flex flex-col gap-2 relative z-10">
          <p className="text-sm font-medium text-zinc-300 leading-relaxed">
            {analysis?.analysisText || "กำลังคำนวณข้อมูลร่างกาย..."}
          </p>
          <div className="flex items-center gap-4 mt-2 border-t border-zinc-800 pt-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Target Calories</span>
              <span className="text-lg font-black text-blue-400">{analysis?.targetCal || 0} <span className="text-[10px] text-zinc-500">kcal/day</span></span>
            </div>
            <div className="h-8 w-px bg-zinc-800"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Avg. Weekly Intake</span>
              <span className={`text-lg font-black ${analysis?.statusColor}`}>{weeklyStats.avgCal} <span className="text-[10px] text-zinc-500">kcal</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Workout & Food */}
      {showDetailModal && selectedData && (
        <div 
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="bg-[#18181b] border border-[#27272a] rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header ของ Modal */}
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-[#09090b] shadow-sm">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                Log Details: {selectedDay} {monthName}
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="p-2 bg-zinc-800 hover:bg-red-500/20 hover:text-red-500 rounded-full text-zinc-400 transition-colors">
                <X size={16}/>
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6">
              
              {selectedData.foods && selectedData.foods.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                    <Utensils size={14}/> Food Log
                  </h4>
                  <div className="flex flex-col gap-2">
                    {selectedData.foods.map((f: any, i: number) => (
                      <div key={i} className="bg-[#09090b] p-3.5 rounded-xl border border-zinc-800 flex justify-between items-center">
                        <span className="text-sm font-bold text-white">{f.name}</span>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-orange-400">{f.calories} kcal</span>
                          <span className="text-[10px] text-zinc-500 font-bold tracking-wider mt-0.5">
                            P: {Number(f.protein).toFixed(0)} • C: {Number(f.carbs).toFixed(0)} • F: {Number(f.fat).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedData.workouts && selectedData.workouts.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                    <Dumbbell size={14}/> Workout Log
                  </h4>
                  <div className="flex flex-col gap-3">
                    {selectedData.workouts.map((w: any, i: number) => {
                      const notes = w.notes ? JSON.parse(w.notes) : null;
                      const isArray = Array.isArray(notes);
                      const sets = isArray ? notes : (notes?.sets || []);
                      const isBW = isArray ? false : (notes?.isBodyweight || false);
                      const category = isArray ? '' : (notes?.category || '');
                      const target = isArray ? '' : (notes?.target || '');
                      
                      const completedSets = sets.filter((s: any) => s.done);

                      return (
                        <div key={i} className="bg-[#09090b] p-4 rounded-xl border border-zinc-800 flex flex-col gap-3">
                          <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-bold text-white">{w.exercise_name}</span>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                {category && category !== 'Custom (กำหนดเอง)' && category !== 'Other' && (
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">
                                    {category}
                                  </span>
                                )}
                                {target && (
                                  <span className="text-[9px] font-medium text-zinc-400">
                                    {category !== 'Custom (กำหนดเอง)' && category !== 'Other' ? '• ' : ''}โดน: {target}
                                  </span>
                                )}
                              </div>

                            </div>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider border border-emerald-500/20">
                              {completedSets.length} Sets
                            </span>
                          </div>
                          
                          {completedSets.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {completedSets.map((s: any, j: number) => (
                                <div key={j} className="bg-[#18181b] border border-zinc-800/80 rounded-lg py-2 px-1 flex flex-col items-center justify-center">
                                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Set {j+1}</span>
                                  <span className="text-xs font-black text-white">
                                    {isBW ? 'BW' : `${s.weight}kg`}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-bold mt-0.5">{s.reps} Reps</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-600 font-bold text-center py-2">ไม่ได้บันทึกเซต</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Image Fullscreen Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-[95vw] max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl">
            <img 
              src={selectedImage} 
              alt="Full view" 
              className="w-full h-full object-contain animate-in zoom-in-95 duration-300"
            />
          </div>
          <p className="absolute bottom-10 text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">
            Tap anywhere to close
          </p>
        </div>
      )}

    </div>
  );
}