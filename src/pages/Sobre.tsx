import { BookMarked } from "lucide-react";

export const Sobre = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 fade-in">
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="p-10 md:p-16 border-b border-[var(--border)] bg-[var(--nav-active)] text-center">
          <BookMarked className="w-12 h-12 text-[var(--accent)] mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-serif italic text-[var(--text-main)] mb-4">Sobre o Projeto</h1>
          <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
            Por que mapear autoras de Processo Civil e qual a importância bibliométrica deste levamento?
          </p>
        </div>
        
        <div className="p-10 md:p-16 space-y-8 text-[var(--text-main)] leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold mb-4">A Invisibilidade Histórica</h2>
            <p className="mb-4 text-[var(--text-muted)]">
              Historicamente, as áreas dogmáticas do Direito, especialmente o Direito Processual Civil, foram construídas e dominadas por figuras masculinas. Essa hegemonia reflete-se não apenas nos espaços de poder das universidades e tribunais, mas sobretudo na bibliografia utilizada nos cursos de graduação e pós-graduação.
            </p>
            <p className="text-[var(--text-muted)]">
              É comum que ementas de disciplinas e citações em decisões judiciais reproduzam quase que exclusivamente autores homens, criando a falsa impressão de que inexiste produção acadêmica feminina qualificada em Processo Civil.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">O Que Buscamos</h2>
            <ul className="space-y-4 text-[var(--text-muted)] list-disc pl-5">
              <li>
                <strong className="text-[var(--text-main)]">Mapeamento Empírico:</strong> Levantar quem são as processualistas, onde dão aulas, quais suas temáticas de pesquisa no mestrado e doutorado.
              </li>
              <li>
                <strong className="text-[var(--text-main)]">Fomento à Citação:</strong> Oferecer à comunidade jurídica um banco de dados publicamente acessível para que pesquisadores(as), professores(as) e magistrados(as) encontrem obras escritas por mulheres para embasar trabalhos e decisões.
              </li>
              <li>
                <strong className="text-[var(--text-main)]">Fortalecimento Institucional:</strong> Evidenciar o papel da mulher em institutos acadêmicos de relevância como o Instituto Brasileiro de Direito Processual (IBDP) e a Associação Brasileira de Direito Processual (ABEP).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Impacto e Metodologia</h2>
            <p className="text-[var(--text-muted)] mb-4">
              O projeto se baseia na coleta ativa (via consulta a currículos Lattes e bases institucionais) e alimentações orgânicas indicadas pelas próprias autoras e núcleos de apoio acadêmico. 
            </p>
            <p className="text-[var(--text-muted)]">
              Ao dispor as informações em dashboards e mecanismos de busca organizados por área temática e Unidade Federativa, nós permitimos que o Processo Civil brasileiro conheça sua pluralidade e riqueza.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
