import { BetaFeedback } from "@/components/BetaFeedback";
import { PageHeader } from "@/components/PageHeader";
import { requireMember } from "@/lib/data";

export const metadata = { title: "Feedback do beta" };
export const dynamic = "force-dynamic";

/** Beta feedback for signed-in participants (the same form as in Configurações). */
export default async function FeedbackPage() {
  const { me } = await requireMember();
  return (
    <>
      <PageHeader title="Feedback" subtitle="Beta do Pacto" backFallback={`/historico/${me.user_id}`} />
      <BetaFeedback />
    </>
  );
}
