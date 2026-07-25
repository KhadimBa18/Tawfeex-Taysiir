import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSchool } from "@/hooks/use-school";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Lock } from "lucide-react";

export default function SchoolSetup() {
  const { user } = useAuth();
  const { school, saveSchool, isLoading } = useSchool();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({
    name: "", ia: "", ief: "", commune: "", zone: "", code: "", email: "", phone: "",
  });

  useEffect(() => {
    if (school) {
      setForm({
        name: school.name || "",
        ia: school.ia || "",
        ief: school.ief || "",
        commune: school.commune || "",
        zone: school.zone || "",
        code: school.code || "",
        email: school.email || "",
        phone: school.phone || "",
      });
    }
  }, [school]);

  // Seul un compte admin peut accéder à cet écran
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Lock className="w-5 h-5" /> Accès restreint
            </CardTitle>
            <CardDescription>
              Cette application n'a pas encore été configurée. Contactez l'administrateur pour finaliser le paramétrage.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.ia || !form.ief || !form.code) {
      toast({ title: "Champs requis", description: "Nom, IA, IEF et Code école sont obligatoires.", variant: "destructive" });
      return;
    }
    await saveSchool(form);
    toast({ title: "Configuration enregistrée", description: "Les informations de l'école sont appliquées à toute l'application." });
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Configuration de l'établissement
          </CardTitle>
          <CardDescription>
            Ces informations apparaîtront automatiquement sur tous les documents générés (bulletins, rapports, exports).
            Seul un compte administrateur peut modifier ces paramètres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Inspection d'Académie (IA)</Label>
              <Input value={form.ia} onChange={handleChange("ia")} placeholder="Ex: IA DAKAR" required />
            </div>
            <div className="space-y-1.5">
              <Label>Inspection de l'Éducation et de la Formation (IEF)</Label>
              <Input value={form.ief} onChange={handleChange("ief")} placeholder="Ex: IEF PARCELLES ASSAINIES" required />
            </div>
            <div className="space-y-1.5">
              <Label>Commune</Label>
              <Input value={form.commune} onChange={handleChange("commune")} placeholder="Ex: Kébémer" required />
            </div>
            <div className="space-y-1.5">
              <Label>Zone</Label>
              <Input value={form.zone} onChange={handleChange("zone")} placeholder="Ex: Zone 3" required />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Nom de l'école</Label>
              <Input value={form.name} onChange={handleChange("name")} placeholder="Ex: Daara Touhfatoul Moutadarihine" required />
            </div>
            <div className="space-y-1.5">
              <Label>Code école</Label>
              <Input value={form.code} onChange={handleChange("code")} placeholder="Ex: DTM_00001SN" required />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={handleChange("phone")} placeholder="Ex: 77 737 95 80" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={handleChange("email")} placeholder="Ex: contact@ecole.sn" />
            </div>
            <div className="md:col-span-2 pt-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                Enregistrer la configuration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}