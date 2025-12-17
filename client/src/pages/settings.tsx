import { useState } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Upload, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function Settings() {
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = async () => {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        version: 1,
        users: await db.users.toArray(),
        classes: await db.classes.toArray(),
        students: await db.students.toArray(),
        marks: await db.marks.toArray(),
        schools: await db.schools.toArray()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tawfeex_Backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "Sauvegarde réussie", description: "Le fichier de sauvegarde a été téléchargé." });
    } catch (e) {
      toast({ title: "Erreur", description: "Échec de la sauvegarde", variant: "destructive" });
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Attention : La restauration remplacera toutes les données actuelles. Continuer ?")) {
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        
        await db.transaction('rw', db.users, db.classes, db.students, db.marks, db.schools, async () => {
          await db.users.clear();
          await db.classes.clear();
          await db.students.clear();
          await db.marks.clear();
          await db.schools.clear();

          if (json.users) await db.users.bulkAdd(json.users);
          if (json.classes) await db.classes.bulkAdd(json.classes);
          if (json.students) await db.students.bulkAdd(json.students);
          if (json.marks) await db.marks.bulkAdd(json.marks);
          if (json.schools) await db.schools.bulkAdd(json.schools);
        });

        toast({ title: "Restauration réussie", description: "Les données ont été restaurées." });
      } catch (err) {
        toast({ title: "Erreur", description: "Fichier de sauvegarde invalide", variant: "destructive" });
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Paramètres & Maintenance</h1>
        <p className="text-muted-foreground">Sauvegarde et restauration des données.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Sauvegarde Locale
            </CardTitle>
            <CardDescription>
              Téléchargez une copie complète de vos données (Élèves, Notes, Classes, etc.) sur votre ordinateur.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackup} className="w-full">
              Créer une sauvegarde
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-destructive" />
              Restauration
            </CardTitle>
            <CardDescription>
              Restaurez les données à partir d'un fichier de sauvegarde. <br/>
              <span className="text-destructive font-bold">Attention : Ceci écrasera les données actuelles.</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Input 
                id="restore" 
                type="file" 
                accept=".json" 
                onChange={handleRestore} 
                disabled={isRestoring}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
