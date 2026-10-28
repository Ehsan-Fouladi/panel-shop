import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function FilterInput({
  id,
  label,
  value,
  onChange,
  placeholder = "جست‌وجو…",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="filter-input-wrap flex min-w-[min(100%,13rem)] flex-1 items-center gap-2 rounded-xl border border-input bg-control px-3 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25 [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Search aria-hidden="true" size={15} />
      <Input
        className="min-w-0 border-0 bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
        autoComplete="off"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}
