import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowLeft, Edit, Save, Plus, BookOpen, Trash2, Mail, MapPin, Briefcase, GraduationCap, X, CheckCircle } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useForm, useFieldArray } from "react-hook-form";
import { format } from "date-fns";
import { ProducaoForm } from "../components/ProducaoForm";

export const DetalheAssociada = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [camposExtras, setCamposExtras] = useState<any[]>([]);
  const [producoes, setProducoes] = useState<any[]>([]);
  const [showProducaoModal, setShowProducaoModal] = useState(false);
  const [editingProducao, setEditingProducao] = useState<any>(null);
  const [novaNota, setNovaNota] = useState("");

  const { register, handleSubmit, reset, watch, control } = useForm<any>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "vinculos_docentes"
  });

  const loadData = async () => {
    try {
      const [res, campos, resProd] = await Promise.all([
         api.get(`/associadas/${id}`),
         api.get('/dynamic/campos-extras?entidade=Associada'),
         api.get(`/producao?associada_id=${id}`)
      ]);
      const initialData = res.data;
      if(initialData.dados_dinamicos) {
        try {
           const parsed = JSON.parse(initialData.dados_dinamicos) || {};
           Object.assign(initialData, parsed);
        } catch {}
      }

      setData(initialData);
      reset(initialData);
      setCamposExtras(campos.data);
      setProducoes(resProd.data);
    } catch (e) {
      alert("Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const onSave = async (formData: any) => {
    try {
      const dbPayload = { ...formData };
      
      const dynamicObject: any = {};
      camposExtras.forEach(c => {
         if (dbPayload[c.nome_campo] !== undefined) {
           dynamicObject[c.nome_campo] = dbPayload[c.nome_campo];
           delete dbPayload[c.nome_campo];
         }
      });
      dbPayload.dados_dinamicos = JSON.stringify(dynamicObject);
      
      // Clean relations for update logic if necessary
      delete dbPayload.notas;
      delete dbPayload.producoes;

      await api.put(`/associadas/${id}`, dbPayload);
      setIsEditing(false);
      loadData();
    } catch {
      alert("Erro ao salvar");
    }
  };

  const handleAddNota = async () => {
    if (!novaNota.trim()) return;
    try {
      await api.post(`/notas`, { associada_id: id, texto: novaNota });
      setNovaNota("");
      loadData();
    } catch {
      alert("Erro ao adicionar nota");
    }
  };

  const handleDeleteProducao = async (prodId: string) => {
    if(!confirm("Deseja realmente remover esta produção?")) return;
    try {
      await api.delete(`/producao/${prodId}`);
      loadData();
    } catch {
      alert("Erro ao remover produção");
    }
  };

  if (loading) return <div className="p-10">Carregando...</div>;
  if (!data) return <div className="p-10 text-red-500">Registro não encontrado</div>;

  const Field = ({ label, objKey, type = "text" }: { label: string, objKey: string, type?: string }) => {
    if (!isEditing) {
      if (type === "boolean") return (
        <div className="py-2">
           <span className="block text-xs font-medium text-slate-500">{label}</span>
           <span className="text-sm font-medium">{data[objKey] ? "SIM" : "NÃO"}</span>
        </div>
      );
      return (
        <div className="py-2">
           <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
           <span className="text-sm">{data[objKey] || "-"}</span>
        </div>
      );
    }

    if (type === "boolean") {
      return (
         <div className="py-2">
            <label className="flex items-center space-x-2 text-sm font-semibold text-[var(--text-main)] cursor-pointer">
              <input type="checkbox" {...register(objKey)} className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]" />
              <span>{label}</span>
            </label>
        </div>
      )
    }

    if (type === "textarea") {
      return (
        <div className="py-2">
           <span className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</span>
           <textarea rows={3} {...register(objKey)} className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none" />
        </div>
      )
    }

    return (
      <div className="py-2">
         <span className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</span>
         <input type="text" {...register(objKey)} className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none" />
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate("/consulta")} className="p-2 text-[var(--text-muted)] hover:bg-[var(--row-hover)] rounded-full transition border border-transparent hover:border-[var(--border)]">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <h1 className="text-2xl font-serif italic text-[var(--text-main)]">{data.nome}</h1>
            <p className="text-sm text-[var(--text-muted)]">Processualista cadastrada em: {new Date(data.criado_em).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex space-x-3">
           {user && (!isEditing ? (
             <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 bg-white border border-[var(--border)] text-[var(--text-main)] text-sm font-semibold rounded-lg hover:bg-[var(--row-hover)] transition shadow-sm">
               <Edit className="w-4 h-4 mr-2" />
               Editar Registro
             </button>
           ) : (
             <>
               <button onClick={() => { setIsEditing(false); reset(data); }} className="px-4 py-2 bg-white border border-[var(--border)] text-[var(--text-main)] text-sm font-semibold rounded-lg hover:bg-[var(--row-hover)] transition shadow-sm font-bold">Cancelar</button>
               <button onClick={handleSubmit(onSave)} className="flex items-center px-4 py-2 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] transition shadow-md font-bold">
                 <Save className="w-4 h-4 mr-2" />
                 Salvar Alterações
               </button>
             </>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col - Info */}
        <form onSubmit={handleSubmit(onSave)} className="md:col-span-2 space-y-6">
          
          {isEditing && (
            <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm animate-in slide-in-from-top-4">
               <h3 className="font-semibold text-[var(--text-main)] mb-4 border-b border-[var(--border)] pb-2 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></div>
                 Controle do Sistema
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="py-2">
                    <span className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1 font-bold">Status do Registro</span>
                    <select {...register("status_registro")} className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-md text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none">
                      <option value="ATIVO">Ativo</option>
                      <option value="INCOMPLETO">Incompleto</option>
                      <option value="REVISAR">Revisar</option>
                      <option value="DUPLICADO">Duplicado</option>
                    </select>
                  </div>
               </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm">
             <h3 className="font-semibold text-[var(--text-main)] mb-4 border-b border-[var(--border)] pb-2 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-[var(--accent)]"></div>
               Identificação Profissional
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <Field label="Nome da Processualista" objKey="nome" />
                <Field label="Email" objKey="email" />
                <Field label="UF Atuação Principal" objKey="uf_atuacao" />
                <Field label="Atuação Profissional" objKey="atuacao_profissional" />
                <div className="col-span-2 grid grid-cols-2 gap-4 mt-2 p-3 bg-[var(--nav-active)] border border-[var(--border)] rounded-lg">
                  <Field label="IBDP" objKey="ibdp" type="boolean" />
                  <Field label="ABEP" objKey="abep" type="boolean" />
                </div>
             </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm">
             <h3 className="font-semibold text-[var(--text-main)] mb-4 border-b border-[var(--border)] pb-2 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-[var(--accent)]"></div>
               Acadêmico & Docência
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <div className="col-span-2">
                  <Field label="Link Lattes" objKey="link_lattes" />
                  <Field label="Data Atualização Lattes" objKey="data_atualizacao_lattes" />
                </div>
                <div className="col-span-2 p-4 bg-[var(--nav-active)] border border-[var(--border)] rounded-lg mt-2 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <Field label="Leciona?" objKey="leciona" type="boolean" />
                    {isEditing && (isEditing ? watch("leciona") : data.leciona) && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => append({ tipo: "GRADUACAO", instituicao: "", integra_ranking_40: false })} className="flex items-center gap-1 text-[10px] bg-white border border-[var(--border)] px-2 py-1 rounded hover:bg-[var(--bg)] transition">
                          <Plus className="w-3 h-3" /> Graduação
                        </button>
                        <button type="button" onClick={() => append({ tipo: "POS", instituicao: "", integra_ranking_40: false })} className="flex items-center gap-1 text-[10px] bg-white border border-[var(--border)] px-2 py-1 rounded hover:bg-[var(--bg)] transition">
                          <Plus className="w-3 h-3" /> Pós
                        </button>
                      </div>
                    )}
                  </div>

                  {(isEditing ? watch("leciona") : data.leciona) && (
                    <div className="space-y-3 pl-6 border-l-2 border-[var(--border)] animate-in slide-in-from-left-2">
                       {isEditing ? (
                         fields.map((field, index) => (
                           <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[var(--bg)] p-3 rounded-lg border border-[var(--border)] relative">
                              <div className="md:col-span-2">
                                 <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase">Instituição ({watch(`vinculos_docentes.${index}.tipo`)})</label>
                                 <input {...register(`vinculos_docentes.${index}.instituicao`)} className="w-full px-3 py-1.5 border rounded-lg outline-none text-sm" />
                                 <input type="hidden" {...register(`vinculos_docentes.${index}.tipo`)} />
                              </div>
                              <div className="flex items-center pt-4">
                                 <label className="flex items-center gap-2 text-xs cursor-pointer">
                                    <input type="checkbox" {...register(`vinculos_docentes.${index}.integra_ranking_40`)} />
                                    Ranking 40+?
                                 </label>
                              </div>
                              <div className="flex items-center justify-end pt-4">
                                 <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 transition p-1">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                           </div>
                         ))
                       ) : (
                         data.vinculos_docentes?.map((v: any, index: number) => (
                           <div key={index} className="flex items-center justify-between bg-white/50 p-2 rounded border border-[var(--border)]/50">
                              <div className="flex items-center gap-3">
                                 <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${v.tipo === "GRADUACAO" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                                    {v.tipo}
                                 </span>
                                 <span className="text-sm font-medium">{v.instituicao}</span>
                              </div>
                              {v.integra_ranking_40 && (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                   <CheckCircle className="w-3 h-3" /> Ranking 40+
                                </span>
                              )}
                           </div>
                         ))
                       )}
                       
                       {(isEditing ? fields.length === 0 : (!data.vinculos_docentes || data.vinculos_docentes.length === 0)) && (
                         <p className="text-xs text-[var(--text-muted)] italic">Nenhuma instituição vinculada.</p>
                       )}
                    </div>
                  )}
                </div>
             </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm">
             <h3 className="font-semibold text-[var(--text-main)] mb-4 border-b border-[var(--border)] pb-2 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-[var(--accent)]"></div>
               Titulação (Áreas e Trabalhos)
             </h3>
             <div className="space-y-4">
                <div className="p-3 bg-[var(--nav-hover)] border border-[var(--border)] rounded-lg">
                   <Field label="Especialista" objKey="especialista" type="boolean" />
                </div>

                <div className="p-3 border border-[var(--border)] rounded-lg">
                   <Field label="Mestre" objKey="mestre" type="boolean" />
                   <Field label="Título Mestrado" objKey="titulo_mestrado" type="textarea" />
                   <div className="grid grid-cols-2 gap-2"><Field label="Faculdade" objKey="faculdade_mestrado" /><Field label="Ano" objKey="ano_mestrado" /></div>
                   <div className="grid grid-cols-2 gap-2"><Field label="Área" objKey="area_mestrado" /><Field label="Link" objKey="link_mestrado" /></div>
                </div>

                <div className="p-3 border border-[var(--border)] rounded-lg">
                   <Field label="Doutora" objKey="doutora" type="boolean" />
                   <Field label="Título Doutorado" objKey="titulo_doutorado" type="textarea" />
                   <div className="grid grid-cols-2 gap-2"><Field label="Faculdade" objKey="faculdade_doutorado" /><Field label="Ano" objKey="ano_doutorado" /></div>
                   <div className="grid grid-cols-2 gap-2"><Field label="Área" objKey="area_doutorado" /><Field label="Link" objKey="link_doutorado" /></div>
                </div>

                <div className="p-3 border border-[var(--border)] rounded-lg">
                   <Field label="Livre Docente" objKey="livre_docente" type="boolean" />
                   <Field label="Título Livre Docência" objKey="titulo_livre_docencia" type="textarea" />
                   <div className="grid grid-cols-2 gap-2"><Field label="Faculdade" objKey="faculdade_livre_docencia" /><Field label="Ano" objKey="ano_livre_docencia" /></div>
                   <div className="grid grid-cols-2 gap-2"><Field label="Área" objKey="area_livre_docencia" /><Field label="Link" objKey="link_livre_docencia" /></div>
                </div>
             </div>
          </div>
          
          {camposExtras.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm">
               <h3 className="font-semibold text-[var(--text-main)] mb-4 border-b border-[var(--border)] pb-2 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-[var(--accent)]"></div>
                 Campos Adicionais
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                   {camposExtras.map(c => (
                     <div key={c.id}>
                        <Field label={c.label} objKey={c.nome_campo} type={c.tipo === "boolean" ? "boolean" : "text"} />
                     </div>
                   ))}
               </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm">
               <div className="flex justify-between items-center mb-4 border-b border-[var(--border)] pb-2">
                 <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-[var(--accent)]"></div>
                   Produção Bibliográfica
                 </h3>
                 {user && (
                   <button 
                     onClick={() => { setEditingProducao(null); setShowProducaoModal(true); }}
                     className="p-1.5 bg-[var(--accent)] text-white rounded-md hover:bg-[var(--accent-hover)] transition"
                   >
                     <Plus className="w-4 h-4" />
                   </button>
                 )}
               </div>
               
               <div className="space-y-4">
                 {producoes.length === 0 && <p className="text-sm text-[var(--text-muted)] italic">Nenhuma produção registrada para esta processualista.</p>}
                 {producoes.map(p => (
                   <div key={p.id} className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-lg group">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                           <BookOpen className="w-4 h-4 text-[var(--accent)] mt-0.5" />
                           <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-[var(--border)] text-[var(--text-muted)] mb-1 inline-block">
                                {p.tipo_obra}
                              </span>
                              <p className="text-sm font-serif italic text-[var(--text-main)] leading-relaxed">{p.citacao_completa}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-bold uppercase text-[var(--text-muted)]">
                                <span>Ano: {p.ano_publicacao}</span>
                                <span>Área: {p.area_processo}</span>
                                <span>Canal: {p.formato}</span>
                              </div>
                           </div>
                        </div>
                        {user && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                             <button onClick={() => { setEditingProducao(p); setShowProducaoModal(true); }} className="p-1 hover:text-[var(--accent)]"><Edit className="w-3.5 h-3.5"/></button>
                             <button onClick={() => handleDeleteProducao(p.id)} className="p-1 hover:text-[var(--error)]"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                        )}
                      </div>
                      {p.link_acesso && (
                        <a href={p.link_acesso} target="_blank" rel="noreferrer" className="mt-2 text-[10px] text-[var(--accent)] font-bold hover:underline inline-block">
                          Acessar Obra →
                        </a>
                      )}
                   </div>
                 ))}
               </div>
          </div>

        </form>

        {/* Right Col - Logs & Notes */}
        <div className="space-y-6">
           <div className="bg-white p-5 rounded-xl border border-[var(--border)] shadow-sm flex flex-col h-[500px]">
              <h3 className="font-semibold text-[var(--text-main)] mb-4 border-b border-[var(--border)] pb-2">Notas Internas</h3>
              
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
                 {data.notas?.length === 0 && <p className="text-sm text-[var(--text-muted)] italic">Nenhuma anotação.</p>}
                 {data.notas?.map((n: any) => (
                   <div key={n.id} className="bg-[var(--bg)] p-3 rounded-lg border border-[var(--border)] text-sm">
                     <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-[var(--text-main)]">{n.autor.nome}</span>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">{format(new Date(n.criado_em), 'dd/MM/yyyy HH:mm')}</span>
                     </div>
                     <p className="text-[var(--text-muted)] whitespace-pre-wrap">{n.texto}</p>
                   </div>
                 ))}
              </div>

              {user && (
                <div className="border-t border-[var(--border)] pt-4">
                   <textarea 
                      rows={3} 
                      className="w-full text-sm p-2 border border-[var(--border)] rounded-lg focus:ring-1 focus:ring-[var(--accent)] outline-none mb-2"
                      placeholder="Adicionar nova observação..."
                      value={novaNota}
                      onChange={e => setNovaNota(e.target.value)}
                   />
                   <button onClick={handleAddNota} className="w-full flex items-center justify-center px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-hover)] transition">
                     <Plus className="w-4 h-4 mr-1" />
                     Adicionar
                   </button>
                </div>
              )}
           </div>
        </div>

      </div>
      
      {showProducaoModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-[var(--border)]">
             <div className="px-6 py-4 border-b flex justify-between items-center bg-[var(--bg)]">
               <h3 className="font-serif italic text-lg">{editingProducao ? "Editar Produção" : "Nova Produção Bibliográfica"}</h3>
               <button onClick={() => setShowProducaoModal(false)} className="text-[var(--text-muted)] hover:text-black">✕</button>
             </div>
             <div className="p-6">
                <ProducaoForm 
                   associadaId={id} 
                   initialData={editingProducao} 
                   onSuccess={() => { setShowProducaoModal(false); loadData(); }} 
                />
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
