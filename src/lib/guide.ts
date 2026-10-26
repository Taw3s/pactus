// The judge's guide: fixed questions and answers about the app's rules. Every answer mirrors the
// code (database triggers, src/lib/ranking.ts, src/lib/ledger.ts): change both together.
import { SCORING } from "./ranking";
import { MAX_EXTRA_SESSIONS, MAX_PHOTOS, MIN_EXTRA_MINUTES, MIN_STUDY_MINUTES, MIN_SUMMARY } from "./types";

export interface GuideEntry {
  id: string;
  q: string;
  a: string[];
}

export const GUIDE: GuideEntry[] = [
  {
    id: "metas",
    q: "O que preciso fazer todo dia?",
    a: [
      `Três metas: estudo (foto + mínimo ${MIN_STUDY_MINUTES} min + um resumo de pelo menos ${MIN_SUMMARY} caracteres), digitação (um teste de 1 minuto aqui no app) e leitura (foto + páginas lidas).`,
      "O prazo é 23:59, horário de São Paulo. O dia só vale com as três.",
      `Cada prova com foto aceita até ${MAX_PHOTOS} fotos. Na leitura, a página inicial e a final bastam.`,
      "Na digitação você tem 3 tentativas por dia: a primeira já cumpre a meta, e vale a melhor.",
      "No teste dá para escolher Palavras (aleatórias) ou Texto: explicações curtas sobre programação, SQL, Python, JavaScript e web. Cada texto continua de onde você parou no teste anterior.",
    ],
  },
  {
    id: "divida",
    q: "Quando eu fico devendo?",
    a: [
      "Cada dia sem as três metas, fora da sua folga e a partir do dia em que você entrou, vale 1 Coca + 1 salgado.",
      "Quem recebe marca como pago na aba Dívidas. Ninguém marca a própria dívida.",
    ],
  },
  {
    id: "folga",
    q: "Como funciona a folga?",
    a: [
      "Você tem 1 dia de folga por semana. Nele, nada é obrigatório, mas o que você enviar conta no ranking.",
      "Troque em Configurações. A troca vale a partir da próxima segunda, para ninguém mudar a regra no meio da semana.",
    ],
  },
  {
    id: "tribunal",
    q: "Como funciona o tribunal?",
    a: [
      "Qualquer pessoa do grupo pode contestar uma prova de hoje ou de ontem. Quem acusa já conta como um voto para anular.",
      "Votam todos menos o dono da prova, sempre com um motivo. O dono pode se defender uma vez.",
      "Anula ou mantém quem chegar primeiro à maioria absoluta dos jurados. Depois de 72 h, vale a maioria dos votos dados; empate mantém a prova.",
    ],
  },
  {
    id: "juiz",
    q: "O que eu (o Juiz IA) faço?",
    a: [
      "Eu confiro as fotos de cada prova. Se algo não bate, levo ao tribunal.",
      "Eu nunca voto e nunca condeno sozinho: quem decide é o grupo. Posso errar, então a análise é só um ponto de partida.",
    ],
  },
  {
    id: "refazer",
    q: "Minha prova foi anulada. E agora?",
    a: [
      "Se a prova for anulada no mesmo dia, você pode mandar uma nova até 23:59 na tela Hoje, e a meta volta a valer.",
      "Depois da meia-noite não dá mais: o dia fica sem a meta.",
    ],
  },
  {
    id: "extra",
    q: "Estudei mais de uma vez. Dá para somar?",
    a: [
      `Sim. Depois da prova de estudo, use "Sessão extra de estudo": foto + pelo menos ${MIN_EXTRA_MINUTES} min, até ${MAX_EXTRA_SESSIONS} por dia.`,
      "As sessões extras somam minutos no ranking, mas não substituem a prova principal.",
    ],
  },
  {
    id: "ranking",
    q: "Como funciona o ranking?",
    a: [
      `Dia cumprido: ${SCORING.completedDay} pontos. Estudo: ${SCORING.perStudyMinute} ponto por minuto (até ${SCORING.maxStudyMinutesPerDay} min por dia). Leitura: ${SCORING.perPage} pontos por página (até ${SCORING.maxPagesPerDay} por dia). Digitação: o melhor teste do dia vale WPM × precisão (60 WPM com 95% = 57). Projeto: ${SCORING.perProject} pontos.`,
      "Os recordes de digitação ficam separados entre PC e celular, e entre Palavras e Texto. Para os pontos do dia vale o melhor teste, de qualquer modo.",
      "Provas anuladas pelo tribunal não contam. O ranking recomeça todo mês.",
    ],
  },
  {
    id: "bau",
    q: "Como ganho baús?",
    a: [
      "Fechou as três metas do dia: abre o baú do dia, com um item comum, raro ou lendário para a sua coleção.",
      "Desafio da semana: se todos que estavam no grupo na segunda fecharem 5 dias até domingo, cada um abre um baú raro ou melhor.",
    ],
  },
  {
    id: "carimbos",
    q: "Para que servem os carimbos?",
    a: [
      "Na página da prova de um amigo, carimbe Respeito, Monstro ou Lenda. O grupo vê quem carimbou e o feed mostra o total.",
      "Carimbo é só elogio. Desconfiou da prova? Isso é com o tribunal.",
    ],
  },
  {
    id: "foto-antiga",
    q: "O que é o aviso de foto antiga?",
    a: [
      "O celular guarda quando cada foto foi tirada. Se a foto é de antes do dia da prova, todos veem algo como \"Foto de 3 dias atrás\".",
      "Não bloqueia nada: a data pode estar errada (prints, fotos editadas). Serve para o grupo conferir e, se quiser, levar ao tribunal.",
    ],
  },
  {
    id: "avisos",
    q: "Como recebo avisos?",
    a: [
      'Em Configurações, toque em "Ativar avisos neste aparelho". O app lembra às 20h quem ainda tem meta pendente e manda um resumo da semana no domingo às 21h.',
      "No iPhone, os avisos só funcionam com o app instalado na Tela de Início (Compartilhar → Adicionar à Tela de Início).",
    ],
  },
];
