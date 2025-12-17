import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, School, GraduationCap, FileText, BarChart3, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const MODULES = [
  { 
    title: "Personnel", 
    icon: Users, 
    href: "/personnel", 
    color: "text-blue-600", 
    bg: "bg-blue-100",
    desc: "Gestion des enseignants et staff"
  },
  { 
    title: "Classes", 
    icon: School, 
    href: "/classes", 
    color: "text-amber-600", 
    bg: "bg-amber-100",
    desc: "Configuration des niveaux et salles"
  },
  { 
    title: "Élèves", 
    icon: GraduationCap, 
    href: "/students", 
    color: "text-green-600", 
    bg: "bg-green-100",
    desc: "Inscriptions et listes"
  },
  { 
    title: "Évaluations", 
    icon: FileText, 
    href: "/evaluations", 
    color: "text-purple-600", 
    bg: "bg-purple-100",
    desc: "Saisie des notes et compétences"
  },
  { 
    title: "Bulletins", 
    icon: FileText, 
    href: "/bulletins", 
    color: "text-indigo-600", 
    bg: "bg-indigo-100",
    desc: "Génération et impression"
  },
  { 
    title: "Statistiques", 
    icon: BarChart3, 
    href: "/stats", 
    color: "text-rose-600", 
    bg: "bg-rose-100",
    desc: "Analyses et graphiques"
  },
  { 
    title: "Paramètres", 
    icon: Settings, 
    href: "/settings", 
    color: "text-slate-600", 
    bg: "bg-slate-100",
    desc: "Sauvegarde et restauration"
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Tableau de bord</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenue, {user?.fullName}. Sélectionnez un module pour commencer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MODULES.map((module) => (
          <Link key={module.href} href={module.href}>
            <a className="block group">
              <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-2 border-transparent hover:border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-bold">{module.title}</CardTitle>
                  <div className={`p-3 rounded-xl ${module.bg} ${module.color} transition-transform group-hover:scale-110`}>
                    <module.icon className="w-6 h-6" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{module.desc}</p>
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
