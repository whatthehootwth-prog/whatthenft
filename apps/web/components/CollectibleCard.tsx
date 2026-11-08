import Link from "next/link";
import { Mutant } from "@/components/Mutant";
import { StateChip, type Backing } from "@/components/ui";
import { MEME_STYLE, type MutantSpec } from "@/lib/mutant-parts";

export interface CollectibleCardProps {
  spec: MutantSpec;
  title: string;
  rarity: string;
  memes: string[];
  href?: string;
  state?: Backing;
  price?: string | null;
  preview?: boolean;
  className?: string;
  priority?: boolean;
}

export function CollectibleCard({ spec, title, rarity, memes, href, state, price, preview, className = "" }: CollectibleCardProps) {
  const body = (
    <>
      <div className="card-art aspect-square">
        <Mutant spec={spec} className="h-full w-full p-2" label={`${title}, ${rarity} mutant made of ${memes.join(", ")}`} />
        <span className="absolute left-2 top-2 rounded-lg border-2 border-ink bg-paper px-2 py-0.5 font-display text-sm">{rarity}</span>
        {preview && <span className="stamp absolute bottom-2 right-2 !bg-paper">preview</span>}
      </div>
      <div className="px-3.5 pb-3.5 pt-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-xl leading-tight">{title}</p>
          {price ? <p className="num text-sm font-bold">{price} Ⓝ</p> : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {memes.map((m) => (
            <span key={m} className="rounded-md border-2 border-ink px-1.5 py-px font-mono text-[0.68rem] font-bold" style={{ background: Object.values(MEME_STYLE).find((s) => s.label === m)?.color ?? "#FFF4DC" }}>
              {m}
            </span>
          ))}
        </div>
        {state && (
          <div className="mt-2.5">
            <StateChip state={state} />
          </div>
        )}
      </div>
    </>
  );
  const cls = `card-frame rar-${rarity} ${className}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
