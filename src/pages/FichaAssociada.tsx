import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, GraduationCap, MapPin, Mail, Building2, Loader2 } from "lucide-react";
import { getAssociada, getObrasDe, Associada, Obra, Titulacao } from "../lib/base";

/**
 * Ficha pública de uma processualista, lida da base estática.
 *
 * A edição saiu daqui: a fonte da base passou a ser a planilha do
 * repositório, então alterar um registro pelo site não teria efeito — o
 * caminho de correção é atualizar a planilha e regerar os dados.
 */

const Secao = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="bg-white rounded-xl border border-[var(--border)] p-6">
    <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] mb-4">
      {titulo}
    </h2>
    {children}
  </section>
);

const Campo = ({ rotulo, valor }: { rotulo: string; valor?: string | null }) => {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{rotulo}</dt>
      <dd className="text-[14px] text-[var(--text-main)] mt-0.5 leading-relaxed">{valor}</dd>
    </div>
  );
};

const BlocoTitulacao = ({ nome, t }: { nome: string; t: Titulacao | null }) => {
  if (!t) return null;
  const temAlgo = t.titulo || t.ano || t.faculdade || t.area || t.link;
  if (!temAlgo) return null;

  return (
    <div className="border-l-2 border-[var(--nav-active)] pl-4 py-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--heading)]">{nome}</p>
      {t.titulo && <p className="text-[14px] text-[var(--text-main)] mt-1 leading-relaxed">{t.titulo}</p>}
      <p className="text-[12px] text-[var(--text-muted)] mt-1">
        {[t.faculdade, t.ano, t.area].filter(Boolean).join(" · ")}
      </p>
      {t.link && (
        <a href={t.link} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[12px] text-[var(--accent)] hover:underline mt-1.5">
          <ExternalLink className="w-3 h-3" /> acessar o trabalho
        </a>
      )}
    </div>
  );
};

export const FichaAssociada = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pessoa, setPessoa] = useState<Associada | null>(null);
  const [obras, setObras] = useState<Obra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoObras, setCarregandoObras] = useState(true);

  useEffect(() => {
    if (!id) return;
    setCarregando(true);
    getAssociada(id)
      .then(setPessoa)
      .catch(() => setPessoa(null))
      .finally(() => setCarregando(false));

    // a bibliografia é o arquivo pesado: carrega em separado, para os dados
    // da pessoa aparecerem sem esperar por ela
    setCarregandoObras(true);
    getObrasDe(id)
      .then(setObras)
      .catch(() => setObras([]))
      .finally(() => setCarregandoObras(false));
  }, [id]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--text-muted)]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
      </div>
    );
  }

  if (!pessoa) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <p className="text-[var(--text-muted)] mb-6">Processualista não encontrada.</p>
        <Link to="/consulta" className="text-[var(--accent)] font-semibold hover:underline">
          Voltar para a consulta
        </Link>
      </div>
    );
  }

  const porAno = [...obras].sort((a, b) => {
    const sa = /^\d{4}$/.test(a.ano) ? 0 : 1;
    const sb = /^\d{4}$/.test(b.ano) ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return b.ano.localeCompare(a.ano);
  });

  const titulos = [
    pessoa.livreDocente && "Livre-Docente",
    pessoa.doutora && "Doutora",
    pessoa.mestre && "Mestre",
    pessoa.especialista && "Especialista",
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20 fade-in">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent)]"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <header className="bg-white rounded-xl border border-[var(--border)] p-7">
        <h1 className="text-[28px] font-serif font-bold text-[var(--heading)] leading-tight">
          {pessoa.nome}
        </h1>

        {pessoa.incompleto && (
          <p className="mt-3 text-[12px] text-[var(--warning)] bg-[var(--warning-bg)] rounded-lg px-3 py-2 inline-block">
            Registro incompleto: esta pesquisadora aparece na bibliografia, mas ainda não tem
            ficha preenchida no levantamento.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[var(--text-muted)]">
          {pessoa.uf && <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{pessoa.uf}</span>}
          {pessoa.atuacao && <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{pessoa.atuacao}</span>}
          {pessoa.email && (
            <a href={`mailto:${pessoa.email}`} className="inline-flex items-center gap-1.5 hover:text-[var(--accent)]">
              <Mail className="w-3.5 h-3.5" />{pessoa.email}
            </a>
          )}
          {pessoa.lattes && (
            <a href={pessoa.lattes} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--accent)] hover:underline">
              <GraduationCap className="w-3.5 h-3.5" /> Currículo Lattes
            </a>
          )}
        </div>

        {(titulos.length > 0 || pessoa.ibdp || pessoa.abep || pessoa.ranking40) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {titulos.map((t) => (
              <span key={t} className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[var(--nav-active)] text-[var(--accent)]">
                {t}
              </span>
            ))}
            {pessoa.ibdp && <span className="px-2.5 py-1 text-[11px] font-semibold rounded border border-[var(--border)] text-[var(--text-muted)]">IBDP</span>}
            {pessoa.abep && <span className="px-2.5 py-1 text-[11px] font-semibold rounded border border-[var(--border)] text-[var(--text-muted)]">ABEP</span>}
            {pessoa.ranking40 && <span className="px-2.5 py-1 text-[11px] font-semibold rounded border border-[var(--border)] text-[var(--text-muted)]">Ranking 40+</span>}
          </div>
        )}
      </header>

      {(pessoa.instituicao || pessoa.lattesAtualizado) && (
        <Secao titulo="Atuação">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Campo rotulo="Instituição de ensino" valor={pessoa.instituicao} />
            <Campo
              rotulo="Lattes atualizado em"
              valor={pessoa.lattesAtualizado
                ? new Date(pessoa.lattesAtualizado + "T12:00:00").toLocaleDateString("pt-BR")
                : null}
            />
          </dl>
        </Secao>
      )}

      {(pessoa.mestrado || pessoa.doutorado || pessoa.livreDocencia) && (
        <Secao titulo="Titulação">
          <div className="space-y-5">
            <BlocoTitulacao nome="Mestrado" t={pessoa.mestrado} />
            <BlocoTitulacao nome="Doutorado" t={pessoa.doutorado} />
            <BlocoTitulacao nome="Livre-Docência" t={pessoa.livreDocencia} />
          </div>
        </Secao>
      )}

      <Secao titulo={`Produção bibliográfica${obras.length ? ` · ${obras.length}` : ""}`}>
        {carregandoObras ? (
          <p className="text-[13px] text-[var(--text-muted)] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando obras…
          </p>
        ) : porAno.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">
            Nenhuma obra registrada para esta pesquisadora no levantamento.
          </p>
        ) : (
          <ul className="space-y-4">
            {porAno.map((o) => (
              <li key={o.id} className="border-l-2 border-[var(--border)] pl-4">
                <p className="text-[14px] text-[var(--text-main)] leading-relaxed">{o.citacao}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-[var(--text-muted)]">
                    {o.ano === "s/d" ? "sem data" : o.ano}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[var(--nav-active)] text-[var(--accent)] font-medium">
                    {o.tipo}
                  </span>
                  <span className="px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)]">
                    {o.area}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
};
