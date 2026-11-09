import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface Crumb {
  label: string;
  to?: string;
}

const Ctx = createContext<{ crumbs: Crumb[]; setCrumbs: (c: Crumb[]) => void }>({ crumbs: [], setCrumbs: () => {} });

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  return <Ctx.Provider value={{ crumbs, setCrumbs }}>{children}</Ctx.Provider>;
}

export const useCrumbState = () => useContext(Ctx).crumbs;

/** Pages declare their breadcrumb trail. */
export function useBreadcrumbs(crumbs: Crumb[]) {
  const { setCrumbs } = useContext(Ctx);
  const key = JSON.stringify(crumbs);
  useEffect(() => {
    setCrumbs(crumbs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCrumbs]);
}
