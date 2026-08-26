import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import {
  Search, LayoutDashboard, Shield, LogOut, Users, LogIn,
  Home as HomeIcon, BookMarked, Menu, X, FlaskConical,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useState } from "react";
import { Rodape } from "./Rodape";

/** rotas cujas paginas ja renderizam o proprio titulo */
const SEM_CABECALHO = new Set(["/", "/sobre", "/metodologia", "/quem-somos"]);

/** rotulos curtos: com os nomes por extenso a barra estourava e quebrava em duas linhas */
const PUBLICO = [
  { name: "Início", href: "/", icon: HomeIcon, exact: true },
  { name: "O Projeto", href: "/sobre", icon: BookMarked },
  { name: "Metodologia", href: "/metodologia", icon: FlaskConical },
  { name: "Quem Somos", href: "/quem-somos", icon: Users },
  { name: "Consulta", href: "/consulta", icon: Search },
  { name: "Estatísticas", href: "/dashboards", icon: LayoutDashboard },
];

export const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  const restrito = [
    ...(user?.role === "ADMIN"
      ? [
          { name: "Administração", href: "/admin", icon: Shield },
        ]
      : []),
  ];

  const ativo = (href: string, exact?: boolean) =>
    exact ? location.pathname === href : location.pathname.startsWith(href);

  const sair = () => { logout(); navigate("/login"); };

  const classeLink = (isAtivo: boolean) =>
    cn(
      "px-3 py-1.5 rounded-md text-[13px] font-semibold whitespace-nowrap transition-colors",
      isAtivo
        ? "bg-white text-[var(--accent)] shadow-sm"
        : "text-[var(--accent)]/75 hover:bg-white/45 hover:text-[var(--accent)]"
    );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] font-sans">
      <nav className="bg-[var(--navbar)] border-b border-[var(--accent)]/15 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 bg-[var(--accent)] rounded flex items-center justify-center text-white font-serif font-bold text-[13px] tracking-tight">
                BPF
              </div>
              <span className="hidden sm:block font-serif font-semibold text-[15px] text-[var(--accent)] whitespace-nowrap leading-none">
                Bibliografia Processual Feminina
              </span>
            </Link>

            {/* desktop */}
            <div className="hidden lg:flex items-center gap-0.5">
              {PUBLICO.map((item) => (
                <Link key={item.href} to={item.href} className={classeLink(ativo(item.href, item.exact))}>
                  {item.name}
                </Link>
              ))}

              {restrito.length > 0 && (
                <span className="mx-2 h-5 w-px bg-[var(--accent)]/20" aria-hidden />
              )}
              {restrito.map((item) => (
                <Link key={item.href} to={item.href} className={classeLink(ativo(item.href))}>
                  {item.name}
                </Link>
              ))}

              <div className="ml-3 pl-3 border-l border-[var(--accent)]/20 flex items-center">
                {user ? (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[var(--accent)] font-semibold text-[11px]"
                      title={`${user.nome} · ${user.role}`}
                    >
                      {user.nome?.substring(0, 2).toUpperCase() || "AD"}
                    </div>
                    <button
                      onClick={sair}
                      className="text-[var(--accent)]/70 hover:text-[var(--accent)] transition-colors p-1.5 rounded-md hover:bg-white/45"
                      title="Sair"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center px-3.5 py-1.5 bg-[var(--accent)] text-white text-[13px] font-semibold rounded-md hover:bg-[var(--accent-hover)] transition"
                  >
                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                    Entrar
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="lg:hidden text-[var(--accent)] hover:bg-white/45 rounded-md p-2"
              aria-label="Menu"
            >
              {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* mobile */}
        {menuAberto && (
          <div className="lg:hidden border-t border-[var(--accent)]/15 bg-[var(--navbar)]">
            <div className="px-4 py-3 space-y-1">
              {[...PUBLICO, ...restrito].map((item: any) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMenuAberto(false)}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-md text-[15px] font-semibold",
                    ativo(item.href, item.exact)
                      ? "bg-white text-[var(--accent)]"
                      : "text-[var(--accent)]/80 hover:bg-white/45"
                  )}
                >
                  <item.icon className="w-4 h-4 mr-3 shrink-0" />
                  {item.name}
                </Link>
              ))}

              <div className="mt-3 pt-3 border-t border-[var(--accent)]/20">
                {user ? (
                  <div className="space-y-1">
                    <div className="flex items-center px-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[var(--accent)] font-semibold text-[11px] mr-3">
                        {user.nome?.substring(0, 2).toUpperCase() || "AD"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--accent)] leading-tight">{user.nome}</p>
                        <p className="text-[11px] text-[var(--accent)]/70">{user.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { sair(); setMenuAberto(false); }}
                      className="w-full flex items-center px-3 py-2.5 rounded-md text-[15px] font-semibold text-[var(--accent)]/80 hover:bg-white/45"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sair
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { navigate("/login"); setMenuAberto(false); }}
                    className="w-full flex items-center justify-center px-4 py-2.5 bg-[var(--accent)] text-white text-[15px] font-semibold rounded-md hover:bg-[var(--accent-hover)] transition"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Entrar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 flex flex-col">
        {/* paginas institucionais ja trazem o proprio titulo; repetir a rota
            aqui em cima duplicava o cabecalho */}
        {!SEM_CABECALHO.has(location.pathname) && (
          <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
            <h1 className="text-[26px] font-serif font-bold text-[var(--heading)] capitalize leading-tight">
              {location.pathname.split("/")[1]?.replace(/-/g, " ")}
            </h1>
          </header>
        )}

        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16 flex-1">
          <Outlet />
        </div>

        <Rodape />
      </main>
    </div>
  );
};
