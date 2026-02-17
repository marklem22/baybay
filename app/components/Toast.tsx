import { useEffect } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 3000);
    return () => clearTimeout(timeout);
  }, [message, onClose]);

  return (
    <div className="fixed bottom-5 right-5 z-[2000] flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] shadow-lg animate-fade-in">
      <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
      {message}
    </div>
  );
}
