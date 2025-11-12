"use client";

import * as React from "react";

type PageHeaderContextValue = {
  title: string | null;
  count: number | null;
  setPageHeader: (title: string | null, count: number | null) => void;
};

const PageHeaderContext = React.createContext<PageHeaderContextValue | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = React.useState<string | null>(null);
  const [count, setCount] = React.useState<number | null>(null);

  const setPageHeader = React.useCallback((newTitle: string | null, newCount: number | null) => {
    setTitle(newTitle);
    setCount(newCount);
  }, []);

  const value = React.useMemo(
    () => ({
      title,
      count,
      setPageHeader,
    }),
    [title, count, setPageHeader]
  );

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeader() {
  const context = React.useContext(PageHeaderContext);
  if (context === undefined) {
    throw new Error("usePageHeader must be used within a PageHeaderProvider");
  }
  return context;
}


