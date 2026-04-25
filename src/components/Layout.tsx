import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Search, LayoutDashboard, Database, Shield, LogOut, Users, LogIn, Home as HomeIcon, BookMarked, Menu, X, TableProperties } from "lucide-react";
import { cn } from "../lib/utils";
import { useState } from "react";

export const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Início", href: "/", icon: HomeIcon, exact: true },
    { name: "Sobre o Projeto", href: "/sobre", icon: BookMarked },
    { name: "Idealizadoras", href: "/idealizadoras", icon: Users },
    { name: "Consulta da Base", href: "/consulta", icon: Search },
    { name: "Estatísticas", href: "/dashboards", icon: LayoutDashboard },
  ];

  if (user) {
    navigation.push({ name: "Alimentação", href: "/alimentacao", icon: Database });
  }

  if (user?.role === "ADMIN") {
    navigation.push({ name: "Administração", href: "/admin", icon: Shield });
    navigation.push({ name: "Gestão de Dados", href: "/admin/dados", icon: TableProperties });
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] font-sans">
      {/* Top Navbar */}
      <nav className="bg-[var(--sidebar)] border-b border-[var(--border)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white font-serif italic text-xl">A</div>
                <span className="font-serif italic text-xl text-[var(--text-main)]">Associadas</span>
              </Link>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center",
                      isActive 
                        ? "bg-[var(--nav-active)] text-[var(--accent)]" 
                        : "text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]"
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
              
              <div className="ml-4 pl-4 border-l border-[var(--border)] flex items-center">
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--nav-active)] flex items-center justify-center text-[var(--accent)] font-bold text-xs">
                      {user?.nome?.substring(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-2 rounded-md hover:bg-[var(--nav-hover)]"
                      title="Sair"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition shadow-sm"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Entrar
                  </button>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-2"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--sidebar)]">
            <div className="pt-2 pb-3 space-y-1 px-4">
              {navigation.map((item) => {
                const isActive = item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "block px-3 py-2 rounded-md text-base font-medium flex items-center",
                      isActive 
                        ? "bg-[var(--nav-active)] text-[var(--accent)]" 
                        : "text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]"
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
              
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center px-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-[var(--nav-active)] flex items-center justify-center text-[var(--accent)] font-bold text-xs mr-3">
                        {user.nome?.substring(0, 2).toUpperCase() || 'AD'}
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-[var(--text-main)]">{user.nome}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{user.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]"
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Sair
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { navigate("/login"); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-center px-4 py-2 bg-[var(--accent)] text-white text-base font-medium rounded-lg hover:bg-[var(--accent-hover)] transition"
                  >
                    <LogIn className="w-5 h-5 mr-2" />
                    Entrar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[var(--bg)] flex flex-col">
        <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
           <h1 className="text-2xl font-serif italic text-[var(--accent)] capitalize">
              {location.pathname === "/" ? "" : location.pathname.split("/")[1]?.replace(/-/g, " ")}
           </h1>
        </header>
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex-1">
          <Outlet />
        </div>
        
        {/* Footer */}
        <footer className="border-t border-[var(--border)] py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Desenvolvido por Igor Moraes Rocha, 2026
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};
