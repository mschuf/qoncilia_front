interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

const sizeMap = {
  sm: {
    wrapper: "h-10 w-10 text-lg",
    tail: "h-3 w-3",
    wordmark: "text-lg"
  },
  md: {
    wrapper: "h-14 w-14 text-2xl",
    tail: "h-4 w-4",
    wordmark: "text-2xl"
  },
  lg: {
    wrapper: "h-20 w-20 text-4xl",
    tail: "h-5 w-5",
    wordmark: "text-4xl"
  }
} as const;

export default function BrandMark({
  size = "md",
  showWordmark = true
}: BrandMarkProps) {
  const classes = sizeMap[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative flex items-center justify-center rounded-[1.75rem] bg-[linear-gradient(135deg,_#0f172a_0%,_#1d4ed8_58%,_#38bdf8_100%)] font-black text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.65)] ${classes.wrapper}`}
      >
        <span className="relative z-10 tracking-[-0.08em]">Q</span>
        <span
          className={`absolute bottom-2 right-2 rounded-full border-2 border-white/85 bg-cyan-300/90 ${classes.tail}`}
        />
      </div>
      {showWordmark ? (
        <div>
          <p className={`font-black tracking-[-0.04em] text-slate-950 ${classes.wordmark}`}>
            Qoncilia
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-slate-500">
            Conciliacion Inteligente
          </p>
        </div>
      ) : null}
    </div>
  );
}
