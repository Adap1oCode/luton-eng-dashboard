export type Projection<TDomain, TView> = {
  [K in keyof TView]:
    | keyof TDomain
    | ((row: TDomain) => TView[K]);
};

export function projectRows<TDomain, TView>(
  rows: TDomain[],
  spec: Projection<TDomain, TView>
): TView[] {
  return rows.map((r) => {
    const out: any = {};
    for (const key in spec) {
      const map = spec[key];
      out[key] = typeof map === "function" ? (map as any)(r) : (r as any)[map];
    }
    return out as TView;
  });
}
