import { ArrowRight, BookOpen, Users, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { usePagina, useNumerosHome } from "../lib/conteudo";
import { Markdown } from "../lib/markdown";

const Numero = ({ valor, rotulo }: { valor?: number; rotulo: string }) => (
  <div className="text-center px-4 py-6">
    <div className="text-3xl md:text-4xl font-serif text-[var(--accent)] tabular-nums">
      {valor === undefined ? "—" : valor.toLocaleString("pt-BR")}
    </div>
    <div className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider mt-2">
      {rotulo}
    </div>
  </div>
);

export const Home = () => {
  const { pagina } = usePagina("home");
  const n = useNumerosHome();

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-20 fade-in">
      {/* abertura */}
      <section className="text-center pt-16 pb-4">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--nav-active)] text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-6">
          Faculdade de Direito · USP
        </div>
        <h1 className="text-4xl md:text-6xl font-serif italic text-[var(--text-main)] max-w-4xl mx-auto leading-tight mb-6">
          {pagina?.titulo ?? "Bibliografia Processual Feminina"}
        </h1>
        {pagina?.subtitulo && (
          <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed mb-10">
            {pagina.subtitulo}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/consulta"
            className="px-8 py-3 bg-[var(--accent)] text-white font-bold rounded-lg hover:bg-[var(--accent-hover)] transition-colors inline-flex items-center shadow-lg"
          >
            Acessar a Base de Dados
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
          <Link
            to="/sobre"
            className="px-8 py-3 bg-white text-[var(--text-main)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--row-hover)] transition-colors inline-flex items-center"
          >
            Conhecer o Projeto
          </Link>
        </div>
      </section>

      {/* numeros vivos: o que a base realmente tem hoje */}
      <section className="bg-white border border-[var(--border)] rounded-2xl shadow-sm divide-y md:divide-y-0 md:divide-x divide-[var(--border)] grid grid-cols-2 md:grid-cols-5">
        <Numero valor={n?.processualistas} rotulo="Processualistas" />
        <Numero valor={n?.producoes} rotulo="Produções" />
        <Numero valor={n?.mestrados} rotulo="Mestrados" />
        <Numero valor={n?.doutorados} rotulo="Doutorados" />
        <Numero valor={n?.livre_docencias} rotulo="Livre-docências" />
      </section>

      {/* texto institucional, editavel pelo painel */}
      {pagina?.conteudo && (
        <section className="max-w-3xl mx-auto bg-white rounded-2xl border border-[var(--border)] shadow-sm p-8 md:p-12">
          <Markdown texto={pagina.conteudo} />
        </section>
      )}

      {/* caminhos */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { to: "/consulta", Icone: BookOpen, titulo: "Consultar a base", texto: "Busque processualistas por nome, estado, titulação e área do processo, e chegue às obras publicadas." },
          { to: "/metodologia", Icone: FlaskConical, titulo: "Metodologia", texto: "As cinco etapas do levantamento, os recortes adotados e os desafios enfrentados pelo grupo." },
          { to: "/quem-somos", Icone: Users, titulo: "Quem somos", texto: "A coordenação, a organização e as alunas e alunos que conduziram a pesquisa." },
        ].map(({ to, Icone, titulo, texto }) => (
          <Link
            key={to}
            to={to}
            className="bg-white p-8 rounded-2xl border border-[var(--border)] shadow-sm text-center flex flex-col items-center hover:border-[var(--accent)] transition-colors group"
          >
            <div className="w-14 h-14 bg-[var(--nav-active)] rounded-full flex items-center justify-center mb-6">
              <Icone className="w-7 h-7 text-[var(--accent)]" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">{titulo}</h3>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">{texto}</p>
            <span className="mt-4 text-[var(--accent)] text-xs font-bold uppercase tracking-wider inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              Ver <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
};
