import { GraduationCap } from "lucide-react";
import { usePagina, useMembros, iniciais, Membro } from "../lib/conteudo";
import { Markdown } from "../lib/markdown";

/**
 * As fotos que vieram do site da USP ja eram circulos sobre fundo branco;
 * a do Igor era um retrato retangular. Todas foram normalizadas para
 * quadrados de 420px e sao exibidas em moldura circular, para o grupo
 * ficar uniforme independente da origem de cada imagem.
 */
const Retrato = ({ m, tamanho = "grande" }: { m: Membro; tamanho?: "grande" | "medio" }) => {
  const dim = tamanho === "grande" ? "w-32 h-32" : "w-20 h-20";
  const fonte = tamanho === "grande" ? "text-2xl" : "text-base";

  return (
    <div className={`${dim} rounded-full overflow-hidden ring-1 ring-[var(--border)] bg-[var(--nav-active)] shrink-0`}>
      {m.foto_url ? (
        <img
          src={m.foto_url}
          alt={m.nome}
          width={420}
          height={420}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${fonte} font-serif font-semibold text-[var(--accent)]`}>
          {iniciais(m.nome)}
        </div>
      )}
    </div>
  );
};

const CartaoPessoa = ({ m }: { m: Membro }) => (
  <div className="bg-white rounded-xl border border-[var(--border)] p-6 flex flex-col items-center text-center transition-colors hover:border-[var(--heading)]">
    <Retrato m={m} />
    <h3 className="mt-5 font-serif font-semibold text-[var(--text-main)] leading-snug text-[15px]">
      {m.nome}
    </h3>
    {m.funcao && (
      <p className="mt-1.5 text-[13px] text-[var(--text-muted)] leading-relaxed">{m.funcao}</p>
    )}
    {m.bio && (
      <p className="mt-3 text-[13px] text-[var(--text-muted)] leading-relaxed">{m.bio}</p>
    )}
    {m.lattes_url && (
      <a
        href={m.lattes_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)] hover:text-[var(--heading)] inline-flex items-center gap-1.5"
      >
        <GraduationCap className="w-3.5 h-3.5" />
        Lattes
      </a>
    )}
  </div>
);

const Chip = ({ m }: { m: Membro }) => (
  <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-white px-3.5 py-3">
    <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--nav-active)] flex items-center justify-center text-[11px] font-semibold text-[var(--accent)] overflow-hidden">
      {m.foto_url
        ? <img src={m.foto_url} alt={m.nome} loading="lazy" className="w-full h-full object-cover" />
        : iniciais(m.nome)}
    </div>
    <p className="text-[13px] text-[var(--text-main)] leading-snug">{m.nome}</p>
  </div>
);

export const QuemSomos = () => {
  const { pagina } = usePagina("quem-somos");
  const { grupos, carregando } = useMembros();

  return (
    <div className="max-w-5xl mx-auto pb-24 fade-in">
      <header className="pt-12 pb-10 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-4">
          Grupo de pesquisa
        </p>
        <h1 className="text-4xl md:text-[2.75rem] font-serif font-bold text-[var(--heading)] leading-tight">
          {pagina?.titulo ?? "Quem Somos"}
        </h1>
        {pagina?.subtitulo && (
          <p className="mt-4 text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            {pagina.subtitulo}
          </p>
        )}
      </header>

      {pagina?.conteudo && (
        <div className="max-w-3xl mx-auto mb-16 rounded-xl border border-[var(--border)] bg-white p-8 md:p-10">
          <Markdown texto={pagina.conteudo} />
        </div>
      )}

      {carregando ? (
        <p className="text-center text-[var(--text-muted)] py-16">Carregando equipe…</p>
      ) : (
        <div className="space-y-14">
          {grupos.map((g) => {
            const comFoto = g.membros.some((m) => m.foto_url);
            return (
              <section key={g.nome}>
                <div className="flex items-baseline gap-4 mb-6">
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.15em] text-[var(--accent)] whitespace-nowrap">
                    {g.nome}
                  </h2>
                  <span className="h-px flex-1 bg-[var(--border)]" />
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">{g.membros.length}</span>
                </div>

                {comFoto ? (
                  <div
                    className={`grid gap-5 ${
                      g.membros.length === 1
                        ? "max-w-xs"
                        : g.membros.length === 2
                        ? "sm:grid-cols-2 max-w-2xl"
                        : "sm:grid-cols-2 lg:grid-cols-4"
                    }`}
                  >
                    {g.membros.map((m) => <CartaoPessoa key={m.id} m={m} />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {g.membros.map((m) => <Chip key={m.id} m={m} />)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
