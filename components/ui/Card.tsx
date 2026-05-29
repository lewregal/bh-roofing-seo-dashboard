export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-surface-border bg-surface-card p-5 ${className}`}>
      {children}
    </div>
  );
}
