import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { api } from "../lib/api";
import { UploadCloud, CheckCircle, Plus, Trash2 } from "lucide-react";
import { ProducaoForm } from "../components/ProducaoForm";
import { BatchImportTab } from "../components/BatchImportTab";

export const Alimentacao = () => {
  const [tab, setTab] = useState<"MANUAL" | "EXCEL" | "PRODUCAO" | "DOCS">("MANUAL");
  const [camposExtras, setCamposExtras] = useState<any[]>([]);
  
  useEffect(() => {
    api.get("/dynamic/campos-extras?entidade=Associada").then(res => setCamposExtras(res.data)).catch(console.error);
  }, []);

  const { register, handleSubmit, reset, watch, control, formState: { isSubmitting } } = useForm<any>({
    defaultValues: {
      ibdp: false, abep: false,
      leciona: false,
      vinculos_docentes: [],
      especialista: false, mestre: false, doutora: false, livre_docente: false
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "vinculos_docentes"
  });

  const [tabelas, setTabelas] = useState<any[]>([]);
  const [selectedTabela, setSelectedTabela] = useState<any>(null);
  const [registroDinamico, setRegistroDinamico] = useState<any>({});

  useEffect(() => {
    api.get("/dynamic/tabelas").then(res => setTabelas(res.data)).catch(console.error);
  }, []);

  const leciona = watch("leciona");
  const is_mestre = watch("mestre");
  const is_doutora = watch("doutora");
  const is_livre_docente = watch("livre_docente");

  const onSubmitManual = async (data: any, e: any, keepOpen = false) => {
    try {
      if(!data.email) delete data.email;
      
      const dynamicObject: any = {};
      camposExtras.forEach(c => {
         if (data[c.nome_campo] !== undefined) {
           dynamicObject[c.nome_campo] = data[c.nome_campo];
           delete data[c.nome_campo];
         }
      });
      data.dados_dinamicos = JSON.stringify(dynamicObject);

      await api.post("/associadas", data);
      alert("Processualista salva com sucesso!");
      reset();
    } catch {
      alert("Erro ao salvar registro");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
       <div className="flex space-x-1 border-b border-[var(--border)] overflow-x-auto whitespace-nowrap">
         <button onClick={() => setTab("MANUAL")} className={`px-5 py-3 font-medium text-sm transition-colors ${tab === "MANUAL" ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>
           Aba 1 - Processualista (Base)
         </button>
         <button onClick={() => setTab("PRODUCAO")} className={`px-5 py-3 font-medium text-sm transition-colors ${tab === "PRODUCAO" ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>
           Aba 2 - Produção Bibliográfica
         </button>
         <button onClick={() => setTab("EXCEL")} className={`px-5 py-3 font-medium text-sm transition-colors ${tab === "EXCEL" ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>
           Importação em Lote
         </button>
         <button onClick={() => setTab("DOCS")} className={`px-5 py-3 font-medium text-sm transition-colors ${tab === "DOCS" ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>
           Documentação da Base
         </button>
       </div>

       {tab === "EXCEL" && <div className="animate-in fade-in slide-in-from-bottom-4"><BatchImportTab /></div>}

       {tab === "DOCS" && (
         <div className="bg-white p-8 rounded-xl border border-[var(--border)] shadow-sm animate-in fade-in slide-in-from-bottom-4 space-y-8">
            <div>
              <h2 className="text-2xl font-serif italic text-[var(--accent)] mb-4">Estrutura da Base de Dados</h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Este sistema foi projetado para mapear a produção e o perfil das processualistas no Brasil. 
                Abaixo está o detalhamento de como os dados são organizados para facilitar a alimentação e a consulta.
              </p>
            </div>

            <div className="space-y-6">
              <div className="border-l-4 border-[var(--accent)] pl-4 py-2">
                <h3 className="font-bold text-[var(--text-main)]">1. Tabela de Processualistas (Base)</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">É o cadastro central. Cada registro representa uma pessoa única.</p>
                <ul className="mt-4 space-y-3">
                  <li className="text-xs"><strong>Campos de Identificação:</strong> Nome completo, Email, UF de atuação principal e Atuação Profissional.</li>
                  <li className="text-xs"><strong>Titulação:</strong> Mapeia Mestrado, Doutorado e Livre-Docência.</li>
                  <li className="text-xs"><strong>Vínculos Docentes:</strong> Mapeia as instituições onde a profissional leciona. É possível adicionar múltiplas instituições tanto para Graduação quanto para Pós-Graduação.</li>
                  <li className="text-xs"><strong>Ranking 40+:</strong> Para cada instituição cadastrada, deve-se marcar se ela integra o ranking das 40 melhores do Brasil.</li>
                </ul>
              </div>

              <div className="border-l-4 border-emerald-600 pl-4 py-2">
                <h3 className="font-bold text-[var(--text-main)]">2. Produção Bibliográfica</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Armazena as obras publicadas (Pós-2015). Uma processualista pode ter múltiplas produções.</p>
                <ul className="mt-4 space-y-3">
                  <li className="text-xs"><strong>Tipos de Obra:</strong> Artigo, Livro, Capítulo de Livro, Anais de Eventos ou Coluna.</li>
                  <li className="text-xs"><strong>Citação Completa:</strong> Formato ABNT preferencial para referência rápida.</li>
                  <li className="text-xs"><strong>Áreas do Processo:</strong> Categorização temática (Civil, Penal, Trabalhista, etc) para filtros estatísticos.</li>
                </ul>
              </div>

              <div className="border-l-4 border-amber-600 pl-4 py-2">
                <h3 className="font-bold text-[var(--text-main)]">3. Tabelas Customizadas e Campos Extras</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">O sistema permite que administradores criem novas tabelas ou adicionem campos ao cadastro principal sem mexer no código.</p>
                <ul className="mt-4 space-y-3">
                  <li className="text-xs"><strong>Campos Extras:</strong> Aparecem automaticamente no final do formulário da Aba 1.</li>
                  <li className="text-xs"><strong>Novas Tabelas:</strong> Podem ser criadas no painel administrativo para pesquisas sazonais ou levantamentos específicos.</li>
                </ul>
              </div>
            </div>

            <div className="bg-[var(--bg)] p-6 rounded-lg border border-[var(--border)]">
              <h4 className="font-bold text-sm mb-2">Boas Práticas de Preenchimento</h4>
              <ul className="text-xs space-y-2 text-[var(--text-muted)] list-disc pl-4">
                <li>Sempre confira se a processualista já existe antes de cadastrar (use a busca na Listagem).</li>
                <li>Ao importar via Excel, certifique-se de que os nomes estão idênticos nas duas abas para o vínculo automático.</li>
                <li>Mantenha os links (Lattes, Teses) sempre com o prefixo https://.</li>
              </ul>
            </div>
         </div>
       )}

       {tab === "MANUAL" && (
         <div className="bg-white p-8 rounded-xl border border-[var(--border)] shadow-sm">
            <form className="space-y-8">
              
              <section>
                <h3 className="font-serif italic text-lg text-[var(--text-main)] mb-4 border-b pb-2">Dados Pessoais e Atuação Profissional</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Nome Completo *</label><input required {...register("nome")} className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[var(--accent)] outline-none" /></div>
                  <div><label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Email</label><input type="email" {...register("email")} className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[var(--accent)] outline-none" /></div>
                  <div><label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Qual a atuação profissional?</label><input {...register("atuacao_profissional")} className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[var(--accent)] outline-none" /></div>
                  <div><label className="block text-xs font-bold text-[var(--text-muted)] mb-1">UF da atuação principal</label><input {...register("uf_atuacao")} maxLength={2} className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[var(--accent)] outline-none" /></div>
                </div>
              </section>

              <section>
                <h3 className="font-serif italic text-lg text-[var(--text-main)] mb-4 border-b pb-2">Entidades e Lattes</h3>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("ibdp")} /> É associada do IBDP?</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("abep")} /> É associada da ABEP?</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Link do currículo Lattes</label><input {...register("link_lattes")} className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[var(--accent)] outline-none" /></div>
                  <div><label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Data da última atualização do Lattes</label><input {...register("data_atualizacao_lattes")} type="date" className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[var(--accent)] outline-none" /></div>
                </div>
              </section>

              <section>
                <h3 className="font-serif italic text-lg text-[var(--text-main)] mb-4 border-b pb-2">Atuação Docente</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-semibold p-3 bg-[var(--row-hover)] rounded-lg cursor-pointer">
                    <input type="checkbox" {...register("leciona")} /> 
                    Leciona? (Vínculo com instituição de ensino)
                  </label>

                  {leciona && (
                    <div className="space-y-4 pl-6 border-l-2 border-[var(--border)] mt-4 animate-in slide-in-from-left-2">
                       <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">Instituições de Ensino</h4>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => append({ tipo: "GRADUACAO", instituicao: "", integra_ranking_40: false })} className="flex items-center gap-1 text-[10px] bg-white border border-[var(--border)] px-2 py-1 rounded hover:bg-[var(--bg)] transition">
                              <Plus className="w-3 h-3" /> Graduação
                            </button>
                            <button type="button" onClick={() => append({ tipo: "POS", instituicao: "", integra_ranking_40: false })} className="flex items-center gap-1 text-[10px] bg-white border border-[var(--border)] px-2 py-1 rounded hover:bg-[var(--bg)] transition">
                              <Plus className="w-3 h-3" /> Pós-Graduação
                            </button>
                          </div>
                       </div>

                       {fields.map((field, index) => (
                         <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[var(--bg)] p-3 rounded-lg border border-[var(--border)] relative">
                            <div className="md:col-span-2">
                               <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase">Instituição ({watch(`vinculos_docentes.${index}.tipo`)})</label>
                               <input {...register(`vinculos_docentes.${index}.instituicao`)} className="w-full px-3 py-1.5 border rounded-lg outline-none text-sm" placeholder="Ex: USP, IDP..." />
                            </div>
                            <div className="flex items-center pt-4">
                               <label className="flex items-center gap-2 text-xs cursor-pointer">
                                  <input type="checkbox" {...register(`vinculos_docentes.${index}.integra_ranking_40`)} />
                                  Integra Ranking 40+ Universities?
                               </label>
                            </div>
                            <div className="flex items-center justify-end pt-4">
                               <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 transition p-1">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                         </div>
                       ))}

                       {fields.length === 0 && (
                         <p className="text-center py-6 text-xs text-[var(--text-muted)] italic border border-dashed rounded-lg">
                           Nenhuma instituição adicionada. Use os botões acima para adicionar.
                         </p>
                       )}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="font-serif italic text-lg text-[var(--text-main)] mb-4 border-b pb-2">Titulação</h3>
                <div className="space-y-6">
                  
                  <label className="flex items-center gap-2 text-sm font-bold bg-[var(--nav-hover)] p-3 rounded-lg"><input type="checkbox" {...register("especialista")} /> É especialista (lato sensu)?</label>
                  
                  <div className="border border-[var(--border)] rounded-lg p-4">
                    <label className="flex items-center gap-2 text-sm font-bold mb-4"><input type="checkbox" {...register("mestre")} /> É mestre?</label>
                    {is_mestre && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2"><label className="text-xs font-bold block mb-1">Título da Dissertação</label><input {...register("titulo_mestrado")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Ano de publicação</label><input type="number" {...register("ano_mestrado")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Faculdade/IES</label><input {...register("faculdade_mestrado")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Área de concentração</label><input {...register("area_mestrado")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Link de acesso (público)</label><input {...register("link_mestrado")} className="w-full px-3 py-2 border rounded-lg" /></div>
                      </div>
                    )}
                  </div>

                  <div className="border border-[var(--border)] rounded-lg p-4">
                    <label className="flex items-center gap-2 text-sm font-bold mb-4"><input type="checkbox" {...register("doutora")} /> É doutora?</label>
                    {is_doutora && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2"><label className="text-xs font-bold block mb-1">Título da Tese</label><input {...register("titulo_doutorado")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Ano de publicação</label><input type="number" {...register("ano_doutorado")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Faculdade/IES</label><input {...register("faculdade_doutorado")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Área de concentração</label><input {...register("area_doutorado")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Link de acesso (público)</label><input {...register("link_doutorado")} className="w-full px-3 py-2 border rounded-lg" /></div>
                      </div>
                    )}
                  </div>

                  <div className="border border-[var(--border)] rounded-lg p-4">
                    <label className="flex items-center gap-2 text-sm font-bold mb-4"><input type="checkbox" {...register("livre_docente")} /> É livre-docente?</label>
                    {is_livre_docente && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2"><label className="text-xs font-bold block mb-1">Título da Tese</label><input {...register("titulo_livre_docencia")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Ano de publicação</label><input type="number" {...register("ano_livre_docencia")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Faculdade/IES</label><input {...register("faculdade_livre_docencia")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Área de concentração</label><input {...register("area_livre_docencia")} className="w-full px-3 py-2 border rounded-lg" /></div>
                        <div><label className="text-xs font-bold block mb-1">Link de acesso (público)</label><input {...register("link_livre_docencia")} className="w-full px-3 py-2 border rounded-lg" /></div>
                      </div>
                    )}
                  </div>

                </div>
              </section>

              {camposExtras.length > 0 && (
                <section>
                  <h3 className="font-serif italic text-lg text-[var(--text-main)] mb-4 border-b pb-2">Outras Informações (Campos Extras)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--row-hover)] p-4 rounded-lg">
                    {camposExtras.map(c => (
                      <div key={c.id}>
                        <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">{c.label}</label>
                        {c.tipo === "boolean" ? (
                           <input type="checkbox" {...register(c.nome_campo)} className="mt-2" />
                        ) : (
                           <input type={c.tipo === "number" ? "number" : "text"} {...register(c.nome_campo)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]" />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="pt-4 flex items-center justify-end space-x-4 border-t border-[var(--border)] mt-8">
                 <button type="button" disabled={isSubmitting} onClick={handleSubmit((d,e) => onSubmitManual(d, e, true))} className="px-5 py-2.5 bg-white border border-[var(--border)] text-[var(--text-main)] font-semibold rounded-lg hover:bg-[var(--row-hover)] transition-colors shadow-sm">
                    Salvar e Criar Novo
                 </button>
                 <button type="button" disabled={isSubmitting} onClick={handleSubmit((d,e) => onSubmitManual(d, e, false))} className="px-5 py-2.5 bg-[var(--accent)] text-white font-semibold rounded-lg hover:bg-[var(--accent-hover)] transition-colors shadow-sm">
                    Salvar Registro (Aba 1)
                 </button>
              </div>

            </form>
         </div>
       )}

       {tab === "PRODUCAO" && (
         <div className="bg-white p-8 rounded-xl border border-[var(--border)] shadow-sm">
            <ProducaoForm />
         </div>
       )}
    </div>
  );
};
