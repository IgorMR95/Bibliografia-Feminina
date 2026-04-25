import { GraduationCap } from "lucide-react";

export const Idealizadoras = () => {
  const perfis = [
    {
      nome: "Prof. Dra. Ana Cecília",
      titulo: "Doutora e Mestra em Direito Processual Civil",
      bio: "Pesquisadora dedicada à efetividade da tutela jurisdicional e a representatividade de gênero em espaços acadêmicos de tomada de decisão. Idealizadora do levantamento dogmático feminino.",
      img: "AC"
    },
    {
      nome: "Prof. Ma. Beatriz de Souza",
      titulo: "Mestra em Direito, Professora Universitária",
      bio: "Foca suas pesquisas na interseccionalidade entre acesso à justiça coletiva e a inserção da mulher no ambiente jurídico brasileiro. Coordena os esforços de estruturação de dados.",
      img: "BS"
    },
    {
      nome: "Prof. Dra. Camila Fernandes",
      titulo: "Pós-doutoranda, Autora de Obras Jurídicas",
      bio: "Com vasta experiência no magistério superior, atua na disseminação do projeto e no fomento ao ingresso de jovens acadêmicas na pesquisa de Processo Civil.",
      img: "CF"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 fade-in">
      <div className="text-center py-10">
        <h1 className="text-4xl font-serif italic text-[var(--text-main)] mb-4">Idealizadoras</h1>
        <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
          Conheça as pesquisadoras que lideram e coordenam este observatório de Processo Civil brasileiro.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {perfis.map((p, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col group hover:border-[var(--accent)] transition-colors">
            <div className="h-32 bg-[var(--sidebar)] w-full flex items-end justify-center relative">
              {/* placeholder para foto */}
              <div className="w-24 h-24 rounded-full bg-[var(--text-main)] border-4 border-white absolute -bottom-12 flex items-center justify-center text-white text-2xl font-serif italic shadow-sm group-hover:bg-[var(--accent)] transition-colors">
                {p.img}
              </div>
            </div>
            
            <div className="pt-16 pb-8 px-6 text-center flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">{p.nome}</h3>
              <p className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-wider mb-4">{p.titulo}</p>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {p.bio}
              </p>
              
              <div className="mt-auto pt-6 flex justify-center">
                <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center text-xs font-bold uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Ver Lattes
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
