import { Info } from "lucide-react";

/**
 * Faixa de aviso das telas de alimentação e edição da base.
 *
 * Estas telas gravam no Supabase, mas o site público lê os arquivos
 * estáticos gerados da planilha — então o que se edita aqui não aparece
 * para o visitante. Elas foram reativadas para demonstração do sistema, e
 * sem esta faixa alguém editaria um registro, veria "salvo com sucesso" e
 * iria procurar a mudança no site sem encontrar.
 */
export const AvisoDemonstracao = ({ contexto }: { contexto?: string }) => (
  <div className="flex gap-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-5 py-4">
    <Info className="w-5 h-5 shrink-0 text-[var(--warning)] mt-0.5" />
    <div className="text-[13px] leading-relaxed">
      <p className="font-semibold text-[var(--text-main)]">
        Tela de demonstração — não altera o site público
      </p>
      <p className="text-[var(--text-muted)] mt-1">
        {contexto ?? "O que for salvo aqui grava no banco de dados"}, mas a consulta, as obras e
        os gráficos do site leem os arquivos gerados a partir da planilha do repositório. Para
        mudar o que o público vê, atualize a planilha e regere os dados.
      </p>
    </div>
  </div>
);
