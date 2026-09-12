import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-3 px-5 py-7">
      <Badge tone="success" dot>
        aal2
      </Badge>
      <h1 className="text-2xl font-semibold text-neutral-50">You&apos;re signed in.</h1>
    </div>
  );
}
