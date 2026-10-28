import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { SUPPORT_URL } from "@/lib/support";

export const metadata: Metadata = { title: "Apoiar o Pacto · Pacto" };

// Pure donation: nothing in the app changes for whoever gives (no badge, points or ranking), so money never enters the group's game.
export default function SupportPage() {
  return (
    <>
      <h1>Apoiar o Pacto</h1>
      <p>
        O Pacto é um projeto independente, sem anúncios e sem vender dados. Hoje ele roda quase todo em planos gratuitos, e isso tem
        limites: o juiz IA, por exemplo, usa o plano gratuito do Google, que pode usar as fotos para melhorar os próprios produtos.
      </p>

      <h2>Para onde vai o dinheiro</h2>
      <ul>
        <li>o domínio do site;</li>
        <li>o plano pago do juiz IA, em que o Google não usa as fotos para melhorar os produtos dele;</li>
        <li>cópias de segurança diárias do banco de dados.</li>
      </ul>

      <h2>O que muda para quem apoia</h2>
      <p>
        Nada dentro do app: nem selo, nem ponto, nem posição no ranking. No Pacto, todo mundo do grupo joga com as mesmas regras. Apoiar é só
        ajudar o projeto a continuar.
      </p>

      <h2>Como apoiar</h2>
      {SUPPORT_URL ? (
        <>
          <p>
            O apoio é feito no Apoia-se, que cuida do pagamento pelas regras dele. Os dados do pagamento não passam pelo Pacto, e o app não fica
            sabendo quem apoiou.
          </p>
          <p className="mt-6">
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-on-accent! no-underline!">
              Apoiar no Apoia-se <ExternalLink size={18} aria-hidden />
            </a>
          </p>
        </>
      ) : (
        <p>A página de apoio ainda não está no ar. Obrigado por querer ajudar!</p>
      )}
    </>
  );
}
