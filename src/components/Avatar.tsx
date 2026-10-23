/* eslint-disable @next/next/no-img-element -- signed URLs from Supabase, not optimizable */
export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (url) return <img src={url} alt={name} style={style} className="shrink-0 rounded-full object-cover" />;
  return (
    <span style={style} className="flex shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-semibold uppercase">
      {name.slice(0, 1)}
    </span>
  );
}
