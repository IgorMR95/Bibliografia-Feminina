import { useState } from "react";
import { UploadCloud, CheckCircle, Info, FileText } from "lucide-react";
import { api } from "../lib/api";

export const BatchImportTab = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileUpload = async (preview = false) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("preview", preview.toString());

      const res = await api.post("/importacao/excel", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(res.data);
      if (!preview) {
        alert("Importação concluída com sucesso!");
        setFile(null);
      }
    } catch (e: any) {
      alert("Erro na importação: " + (e.response?.data?.error || e.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-xl border border-[var(--border)] shadow-sm">
        <h3 className="font-serif italic text-xl text-[var(--text-main)] mb-4 flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-[var(--accent)]" />
          Importação em Lote via Excel
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Instructions */}
          <div className="space-y-4">
            <div className="bg-[var(--bg)] p-5 rounded-lg border border-[var(--border)]">
              <h4 className="font-bold text-sm flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[var(--accent)]" />
                Regras de Formatação
              </h4>
              <ul className="text-xs space-y-2 text-[var(--text-muted)] list-disc pl-4">
                <li>O arquivo deve ser um <strong>Excel (.xlsx)</strong>.</li>
                <li><strong>Aba 1:</strong> Deve conter os Dados das Processualistas. Colunas obrigatórias: <code className="bg-white px-1">Nome</code>. Recomendadas: <code className="bg-white px-1">Email</code>, <code className="bg-white px-1">UF</code>, <code className="bg-white px-1">IBDP</code> (Sim/Não).</li>
                <li><strong>Aba 2 (opcional):</strong> Deve conter a Produção Bibliográfica. Colunas: <code className="bg-white px-1">Nome</code> (Para vincular), <code className="bg-white px-1">Tipo</code>, <code className="bg-white px-1">Citação Completa</code>, <code className="bg-white px-1">Ano</code>.</li>
                <li>Os nomes na Aba 2 devem ser <strong>idênticos</strong> aos da Aba 1 para que o vínculo ocorra corretamente.</li>
                <li>Registros duplicados (mesmo nome/email) serão ignorados no cadastro novo mas vinculados às produções.</li>
              </ul>
            </div>

            <div className="flex gap-4">
               <button className="flex-1 p-3 border border-[var(--border)] rounded-lg text-xs font-bold hover:bg-[var(--row-hover)] transition flex items-center justify-center gap-2">
                 <FileText className="w-4 h-4" />
                 Baixar Modelo (.xlsx)
               </button>
            </div>
          </div>

          {/* Upload Area */}
          <div className="flex flex-col justify-center">
             <label className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${file ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg)]"}`}>
                <input type="file" className="hidden" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <UploadCloud className={`w-12 h-12 mb-4 ${file ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
                {file ? (
                  <div className="text-center">
                    <p className="font-bold text-[var(--text-main)] mb-1">{file.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-bold text-[var(--text-main)] mb-1">Arraste ou clique para selecionar</p>
                    <p className="text-xs text-[var(--text-muted)]">Apenas arquivos Excel (.xlsx)</p>
                  </div>
                )}
             </label>

             {file && (
               <div className="mt-6 flex gap-3">
                  <button 
                    disabled={uploading} 
                    onClick={() => handleFileUpload(true)}
                    className="flex-1 py-2.5 border border-[var(--accent)] text-[var(--accent)] font-bold rounded-lg hover:bg-[var(--accent)] hover:text-white transition"
                  >
                    Pré-visualizar
                  </button>
                  <button 
                    disabled={uploading} 
                    onClick={() => handleFileUpload(false)}
                    className="flex-1 py-2.5 bg-[var(--accent)] text-white font-bold rounded-lg hover:bg-[var(--accent-hover)] transition"
                  >
                    {uploading ? "Processando..." : "Importar Agora"}
                  </button>
               </div>
             )}
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-md animate-in fade-in slide-in-from-bottom-4">
           <h4 className="font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
             <CheckCircle className="w-5 h-5 text-[var(--success)]" />
             Resultado do Processamento
           </h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">Processualistas</span>
                <span className="text-2xl font-serif text-[var(--accent)]">{result.success_associadas ?? result.associadas_count}</span>
              </div>
              <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">Produções Bibliográficas</span>
                <span className="text-2xl font-serif text-[var(--accent)]">{result.success_producoes ?? result.producoes_count}</span>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <span className="block text-[10px] font-bold uppercase text-orange-600 mb-1">Duplicadas / Puladas</span>
                <span className="text-2xl font-serif text-orange-700">{result.duplicates_skipped ?? result.failed}</span>
              </div>
           </div>

           {result.preview_associadas && (
             <div className="mt-6">
                <h5 className="text-xs font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest">Prévia dos Dados (Top 5)</h5>
                <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg)] border-b border-[var(--border)]">
                      <tr>
                        <th className="px-4 py-2">Nome</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Vínculo Produção</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.preview_associadas.map((a: any, i: number) => (
                        <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)]">
                          <td className="px-4 py-2 font-medium">{a.nome}</td>
                          <td className="px-4 py-2 text-[var(--text-muted)]">{a.email ?? "-"}</td>
                          <td className="px-4 py-2">
                             <CheckCircle className="w-3 h-3 text-[var(--success)]" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
