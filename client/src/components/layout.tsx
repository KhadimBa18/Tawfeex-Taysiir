import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Users, 
  School, 
  GraduationCap, 
  FileText, 
  BarChart3, 
  LogOut,
  Settings,
  Menu,
  BookOpen
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import generatedImage from '@assets/generated_images/modern_logo_for_school_app_tawfeex_ak_taysiir.png';

const NAV_ITEMS = [
  { label: "Accueil", icon: LayoutDashboard, href: "/" },
  { label: "Personnel", icon: Users, href: "/personnel" },
  { label: "Classes", icon: School, href: "/classes" },
  { label: "Élèves", icon: GraduationCap, href: "/students" },
  { label: "Disciplines", icon: BookOpen, href: "/disciplines" },
  { label: "Évaluations", icon: FileText, href: "/evaluations" },
  { label: "Bulletins", icon: FileText, href: "/bulletins" },
  { label: "Statistiques", icon: BarChart3, href: "/stats" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
          <img src={generatedImage} alt="Logo" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Tawfeex<br/>ak Taysiir</h1>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </a>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border space-y-4">
        <div className="flex items-center gap-3 px-2">
          {user?.photo ? (
            <img src={user.photo} alt={user.fullName} className="w-8 h-8 rounded-full border border-sidebar-border" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-bold">{user?.fullName?.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.fullName}</p>
            <p className="text-xs text-sidebar-foreground/70 truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Nav */}
      <div className="md:hidden border-b p-4 flex items-center justify-between bg-white sticky top-0 z-50">
         <div className="flex items-center gap-2">
           <img src={generatedImage} alt="Logo" className="w-8 h-8 object-contain" />
           <span className="font-bold text-primary">Tawfeex_ak_Taysiir</span>
         </div>
         <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
           <SheetTrigger asChild>
             <Button variant="ghost" size="icon"><Menu className="w-6 h-6" /></Button>
           </SheetTrigger>
           <SheetContent side="left" className="p-0 w-72">
             <NavContent />
           </SheetContent>
         </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 sticky top-0 h-screen border-r shadow-xl z-40">
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="bg-secondary/10 border-b border-secondary/20 px-6 py-2 text-center text-sm font-medium text-secondary-foreground">
          Bienvenue dans Tawfeex_ak_Taysiir – Assistance : KHADIM BA (77 737 95 80)
        </div>
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </div>
        <footer className="border-t py-4 text-center text-xs text-muted-foreground bg-white/50">
          <p>© 2025 Tawfeex_ak_Taysiir - École Élémentaire</p>
          <p className="mt-1">Support: khadimba18@gmail.com / 77 737 95 80</p>
        </footer>
      </main>
    </div>
  );
}
