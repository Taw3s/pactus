import { LearningHub } from "@/components/LearningHub";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Aprender" };

/** Lessons, challenges with the local playground, and free video courses. Beta: content and runtimes may change. */
export default function LearningPage() {
  return (
    <>
      <PageHeader title="Aprender" subtitle="Beta · Aulas, desafios e cursos gratuitos" backFallback="/hoje" />
      <LearningHub />
    </>
  );
}
