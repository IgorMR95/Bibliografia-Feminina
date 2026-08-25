/**
 * Suporte a exibicao dentro de um iframe (a pagina do WordPress da USP).
 *
 * Resolve os dois defeitos classicos de embutir uma SPA:
 *
 *  1. altura — em vez de fixar 100vh e deixar duas barras de rolagem, o app
 *     mede a propria altura e avisa a pagina hospedeira, que redimensiona o
 *     iframe. Da' a impressao de conteudo nativo.
 *  2. link direto — a URL do navegador continua sendo a do WordPress, entao
 *     a rota interna e' espelhada no hash do endereco do pai. Assim
 *     .../base/#/consulta/<id> abre direto a ficha, e o botao voltar do
 *     navegador funciona.
 *
 * Mensagens trocadas (sempre com o prefixo bpf: para nao colidir com outros
 * scripts do WordPress):
 *   app  -> pai : { tipo: "bpf:altura", altura }
 *   app  -> pai : { tipo: "bpf:rota", rota }
 *   pai  -> app : { tipo: "bpf:ir", rota }
 */

const PREFIXO = "bpf:";

/** origens autorizadas a mandar comandos de navegacao para o app */
const ORIGENS_CONFIAVEIS = [
  "https://sites.usp.br",
  "https://www.usp.br",
];

export const dentroDeIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    // acesso negado ao top ja significa que estamos aninhados
    return true;
  }
};

/** origem da pagina que nos hospeda, deduzida do referrer */
function origemDoPai(): string {
  try {
    if (document.referrer) return new URL(document.referrer).origin;
  } catch { /* referrer vazio ou malformado */ }
  return "*";
}

function enviar(mensagem: Record<string, unknown>) {
  if (!dentroDeIframe()) return;
  try {
    window.parent.postMessage({ ...mensagem }, origemDoPai());
  } catch { /* pai pode ter sumido */ }
}

/** avisa a altura do conteudo sempre que ela muda */
export function observarAltura(): () => void {
  if (!dentroDeIframe()) return () => {};

  let ultima = 0;
  const medir = () => {
    const alvo = document.documentElement;
    // scrollHeight do html cobre margens colapsadas melhor que o do body
    const altura = Math.ceil(Math.max(alvo.scrollHeight, document.body.scrollHeight));
    // ruido de 1-2px em cada frame faria o iframe tremer
    if (Math.abs(altura - ultima) < 4) return;
    ultima = altura;
    enviar({ tipo: `${PREFIXO}altura`, altura });
  };

  const ro = new ResizeObserver(medir);
  ro.observe(document.documentElement);
  ro.observe(document.body);

  // imagens e fontes mudam a altura depois do primeiro paint
  window.addEventListener("load", medir);
  const timers = [100, 400, 1200, 2500].map((t) => window.setTimeout(medir, t));

  medir();

  return () => {
    ro.disconnect();
    window.removeEventListener("load", medir);
    timers.forEach(clearTimeout);
  };
}

/** informa ao pai a rota atual, para ele espelhar no proprio endereco */
export function anunciarRota(rota: string) {
  enviar({ tipo: `${PREFIXO}rota`, rota });
}

/**
 * Escuta pedidos de navegacao vindos da pagina hospedeira.
 * Devolve a funcao de limpeza.
 */
export function ouvirNavegacao(ir: (rota: string) => void): () => void {
  if (!dentroDeIframe()) return () => {};

  const aoReceber = (e: MessageEvent) => {
    if (!ORIGENS_CONFIAVEIS.includes(e.origin)) return;
    const dados = e.data;
    if (!dados || typeof dados !== "object") return;
    if (dados.tipo !== `${PREFIXO}ir`) return;

    const rota = String(dados.rota ?? "");
    // so caminhos internos: bloqueia //evil.com e javascript:
    if (!rota.startsWith("/") || rota.startsWith("//")) return;
    ir(rota);
  };

  window.addEventListener("message", aoReceber);
  return () => window.removeEventListener("message", aoReceber);
}
