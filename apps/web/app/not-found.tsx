import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-10">
      <EmptyState aside="what the… hoot?" title="This page flew away" action={<Link href="/" className="btn btn-primary">Back home</Link>}>
        Nothing lives at this address.
      </EmptyState>
    </div>
  );
}
