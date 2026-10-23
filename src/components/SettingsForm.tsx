"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";
import { WEEKDAYS_PT } from "@/lib/dates";
import { compressImage, mediaPath } from "@/lib/image";

interface Props {
  groupId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  dayOffToday: number;
  dayOffTomorrow: number;
}

export function SettingsForm({ groupId, userId, name: initialName, avatarUrl, dayOffToday, dayOffTomorrow }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(initialName);
  const [dayOff, setDayOff] = useState(dayOffTomorrow);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function saveName() {
    setBusy("name");
    const { error } = await supabase.from("members").update({ display_name: name.trim() }).eq("user_id", userId);
    setBusy("");
    setMsg(error ? "Erro ao salvar o nome." : "Nome salvo.");
    router.refresh();
  }

  async function saveDayOff(weekday: number) {
    setDayOff(weekday);
    setBusy("dayoff");
    const { error } = await supabase.rpc("set_day_off", { p_weekday: weekday });
    setBusy("");
    setMsg(error ? "Erro ao salvar a folga." : `Folga: ${WEEKDAYS_PT[weekday]} (vale a partir de amanhã).`);
    router.refresh();
  }

  async function saveAvatar(file: File | undefined) {
    if (!file) return;
    setBusy("avatar");
    try {
      const blob = await compressImage(file, 512);
      const path = mediaPath(groupId, userId, "avatar");
      const up = await supabase.storage.from("media").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const { error } = await supabase.from("members").update({ avatar_path: path }).eq("user_id", userId);
      if (error) throw error;
      setMsg("Foto atualizada.");
      router.refresh();
    } catch {
      setMsg("Erro ao enviar a foto.");
    }
    setBusy("");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <section className="card space-y-3">
        <div className="flex items-center gap-4">
          <Avatar name={name || "?"} url={avatarUrl} size={64} />
          <label className="btn-ghost cursor-pointer">
            {busy === "avatar" ? "Enviando…" : "Trocar foto"}
            <input type="file" accept="image/*" className="sr-only" data-testid="avatar" onChange={(e) => saveAvatar(e.target.files?.[0])} />
          </label>
        </div>
        <div>
          <label className="label" htmlFor="name">Nome</label>
          <div className="flex gap-2">
            <input id="name" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn-primary" disabled={busy === "name" || !name.trim() || name === initialName} onClick={saveName}>
              Salvar
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold">Dia de folga (6x1)</h2>
        <p className="mb-3 text-xs text-zinc-400">
          Hoje vale: {WEEKDAYS_PT[dayOffToday]}. Mudanças valem a partir de amanhã, para não alterar dias passados.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {WEEKDAYS_PT.map((label, i) => (
            <button
              key={label}
              disabled={busy === "dayoff"}
              onClick={() => saveDayOff(i)}
              className={`rounded-xl py-2 text-sm ${dayOff === i ? "bg-emerald-500 font-semibold text-zinc-950" : "bg-zinc-800 text-zinc-300"}`}
            >
              {label.slice(0, 3)}
            </button>
          ))}
        </div>
      </section>

      {msg && <p className="text-center text-sm text-emerald-300" role="status">{msg}</p>}

      <button className="btn-ghost w-full" onClick={logout}>Sair</button>
    </div>
  );
}
