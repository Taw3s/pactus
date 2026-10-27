import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, CONTROLLER_NAME, LEGAL_UPDATED } from "@/lib/legal";
import { KEEP_FULL_DAYS } from "@/lib/media-retention";

export const metadata: Metadata = { title: "Política de privacidade · Pacto" };

// Written from what the code actually stores and sends (keep in sync when that changes; see CLAUDE.md).
export default function PrivacyPage() {
  const contact = CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <b>(e-mail de contato ainda não definido)</b>;
  return (
    <>
      <h1>Política de privacidade</h1>
      <p className="text-sm text-muted">Atualizada em {LEGAL_UPDATED}.</p>
      <p>
        O Pacto é um app para grupos de amigos cumprirem metas diárias juntos. Esta página explica quais dados o app guarda, quem vê, com quem
        eles são compartilhados e como você apaga tudo. Responsável pelos dados (controlador, na LGPD): {CONTROLLER_NAME}. Contato: {contact}.
      </p>

      <h2>O que o Pacto guarda</h2>
      <ul>
        <li>
          <b>Conta:</b> seu e-mail e sua senha (guardada cifrada pelo serviço de login, nunca em texto). Se você entrar com o Google, recebemos
          o e-mail e o nome da sua conta Google.
        </li>
        <li>
          <b>Perfil:</b> o nome que você escolhe, a foto de perfil (se enviar) e o seu dia de folga.
        </li>
        <li>
          <b>Provas:</b> as fotos que você envia (até quatro por prova), os minutos de estudo, as páginas lidas, o resumo do estudo, o nome do
          projeto, o dia e a hora do envio e a data que o arquivo da foto informa (só a data, para mostrar ao grupo quando a foto é antiga).
        </li>
        <li>
          <b>Teste de digitação:</b> os resultados (palavras por minuto, precisão), o texto e o idioma escolhidos, se foi no computador ou no
          celular e até onde você chegou em cada texto.
        </li>
        <li>
          <b>Vida do grupo:</b> dívidas e pagamentos (quem pagou, o que e quem recebeu), acusações, defesas e votos no tribunal com o motivo,
          carimbos nas provas, baús e itens da coleção.
        </li>
        <li>
          <b>Avisos:</b> se você ativar os avisos no aparelho, o endereço que o navegador cria para recebê-los.
        </li>
      </ul>
      <p>
        O Pacto <b>não</b> coleta sua localização nem seus contatos, não usa ferramentas de análise de comportamento, não mostra anúncios e não
        vende dados. O único cookie é o da sua sessão de login.
      </p>

      <h2>Quem vê</h2>
      <p>
        Só as pessoas do seu grupo veem suas provas, seu nome, suas dívidas e seus votos. Pessoas de outros grupos não veem nada do seu. O
        banco de dados aplica essa regra em cada consulta. O responsável pelo Pacto pode acessar os dados para manter o app funcionando e
        resolver problemas que você relatar.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>O Pacto depende destes serviços, que tratam dados em nome dele e podem guardá-los em servidores fora do Brasil:</p>
      <ul>
        <li>
          <b>Supabase:</b> banco de dados, arquivos (as fotos) e login.
        </li>
        <li>
          <b>Vercel:</b> hospedagem do app.
        </li>
        <li>
          <b>Google (API Gemini):</b> o juiz IA envia a foto e os números de uma prova para a IA do Google conferir se batem. O Google trata
          esses dados pelos termos da API Gemini; dependendo do plano usado, pode usá-los para melhorar os próprios serviços. O juiz IA não decide
          nada sozinho: a decisão é sempre do grupo.
        </li>
        <li>
          <b>Serviços de aviso do navegador</b> (Google, Apple ou Mozilla, conforme o seu aparelho): entregam os avisos que você ativou.
        </li>
        <li>
          <b>Serviço de e-mail:</b> envia os links de login e de confirmação.
        </li>
      </ul>

      <h2>Por que usamos (bases legais)</h2>
      <ul>
        <li>Para o app funcionar como você pediu ao entrar num grupo: execução do serviço (LGPD, art. 7º, V).</li>
        <li>Para os avisos no aparelho: o seu consentimento, que você retira desativando os avisos.</li>
        <li>Para a segurança do app e para responder a problemas: legítimo interesse (art. 7º, IX).</li>
      </ul>

      <h2>Por quanto tempo</h2>
      <ul>
        <li>
          As fotos das provas ficam guardadas em tamanho original por {KEEP_FULL_DAYS} dias. Depois disso, só fica uma versão reduzida da
          primeira foto.
        </li>
        <li>
          Quando você <b>sai do grupo</b> ou é removido, suas provas, fotos, dívidas e testes saem junto. Ficam no histórico do grupo, sem
          ligação com a sua conta, os pagamentos que você recebeu (com o seu nome, para o recibo de quem pagou continuar valendo), as
          acusações que você fez e os seus votos (sem o seu nome), para que decisões já tomadas não mudem.
        </li>
        <li>
          Quando você <b>exclui a conta</b>, acontece o mesmo e, além disso, o seu login é apagado.
        </li>
      </ul>

      <h2>Seus direitos</h2>
      <p>Pela LGPD (art. 18) você pode, a qualquer momento:</p>
      <ul>
        <li>saber quais dados seus o Pacto tem e pedir uma cópia;</li>
        <li>corrigir o seu nome e a sua foto (em Configurações);</li>
        <li>sair do grupo ou excluir a conta (em Configurações), sem precisar pedir para ninguém;</li>
        <li>retirar o consentimento dos avisos (em Configurações ou no seu aparelho);</li>
        <li>pedir informações sobre com quem os dados são compartilhados.</li>
      </ul>
      <p>Para o que não está em Configurações, escreva para {contact}. Você também pode reclamar à ANPD (gov.br/anpd).</p>

      <h2>Menores de idade</h2>
      <p>O Pacto é feito para maiores de 18 anos. Menores só podem usar com a autorização de um responsável.</p>

      <h2>Segurança</h2>
      <p>
        Toda a comunicação é cifrada (HTTPS), as fotos ficam num armazenamento privado com links temporários e o banco de dados só entrega a
        cada pessoa os dados do próprio grupo. Nenhum sistema é perfeitamente seguro: se acontecer um incidente que afete você, avisaremos.
      </p>

      <h2>Mudanças</h2>
      <p>
        Se esta política mudar, a data no topo muda e, se for algo importante, avisaremos no app. Veja também os{" "}
        <Link href="/termos">termos de uso</Link>.
      </p>
    </>
  );
}
