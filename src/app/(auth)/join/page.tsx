"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorPt } from "@/lib/auth-errors";
import { confirmUrl } from "@/lib/site";
import { AuthShell, Notice } from "@/components/AuthShell";

function JoinForm() {
  const router = useRouter();
  // step=code: already authenticated but without a group (e.g. account created without a valid code).
  const codeOnly = useSearchParams().get("step") === "code";
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<"" | "confirm" | "magic">("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const invite = code.trim().toUpperCase();

    if (codeOnly) {
      const { error } = await supabase.rpc("join_group", { p_code: invite, p_name: name });
      if (error) {
        setError(error.message.includes("invalid") ? "Código de convite inválido." : "Não foi possível entrar no grupo.");
        setBusy(false);
        return;
      }
      router.replace("/hoje");
      router.refresh();
      return;
    }

    const { data: valid } = await supabase.rpc("check_invite_code", { p_code: invite });
    if (!valid) {
      setError("Código de convite inválido.");
      setBusy(false);
      return;
    }

    // The invite code travels in the user metadata; a database trigger adds the member.
    const data = { invite_code: invite, display_name: name.trim() };
    if (password) {
      const { data: res, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data, emailRedirectTo: confirmUrl() },
      });
      setBusy(false);
      if (error) return setError(authErrorPt(error.message));
      if (res.session) {
        router.replace("/hoje");
        router.refresh();
      } else setSent("confirm");
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, data, emailRedirectTo: confirmUrl() },
      });
      setBusy(false);
      if (error) return setError(authErrorPt(error.message));
      setSent("magic");
    }
  }

  if (sent) {
    return (
      <Notice title="Confira seu e-mail">
        {sent === "confirm" ? "Confirme seu e-mail" : "Abra o link"} enviado para <b>{email}</b> para terminar de entrar no grupo.
      </Notice>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="code">Código de convite</label>
        <input id="code" className="input uppercase tracking-widest" required autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="name">Seu nome</label>
        <input id="name" className="input" required maxLength={40} autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {!codeOnly && (
        <>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha <span className="text-muted">(opcional; sem senha, você entra por link no e-mail)</span></label>
            <input id="password" className="input" type="password" minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-fail">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Entrando…" : "Entrar no grupo"}</button>
      {!codeOnly && (
        <p className="text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-accent underline">
            Fazer login
          </Link>
        </p>
      )}
    </form>
  );
}

export default function JoinPage() {
  return (
    <AuthShell subtitle="Só entra quem tem convite">
      <Suspense>
        <JoinForm />
      </Suspense>
    </AuthShell>
  );
}
