import type { ReactNode } from "react";

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="panel max-w-3xl p-6 sm:p-8 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2:first-child]:mt-0 [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:underline [&_strong]:font-bold">
      {children}
    </div>
  );
}
