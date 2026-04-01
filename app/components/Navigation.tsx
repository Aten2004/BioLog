'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Utensils, Calendar, Home, UserCircle, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const getStreakStyle = (streak: number) => {
  if (!streak || streak <= 0) {
    return { 
      container: "bg-[#18181b] border-[#27272a]", 
      icon: "text-zinc-600", 
      text: "text-zinc-500",
      label: "ยังไม่เริ่ม"
    };
  } 
  
  if (streak >= 1 && streak <= 7) {
    return { 
      container: "bg-amber-500/10 border-amber-500/30", 
      icon: "text-amber-400 fill-amber-400", 
      text: "text-amber-400",
      label: "จุดประกาย"
    };
  } 
  
  if (streak >= 8 && streak <= 21) {
    return { 
      container: "bg-orange-500/10 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]", 
      icon: "text-orange-500 fill-orange-500", 
      text: "text-orange-500",
      label: "เริ่มเข้าที่"
    };
  } 
  
  if (streak >= 22 && streak <= 65) {
    return { 
      container: "bg-red-500/10 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]", 
      icon: "text-red-500 fill-red-500 animate-pulse", 
      text: "text-red-500",
      label: "ไฟลุกโชน"
    };
  } 
  
  if (streak >= 66 && streak <= 90) {
    return { 
      container: "bg-fuchsia-500/10 border-fuchsia-500/40 shadow-[0_0_20px_rgba(217,70,239,0.4)]", 
      icon: "text-fuchsia-500 fill-fuchsia-500 animate-pulse", 
      text: "text-fuchsia-500",
      label: "หยุดไม่อยู่"
    };
  } 
  
  return { 
    container: "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.5)]", 
    icon: "text-cyan-400 fill-cyan-400 animate-bounce", 
    text: "text-cyan-400 font-black",
    label: "วิวัฒนาการ"
  };
};

export default function Navigation() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadProfileAndStreak = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url, streak_count')
        .eq('id', session.user.id)
        .single();
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const [bodyLogsRes, foodLogsRes, workoutLogsRes] = await Promise.all([
        supabase.from('body_logs').select('date').eq('user_id', session.user.id),
        supabase.from('food_logs').select('date').eq('user_id', session.user.id),
        supabase.from('workout_logs').select('date').eq('user_id', session.user.id)
      ]);

      const allDates = new Set<string>();
      bodyLogsRes.data?.forEach(l => allDates.add(l.date));
      foodLogsRes.data?.forEach(l => allDates.add(l.date));
      workoutLogsRes.data?.forEach(l => allDates.add(l.date));

      const uniqueDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      let streak = 0;
      if (uniqueDates.length > 0) {
        const latestDate = new Date(uniqueDates[0]);
        latestDate.setHours(0,0,0,0);
        
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

      if (profileData && profileData.streak_count !== streak) {
        await supabase.from('user_profiles').update({ streak_count: streak }).eq('id', session.user.id);
        profileData.streak_count = streak;
      }

      if (isMounted) setProfile(profileData);
    };

    if (pathname !== '/login' && pathname !== '/onboarding') {
      loadProfileAndStreak();
    }

    const handleSync = () => { if (isMounted) loadProfileAndStreak(); };
    window.addEventListener('sync_data', handleSync);

    return () => { 
      isMounted = false; 
      window.removeEventListener('sync_data', handleSync);
    };
  }, [pathname]);

  if (pathname === '/login' || pathname === '/onboarding') return null;

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/workout', icon: Activity, label: 'Workout' },
    { href: '/nutrition', icon: Utensils, label: 'Nutrition' }, 
    { href: '/calendar', icon: Calendar, label: 'History' },
  ];

  const streak = profile?.streak_count || 0;
  const streakStyle = getStreakStyle(streak);

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-16 bg-[#09090b]/80 backdrop-blur-md border-b border-[#27272a] flex items-center justify-between px-4 z-50">
        
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-13 flex items-center justify-center transition-transform group-hover:scale-105">
            <img 
              src="/Logo_Web.svg" 
              alt="BioLog Logo" 
              className="h-full w-auto object-contain" 
            />
          </div>
        </Link>

        <div className="flex items-center gap-4">
          
          <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl border transition-all duration-500 ${streakStyle.container}`}>
            <div className="flex items-center gap-1.5">
              <Flame size={14} className={streakStyle.icon} />
              <span className={`text-xs font-black ${streakStyle.text}`}>{streak}</span>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-tighter opacity-80 ${streakStyle.text}`}>
              {streakStyle.label}
            </span>
          </div>

          <Link href="/profile" className="flex items-center gap-3 pl-2 border-l border-zinc-800 group">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#18181b] border border-[#27272a] group-hover:border-red-500 transition-all flex items-center justify-center shadow-lg ring-2 ring-transparent group-hover:ring-red-500/20">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle size={20} className="text-zinc-500" />
              )}
            </div>
          </Link>
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-20 bg-[#09090b]/90 backdrop-blur-lg border-t border-[#27272a] flex items-center justify-around px-2 z-50 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-full h-full gap-1">
              <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-red-600/20 text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'text-red-500' : 'text-zinc-500'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}