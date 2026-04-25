import { ArrowRight, BookOpen, Search, Map, Users } from "lucide-react";
import { Link } from "react-router-dom";

export const Home = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-20 fade-in">
      {/* Hero Section */}
      <section className="text-center pt-16 pb-8">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--nav-active)] text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-6">
          Projeto Acadêmico
        </div>
        <h1 className="text-4xl md:text-6xl font-serif italic text-[var(--text-main)] max-w-4xl mx-auto leading-tight mb-6">
          Mapeamento das Autoras Mulheres no Processo Civil Brasileiro
        </h1>
        <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed mb-10">
          Um projeto dedicado a visibilizar a produção acadêmica de mulheres na área processual, 
          rompendo barreiras históricas e criando uma rede de referências no Brasil.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/consulta" className="px-8 py-3 bg-[var(--accent)] text-white font-bold rounded-lg hover:bg-[var(--accent-hover)] transition-colors inline-flex items-center shadow-lg">
            Acessar a Base de Dados
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
          <Link to="/sobre" className="px-8 py-3 bg-white text-[var(--text-main)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--row-hover)] transition-colors inline-flex items-center">
            Conhecer o Projeto
          </Link>
        </div>
      </section>

      {/* Como Funciona / Pilares */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10">
        <div className="bg-white p-8 rounded-2xl border border-[var(--border)] shadow-sm text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-[var(--nav-active)] rounded-full flex items-center justify-center mb-6">
            <Map className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">Mapeamento</h3>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            Coletamos dados geográficos e institucionais para entender onde estão as pesquisadoras de processo no país.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-[var(--border)] shadow-sm text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-[var(--nav-active)] rounded-full flex items-center justify-center mb-6">
            <BookOpen className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">Produção</h3>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            Catalogamos teses, dissertações e áreas específicas de estudo para facilitar a citação de obras femininas.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-[var(--border)] shadow-sm text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-[var(--nav-active)] rounded-full flex items-center justify-center mb-6">
            <Users className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">Rede</h3>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            Consolidamos informações sobre participação em associações (IBDP, ABEP) e formação de novas redes de contato.
          </p>
        </div>
      </section>
      
      {/* Mini CTA Panel */}
      <section className="bg-[var(--sidebar)] border border-[var(--border)] rounded-2xl p-10 md:p-14 text-center">
        <h2 className="text-2xl md:text-3xl font-serif italic text-[var(--text-main)] mb-4">Contribua com a Pesquisa</h2>
        <p className="text-[var(--text-muted)] max-w-2xl mx-auto mb-8">
          A base de dados cresce a partir de contribuições colaborativas e pesquisa ativa. 
          Você pode buscar referências bibliográficas para sua pesquisa ou enviar novas sugestões.
        </p>
        <Link to="/dashboards" className="font-bold text-[var(--accent)] hover:text-black transition flex items-center justify-center">
          Ver Estatísticas Iniciais <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </section>

    </div>
  );
};
