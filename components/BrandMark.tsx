export function BrandMark() {
  return (
    <div className="inline-flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(10,132,255,0.18)] bg-[rgba(10,132,255,0.08)] shadow-[0_8px_20px_rgba(10,132,255,0.08)]">
        <span className="h-2 w-2 rounded-full bg-[var(--repple-accent)]" />
      </span>
      <div className="flex flex-col">
        <span className="text-[1.15rem] font-semibold tracking-[-0.035em] text-[var(--repple-ink)]">
          Repple
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.34em] text-[var(--repple-muted)]">
          Appointment Media
        </span>
      </div>
    </div>
  );
}
