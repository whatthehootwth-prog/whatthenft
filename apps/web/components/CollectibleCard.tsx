import Link from "next/link";
import { ArtMutant } from "@/components/ArtMutant";
import { StateChip, type Backing } from "@/components/ui";
import { MEMES, type MutantSpec } from "@/lib/art";

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
}

const colorOf = (label: string) => MEMES.find((m) => m.displayName === label)?.color ?? "#fff";

export function CollectibleCard({ spec, title, rarity, memes, href, state, price, preview, className = "" }: CollectibleCardProps) {
  const body = (
    <>
      <div className="card-art aspect-square">
        <ArtMutant spec={spec} className="relative h-full w-full p-1" label={`${title}, ${rarity} mutant made of ${memes.join(", ")}`} />
        <span className="pixel absolute left-2 top-2 z-10 rounded-md border-2 border-ink bg-white px-1.5 py-0.5 text-[0.62rem] font-bold">{rarity}</span>
        {preview && <span className="stamp absolute bottom-2 right-2 z-10 !text-[0.58rem]">preview</span>}
      </div>
      <div className="px-3.5 pb-3.5 pt-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-2xl leading-tight">{title}</p>
          {price ? <p className="num text-sm font-bold">{price} Ⓝ</p> : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {memes.map((m) => (
            <span key={m} className="pixel rounded-md border-2 border-ink px-1.5 py-px text-[0.6rem] font-bold" style={{ background: colorOf(m) }}>
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
