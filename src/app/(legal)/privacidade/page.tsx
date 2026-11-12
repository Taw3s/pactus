import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, CONTROLLER_NAME, LEGAL_UPDATED, PUBLIC_NAME } from "@/lib/legal";
import { KEEP_FULL_DAYS } from "@/lib/media-retention";

export const metadata: Metadata = { title: "Política de privacidade · Pacto" };

// Written from what the code actually stores and sends (keep in sync when that changes; see CLAUDE.md).
export default function PrivacyPage() {
  const contact = CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <b>(e-mail de contato ainda não definido)</b>;
  const controller = CONTROLLER_NAME || <b>(identidade do controlador ainda não informada)</b>;
  return (
    <>
      <h1>Política de privacidade</h1>
      <p className="text-sm text-muted">Atualizada em {LEGAL_UPDATED}.</p>
      <p>
        O Pacto é um app para grupos de amigos cumprirem metas diárias juntos. Esta página explica quais dados o app guarda, quem vê, com quem
        eles são compartilhados e como você apaga tudo. {PUBLIC_NAME} é só o nome público do projeto, não uma empresa. Responsável pelos dados
        (controlador, na LGPD): {controller}, que também é o encarregado pelo tratamento de dados (LGPD, art. 41). Contato para assuntos de
        privacidade: {contact}.
      </p>

      <h2>O que o Pacto guarda</h2>
      <ul>
        <li>
          <b>Conta:</b> seu e-mail e sua senha (guardada cifrada pelo serviço de login, nunca em texto). Se você entrar com o Google, recebemos
          o e-mail e o nome da sua conta Google.
        </li>
        <li>
          <b>Perfil:</b> o nome que você escolhe, a foto de perfil (se enviar), o seu dia de folga e quando você viu a apresentação do grupo
          (só a data e a hora, para ela não aparecer de novo em outro aparelho; só você vê e ela sai junto quando você sai do grupo).
        </li>
        <li>
          <b>Provas:</b> as fotos que você envia (até quatro por prova), os minutos de estudo, as páginas lidas, a pergunta do dia e a sua resposta sobre o estudo, o nome do
          projeto, o link do repositório GitHub informado, PDFs de estudo e arquivos ZIP opcionais de projeto (até 10 MB cada), o dia e a hora do envio e a data que o arquivo da foto informa (só a data, para mostrar ao grupo quando a foto é antiga).
        </li>
        <li>
          <b>Teste de digitação:</b> os resultados (palavras por minuto, precisão), o texto e o idioma escolhidos, se foi no computador ou no
          celular e até onde você chegou em cada texto.
        </li>
        <li>
          <b>Aprender:</b> quais aulas escritas e desafios você concluiu, a melhor nota de cada desafio (de 0 a 5) e, em cada curso em vídeo,
          os identificadores dos vídeos do YouTube que você concluiu, o vídeo atual, a posição nele e o tamanho da playlist. Isso fica na sua
          conta, para você continuar em qualquer aparelho; só você vê, e não muda pontos, ranking nem nada do grupo. O código que você digita
          no playground roda no seu aparelho, em quadros e processos isolados do navegador, e não é enviado ao Pacto nem a outro serviço.
        </li>
        <li>
          <b>Vida do grupo:</b> dívidas e pagamentos (quem pagou, o que e quem recebeu), acusações, defesas e votos no tribunal com o motivo,
          carimbos nas provas, baús e itens da coleção.
        </li>
        <li>
          <b>Avisos:</b> se você ativar os avisos no aparelho, o endereço que o navegador cria para recebê-los.
        </li>
        <li>
          <b>Feedback do beta:</b> se você usar o formulário de feedback, o app guarda só o dia e a hora de cada envio ligados à sua conta,
          para limitar os envios (um a cada 30 segundos e até 3 em 24 horas). O texto da mensagem não fica guardado no app.
        </li>
      </ul>
      <p>
        O Pacto <b>não</b> coleta sua localização nem seus contatos, não usa ferramentas de análise de comportamento, não mostra anúncios e não
        vende dados. O único cookie é o da sua sessão de login.
      </p>
      <p>
        No próprio aparelho, o navegador guarda marcações de tela que não saem dele nem vão para o servidor, como o andamento dos primeiros passos
        na tela Hoje (se você copiou o link de convite, se marcou que entendeu o combinado e se recolheu o cartão), separado por conta e por grupo.
        Também guarda o rascunho de uma prova ainda não enviada (resposta à pergunta do dia, minutos, páginas, nome e link do projeto, nunca fotos
        nem arquivos), para ele não se perder se a página recarregar. O rascunho vale só para a sua conta, o seu grupo e o dia em que foi escrito:
        sai quando a prova é enviada, no dia seguinte, ao sair da conta, ao sair do grupo e ao excluir a conta.
        Nos cursos em vídeo, o navegador guarda também a ordem e os títulos dos vídeos de cada playlist, como vieram do YouTube, só para
        desenhar a lista antes de o player responder (o que você assistiu fica na conta, acima).
        Limpar os dados do site no navegador apaga essas marcações. O link de convite leva só o código do grupo, nunca o seu e-mail ou a sua conta.
      </p>

      <p>
        Os cursos em vídeo usam o player do YouTube. Ele só carrega quando você toca em “Carregar player do YouTube”: nesse momento o app
        busca o programa do player em youtube.com e abre o vídeo pelo domínio youtube-nocookie.com, sem começar a tocar sozinho. A partir daí
        o Google/YouTube recebe dados técnicos do navegador e da conexão e, durante a reprodução, dados de uso do player, conforme a{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">política de privacidade do Google</a>. Se
        preferir, abra a playlist direto no YouTube, sem carregar o player aqui.
      </p>

      <h2>Quem vê</h2>
      <p>
        Só as pessoas do seu grupo veem suas provas, seu nome, suas dívidas e seus votos. Pessoas de outros grupos não veem nada do seu. O
        banco de dados aplica essa regra em cada consulta. O responsável pelo Pacto pode acessar os dados para manter o app funcionando e
        resolver problemas que você relatar.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>
        O Pacto depende destes serviços, que tratam dados em nome dele. Eles podem guardar os dados em servidores fora do Brasil: essa
        transferência internacional é necessária para o serviço funcionar (LGPD, art. 33, IX, com o art. 7º, V).
      </p>
      <ul>
        <li>
          <b>Supabase:</b> banco de dados, arquivos (fotos, PDFs e ZIPs privados) e login. Os anexos não são executados pelo app; integrantes do mesmo grupo podem abri-los por links temporários.
        </li>
        <li>
          <b>Vercel:</b> hospedagem do app.
        </li>
        <li>
          <b>Sentry:</b> recebe um relatório quando o app dá erro: a mensagem do erro, o trecho do código em que ele aconteceu, o endereço
          da tela (sem o que vem depois do “?”), o navegador e o sistema do aparelho. Não recebe o seu nome, e-mail, endereço IP, cookies nem
          o conteúdo das provas, e não registra o que você faz no app quando não há erro. Os relatórios ficam guardados lá por até 90 dias.
        </li>
        <li>
          <b>Google (API Gemini):</b> o juiz IA envia a foto, os números e, no estudo, a pergunta do dia com a sua resposta para a IA do Google conferir se batem. Usamos o plano
          gratuito da API Gemini, e os termos desse plano permitem ao Google usar o que enviamos (e as respostas da IA) para melhorar e
          desenvolver os próprios produtos, inclusive com revisão por pessoas, depois de separar os dados da conta do Pacto no Google. Por
          isso, evite mostrar nas fotos o seu rosto, documentos ou qualquer coisa que você não queira que outras pessoas vejam. O juiz IA não
          decide nada sozinho: a decisão é sempre do grupo.
        </li>
        <li>
          <b>YouTube/Google:</b> só se você carregar o player de um curso em vídeo: recebe dados técnicos do navegador e da conexão e, durante
          a reprodução, dados de uso do player. Não recebe o seu nome, e-mail nem o seu progresso no Pacto. Veja os{" "}
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">Termos de Serviço do YouTube</a>.
        </li>
        <li>
          <b>Serviços de aviso do navegador</b> (Google, Apple ou Mozilla, conforme o seu aparelho): entregam os avisos que você ativou.
        </li>
        <li>
          <b>Resend (e-mail):</b> envia os links de login e de confirmação. Recebe o seu e-mail e o conteúdo da mensagem (o link). Os
          envios saem por servidores em São Paulo.
        </li>
        <li>
          <b>Resend (feedback):</b> quando você manda feedback pelo formulário, o servidor do Pacto entrega por e-mail à equipe do projeto o
          assunto escolhido, o texto que você escreveu e a data. Não vão junto o seu e-mail, o seu nome, o seu perfil nem o identificador da
          sua conta, e o seu aplicativo de e-mail não é aberto. Só aparece o que você mesmo escrever no texto. O Resend guarda registros dos
          envios conforme a política dele, e a mensagem fica na caixa de e-mail da equipe enquanto for útil para responder ou corrigir o app.
        </li>
        <li>
          <b>GitHub (cópia de segurança):</b> uma vez por dia, uma cópia do banco de dados (contas, perfis, provas sem as fotos, testes, dívidas,
          tribunal) é cifrada antes de sair e guardada como arquivo privado no GitHub, que não consegue lê-la. Ela só serve para recuperar o
          app se o banco for perdido.
        </li>
      </ul>

      <h2>Por que usamos (bases legais)</h2>
      <ul>
        <li>Para o app funcionar como você pediu ao entrar num grupo: execução do serviço (LGPD, art. 7º, V).</li>
        <li>Para os avisos no aparelho: o seu consentimento, que você retira desativando os avisos.</li>
        <li>Para guardar o seu progresso no Aprender e retomá-lo em outro aparelho: execução do serviço (art. 7º, V).</li>
        <li>Para os cursos em vídeo: a sua escolha de carregar o player do YouTube, que trata os dados conforme os próprios termos.</li>
        <li>Para a segurança do app e para responder a problemas: legítimo interesse (art. 7º, IX).</li>
        <li>
          Para receber o feedback que você decide mandar e limitar os envios contra abuso: legítimo interesse (art. 7º, IX, e art. 10), só com
          a data e a hora de cada envio.
        </li>
        <li>
          Para saber se os grupos continuam usando o app (as datas de entrada e saída e as semanas com prova, descritas abaixo): legítimo
          interesse (art. 7º, IX, e art. 10), só com os dados estritamente necessários para isso.
        </li>
      </ul>

      <h2>Por quanto tempo</h2>
      <ul>
        <li>
          As fotos das provas ficam guardadas em tamanho original por {KEEP_FULL_DAYS} dias. Depois disso, só fica uma versão reduzida da
          primeira foto.
        </li>
        <li>
          PDFs e ZIPs também ficam guardados por {KEEP_FULL_DAYS} dias. Depois disso, o arquivo é apagado e só ficam o nome, o tipo e o
          tamanho, para a prova mostrar que ele existiu. Ao sair ou ser removido do grupo, os arquivos associados à sua conta são apagados junto.
        </li>
        <li>
          Quando você <b>sai do grupo</b> ou é removido, suas provas, fotos, dívidas e testes saem junto. Ficam no histórico do grupo, sem
          ligação com a sua conta, os pagamentos que você recebeu (com o seu nome, para o recibo de quem pagou continuar valendo), as
          acusações que você fez e os seus votos (sem o seu nome), para que decisões já tomadas não mudem.
        </li>
        <li>
          Também fica, sem o seu nome, e-mail ou ligação com a sua conta, um registro da sua passagem pelo grupo: o dia em que entrou, o dia
          em que saiu e em quais semanas você enviou provas ou cumpriu um dia. Ele serve só para medir se os grupos continuam usando o app,
          ninguém do grupo vê, e é apagado um ano depois da saída. Num grupo pequeno essas datas ainda podem lembrar quem foi, por isso o
          tratamos como dado pessoal.
        </li>
        <li>
          Quando você <b>exclui a conta</b>, acontece o mesmo, o seu nome sai dos recibos do grupo em que você está (eles passam a dizer
          “ex-membro”) e o seu login é apagado. Recibos de grupos de que você já tinha saído continuam com o seu nome, sem ligação com a sua
          conta, como no item acima.
        </li>
        <li>
          O progresso do <b>Aprender</b> fica enquanto a conta existir e é apagado junto quando você exclui a conta. Sair do grupo não o
          apaga, porque ele não é do grupo; para apagar só o progresso, use o contato abaixo.
        </li>
        <li>
          As datas dos envios de <b>feedback</b> são apagadas quando a sua conta passa 30 dias sem enviar nada, ou na hora, se você excluir a
          conta.
        </li>
        <li>
          As <b>cópias de segurança</b> do banco são apagadas 30 dias depois de feitas. Por isso, o que você apaga ou leva ao sair ainda pode
          existir numa cópia por até 30 dias, cifrada e sem uso, até ela expirar. Se uma cópia precisar ser usada para recuperar o app, o
          grupo é avisado, e quem tiver saído ou excluído a conta depois da data da cópia pode pedir a exclusão de novo pelo contato abaixo.
        </li>
      </ul>

      <h2>Seus direitos</h2>
      <p>Pela LGPD (art. 18) você pode, a qualquer momento e sem custo:</p>
      <ul>
        <li>confirmar se o Pacto trata dados seus e ter acesso a eles;</li>
        <li>corrigir dados incompletos ou errados (nome e foto, direto em Configurações);</li>
        <li>pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados fora da lei;</li>
        <li>pedir a portabilidade dos seus dados (uma cópia para levar a outro serviço);</li>
        <li>eliminar seus dados saindo do grupo ou excluindo a conta, em Configurações, sem precisar pedir para ninguém;</li>
        <li>saber com quem os seus dados são compartilhados (a lista acima);</li>
        <li>retirar o consentimento dos avisos (em Configurações ou no seu aparelho) e saber o que muda se não der o consentimento: só deixa de receber avisos.</li>
      </ul>
      <p>
        Para o que não está em Configurações, escreva para {contact}. Se você tem conta, também pode usar o formulário de{" "}
        <Link href="/feedback">feedback</Link> com o assunto “Privacidade e dados” (escreva no texto como prefere ser respondido). Se não for atendido, você pode reclamar à ANPD (gov.br/anpd) ou a um
        órgão de defesa do consumidor, como o Procon.
      </p>

      <h2>Menores de idade</h2>
      <p>
        O Pacto é feito para maiores de 18 anos. Crianças (menores de 12 anos) não podem usar: a lei exige um consentimento dos pais que o
        app não tem como verificar (LGPD, art. 14). Adolescentes (de 12 a 17 anos) só podem usar com a autorização de um responsável.
      </p>

      <h2>Segurança</h2>
      <p>
        Toda a comunicação é cifrada (HTTPS), as fotos ficam num armazenamento privado com links temporários e o banco de dados só entrega a
        cada pessoa os dados do próprio grupo. Nenhum sistema é perfeitamente seguro: se acontecer um incidente que possa trazer risco a você, avisaremos você e a ANPD (LGPD, art. 48).
      </p>

      <h2>Mudanças</h2>
      <p>
        Se esta política mudar, a data no topo muda e, se for algo importante, avisaremos no app. Veja também os{" "}
        <Link href="/termos">termos de uso</Link>.
      </p>
    </>
  );
}
