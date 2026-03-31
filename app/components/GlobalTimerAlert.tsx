'use client'
import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';

export default function GlobalTimerAlert() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const savedTarget = localStorage.getItem('workout_timer_target');
      if (savedTarget) {
        const target = parseInt(savedTarget, 10);
        const now = Date.now();

        if (now >= target) {
          setShow(true);
          localStorage.removeItem('workout_timer_target'); 

          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(() => {});
          } catch(e) {}

          if ("vibrate" in navigator) {
            navigator.vibrate([300, 100, 300, 100, 300]);
          }

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("หมดเวลาพักแล้ว! ⏱️", {
              body: "ลุกขึ้นมาลุยเซตต่อไปกันเลย 🔥",
              vibrate: [300, 100, 300]
            } as any);
          }

          setTimeout(() => setShow(false), 5000);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in zoom-in-90 slide-in-from-top-8 duration-300">
      <div className="bg-[#09090b]/90 backdrop-blur-xl border border-blue-500/50 shadow-[0_15px_40px_-10px_rgba(59,130,246,0.5)] px-6 py-4 rounded-3xl flex items-center gap-4 w-max max-w-[90vw]">
        <div className="p-2 rounded-full bg-blue-500/20 relative">
          <div className="absolute inset-0 rounded-full blur-md bg-blue-500/30"></div>
          <Info size={20} className="text-blue-500 relative z-10" />
        </div>
        <span className="text-sm font-bold text-white tracking-wide">
          หมดเวลาพักแล้ว! ลุยเซตต่อไปกันเลย🔥
        </span>
      </div>
    </div>
  );
}