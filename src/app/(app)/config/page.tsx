import { PageHeader } from "@/components/PageHeader";
import { SettingsForm } from "@/components/SettingsForm";
import { nextMonday, spToday } from "@/lib/dates";
import { requireMember, signUrls } from "@/lib/data";
import { dayOffOn } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, me, user } = await requireMember();
  const { data: changes } = await supabase.from("day_off_changes").select("weekday, effective_from").eq("user_id", me.user_id);
  const today = spToday();
  const urls = await signUrls(supabase, [me.avatar_path]);

  return (
    <>
      <PageHeader title="Configurações" subtitle={user.email} backFallback={`/historico/${me.user_id}`} />
      <SettingsForm
        groupId={me.group_id}
        userId={me.user_id}
        name={me.display_name}
        avatarUrl={me.avatar_path ? urls.get(me.avatar_path) ?? null : null}
        dayOffToday={dayOffOn(changes ?? [], today)}
        nextWeek={nextMonday(today)}
        dayOffNextWeek={dayOffOn(changes ?? [], nextMonday(today))}
      />
    </>
  );
}
