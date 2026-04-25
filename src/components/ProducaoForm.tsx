import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { api } from "../lib/api";

interface ProducaoFormProps {
  associadaId?: string;
  onSuccess?: () => void;
  initialData?: any;
}

export const ProducaoForm = ({ associadaId, onSuccess, initialData }: ProducaoFormProps) => {
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: initialData || {
      formato: "ELETRONICA",
      acesso_eletronica: "PUBLICA",
      tipo_obra: "Artigo",
      area_processo: "P. Civil"
    }
  });

  const [associadas, setAssociadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const formato = watch("formato");
  const acesso_eletronica = watch("acesso_eletronica");

  useEffect(() => {
    if (!associadaId && !initialData) {
      api.get("/associadas", { params: { limit: 1000 } })
        .then(res => setAssociadas(res.data.data))
        .catch(console.error);
    }
  }, [associadaId, initialData]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const payload = { ...data };
      if (associadaId) payload.associada_id = associadaId;
      
      if (initialData?.id) {
        await api.put(`/producao/${initialData.id}`, payload);
      } else {
        await api.post("/producao", payload);
      }
      
      alert("Produção bibliográfica salva com sucesso!");
      if (!initialData) reset();
      if (onSuccess) onSuccess();
    } catch {
      alert("Erro ao salvar produção");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!associadaId && !initialData && (
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Processualista *</label>
            <select required {...register("associada_id")} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]">
              <option value="">Selecione a processualista...</option>
              {associadas.map(a => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Tipo de Obra *</label>
          <select required {...register("tipo_obra")} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]">
            <option>Artigo</option>
            <option>Livro</option>
            <option>Capítulo de Livro</option>
            <option>Anais de Eventos</option>
            <option>Coluna em Jornais e Sites</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Área do Processo *</label>
          <select required {...register("area_processo")} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]">
            <option>P. Civil</option>
            <option>P. Penal</option>
            <option>P. Trabalhista</option>
            <option>P. Tributário</option>
            <option>P. Constitucional</option>
            <option>Outros</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Citação Completa da Obra *</label>
          <textarea required {...register("citacao_completa")} rows={3} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]" />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Ano de Publicação *</label>
          <input required type="number" {...register("ano_publicacao")} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]" />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Obra física ou eletrônica? *</label>
          <select required {...register("formato")} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]">
             <option value="FISICA">Física</option>
             <option value="ELETRONICA">Eletrônica</option>
          </select>
        </div>

        {formato === "ELETRONICA" && (
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Acesso eletrônico? *</label>
            <select required {...register("acesso_eletronica")} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]">
               <option value="PUBLICA">Pública</option>
               <option value="PROTEGIDA">Protegida</option>
            </select>
          </div>
        )}

        {(formato === "FISICA" || acesso_eletronica === "PROTEGIDA") && (
          <div className={formato === "FISICA" ? "md:col-span-1" : ""}>
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Localização *</label>
            <input required {...register("localizacao")} placeholder="Ex: Biblioteca X, HD Externo..." className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]" />
          </div>
        )}

        {formato === "ELETRONICA" && acesso_eletronica === "PUBLICA" && (
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Link de acesso ao trabalho *</label>
            <input required {...register("link_acesso")} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)]" />
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <button type="submit" disabled={loading} className="px-6 py-2 bg-[var(--accent)] text-white font-semibold rounded-lg hover:bg-[var(--accent-hover)] transition-colors shadow-sm disabled:opacity-50">
          {loading ? "Salvando..." : (initialData ? "Atualizar Produção" : "Salvar Produção Bibliográfica")}
        </button>
      </div>
    </form>
  );
};
