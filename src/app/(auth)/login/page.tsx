"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { confirmUrl } from "@/lib/site";
import { AuthShell, Notice } from "@/components/AuthShell";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") === "link" ? "Link inválido ou expirado. Peça outro." : "");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("E-mail ou senha incorretos.");
        setBusy(false);
        return;
      }
      router.replace("/hoje");
      router.refresh();
    } else {
      // shouldCreateUser: false -> magic link never creates accounts; joining needs an invite.
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: confirmUrl() },
      });
      setBusy(false);
      if (error) setError("Não encontramos essa conta. Entrou com convite?");
      else setSent(true);
    }
  }

  if (sent) {
    return (
      <Notice title="Confira seu e-mail">
        Enviamos um link de acesso para <b>{email}</b>. Abra no mesmo celular. No iPhone com o app instalado,
        prefira entrar com senha: o link abre no Safari, fora do app.
      </Notice>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-900 p-1">
        {(["password", "magic"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-sm font-medium ${mode === m ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
          >
            {m === "password" ? "Senha" : "Link mágico"}
          </button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {mode === "password" && (
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "Entrando…" : mode === "password" ? "Entrar" : "Enviar link"}
      </button>
      <p className="text-center text-sm text-zinc-400">
        Tem um código de convite? <Link href="/join" className="text-emerald-400 underline">Entrar no grupo</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell subtitle="Entre para fazer o check-in de hoje">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
