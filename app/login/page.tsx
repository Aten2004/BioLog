'use client'
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  LogIn, UserPlus, Mail, Lock, CheckCircle, 
  XCircle, ArrowRight, Loader2, Eye, EyeOff 
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        showNotification('ยินดีต้อนรับกลับ! กำลังเข้าสู่ระบบ...', 'success');
        setTimeout(() => router.push('/'), 1500);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        showNotification('ลงทะเบียนสำเร็จ! สามารถเข้าสู่ระบบได้เลย', 'success');
        setIsLogin(true); 
        setPassword(''); 
      }
    } catch (error: any) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`, 
        }
      });
      if (error) throw error;
    } catch (error: any) {
      showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google', 'error');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-24">
      <div className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col gap-6">
        
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-600/10 rounded-full blur-[60px] -mt-20"></div>

        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center pt-4 relative z-10">
          <div className="w-72 h-auto transition-transform hover:scale-105">
             <img 
               src="/Logo_Web.svg" 
               alt="BioLog Logo" 
               className="w-full h-full object-contain" 
             />
          </div>
          
          <div className="text-center">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
              Track. Build. Improve.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#09090b] p-1.5 rounded-2xl border border-zinc-800/80 relative z-10">
          <button 
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${isLogin ? 'bg-[#1c1c21] text-white shadow-lg border border-zinc-700/50' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            <LogIn size={14} /> Login
          </button>
          <button 
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${!isLogin ? 'bg-[#1c1c21] text-white shadow-lg border border-zinc-700/50' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            <UserPlus size={14} /> Sign Up
          </button>
        </div>

        {/* Email Form */}
        <form onSubmit={handleAuth} className="flex flex-col gap-4 relative z-10">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2 tracking-widest">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium text-white focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10 transition-all placeholder:text-zinc-700"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2 tracking-widest">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl pl-12 pr-12 py-4 text-sm font-medium text-white focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10 transition-all placeholder:text-zinc-700"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {!isLogin && <span className="text-[10px] text-zinc-600 ml-2 mt-1">* รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร</span>}
          </div>

          <button 
            disabled={loading || !email || !password}
            className="mt-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:shadow-none flex items-center justify-center gap-2 group"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                {isLogin ? 'Enter The Ledger' : 'Start Journey'}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center mt-2 mb-2 z-10">
          <div className="absolute w-full h-px bg-zinc-800"></div>
          <span className="relative bg-[#18181b] px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Or</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="relative z-10 bg-white hover:bg-zinc-200 text-black disabled:bg-zinc-400 disabled:text-zinc-600 text-xs font-bold uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3"
        >
          {googleLoading ? <Loader2 size={18} className="animate-spin" /> : (
            <>
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

      </div>

      {/* Toast Alert */}
      {toast.show && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in zoom-in-90 slide-in-from-top-8 duration-300">
          <div className={`bg-[#09090b]/90 backdrop-blur-xl border ${toast.type === 'success' ? 'border-emerald-500/50 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)]' : 'border-red-500/50 shadow-[0_10px_40px_-10px_rgba(220,38,38,0.3)]'} px-6 py-4 rounded-3xl flex items-center gap-3 w-max max-w-[90vw]`}>
            {toast.type === 'success' ? <CheckCircle className="text-emerald-500" size={20} /> : <XCircle className="text-red-500" size={20} />}
            <span className="text-sm font-bold text-white tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}