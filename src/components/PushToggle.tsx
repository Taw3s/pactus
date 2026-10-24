"use client";

import { Bell, BellOff, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function keyBytes(base64url: string) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Settings: turn this device's notices on/off (friends closing the day, 20:00 reminder, weekly chest). */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(ios && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setError("");
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await fetch("/api/push/key").then((r) => (r.ok ? r.json() : Promise.reject()));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const json = sub.toJSON();
      const supabase = createClient();
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      const { error } = await supabase.from("push_subscriptions").insert({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth });
      if (error) throw error;
      setState("on");
    } catch {
      setError("Não foi possível ativar neste aparelho. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Não foi possível desativar agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="avisos" className="card" data-testid="push-settings" data-state={state}>
      <h2 id="avisos" className="pixel flex items-center gap-2 text-xl uppercase leading-6">
        <Bell size={20} aria-hidden /> Avisos
      </h2>
      <p className="mt-1 text-sm text-muted">
        Quando alguém do grupo fecha o dia, um lembrete às 20:00 se faltar meta e o baú da semana. No máximo um de cada por dia.
      </p>
      <div className="mt-3">
        {state === "loading" ? null : state === "on" ? (
          <button className="btn-secondary w-full" onClick={disable} disabled={busy}>
            {busy ? <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite]" /> : <BellOff size={18} aria-hidden />}
            Desativar avisos neste aparelho
          </button>
        ) : state === "off" ? (
          <button className="btn-primary w-full" onClick={enable} disabled={busy}>
            {busy ? <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite]" /> : <Bell size={18} aria-hidden />}
            Ativar avisos neste aparelho
          </button>
        ) : (
          <p className="text-sm" role="status">
            {state === "ios-install"
              ? "No iPhone, os avisos só funcionam com o Pacto instalado: toque em Compartilhar → Adicionar à Tela de Início e abra por lá."
              : state === "denied"
                ? "Os avisos estão bloqueados para este site. Libere nas configurações do navegador e volte aqui."
                : "Este navegador não recebe avisos."}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-fail">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
