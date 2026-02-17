import { useEffect } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 3000);
    return () => clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className="fixed right-5 top-5 z-[2000] rounded-[12px] bg-[var(--success)] px-7 py-4 font-bold text-white shadow-[0_10px_40px_rgba(16,185,129,0.4)] animate-fade-in">
      {message}
    </div>
  );
}
