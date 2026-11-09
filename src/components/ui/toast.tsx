import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "info" | "warning";
interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
}

const ToastContext = createContext<(t: Omit<Toast, "id" | "tone"> & { tone?: Tone }) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id" | "tone"> & { tone?: Tone }) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-2), { id, tone: "success", ...t }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-32px)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "warning" ? AlertTriangle : Info;
          return (
            <div key={t.id} className="pointer-events-auto flex animate-pop-in items-start gap-2.5 rounded-lg border border-border bg-background p-3 shadow-pop">
              <Icon className={cn("mt-px size-4 shrink-0", t.tone === "success" ? "text-success" : t.tone === "warning" ? "text-warning" : "text-info")} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-ink">{t.title}</div>
                {t.description && <div className="mt-0.5 text-xs text-ink-3">{t.description}</div>}
              </div>
              <button className="text-ink-4 hover:text-ink" onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}>
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
