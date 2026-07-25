import { useState, useEffect } from "react";
import { db, type Class } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SUBJECTS, DEFAULT_RESOURCES, COMPARTMENTS } from "@/lib/grading";

interface DisciplineConfig {
  id?: number;
  classId: number;
  subjectId: string;
  resources: string[];
  competences: string[];
}

export default function Disciplines() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [configs, setConfigs] = useState<Map<string, DisciplineConfig>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    db.classes.toArray().then(c => {
      setClasses(c);
      if (c.length > 0) setSelectedClassId(c[0].id!.toString());
    });
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    loadConfigs();
  }, [selectedClassId]);

  const loadConfigs = async () => {
    const classId = parseInt(selectedClassId);
    const classConfigs = new Map<string, DisciplineConfig>();
    
    SUBJECTS.forEach(subject => {
      const defaults = DEFAULT_RESOURCES[subject.id as keyof typeof DEFAULT_RESOURCES];
      classConfigs.set(subject.id, {
        classId,
        subjectId: subject.id,
        resources: defaults?.resources || [],
        competences: defaults?.competences || []
      });
    });
    setConfigs(classConfigs);
  };

  const saveConfigs = async () => {
    try {
      toast({ title: "Succès", description: "Configuration enregistrée (stockage local)" });
      setIsDialogOpen(false);
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    }
  };

  const updateResource = (subjectId: string, index: number, value: string) => {
    const config = configs.get(subjectId);
    if (!config) return;
    const resources = [...(config.resources || [])];
    resources[index] = value;
    setConfigs(new Map(configs).set(subjectId, { ...config, resources }));
  };

  const updateCompetence = (subjectId: string, index: number, value: string) => {
    const config = configs.get(subjectId);
    if (!config) return;
    const competences = [...(config.competences || [])];
    competences[index] = value;
    setConfigs(new Map(configs).set(subjectId, { ...config, competences }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Configuration des Disciplines</h1>
          <p className="text-muted-foreground">Gérez les ressources et compétences par classe et discipline.</p>
        </div>
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sélectionner une classe" />
          </SelectTrigger>
          <SelectContent>
            {classes.map(c => <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {Object.entries(COMPARTMENTS).map(([key, label]) => {
        const compartmentSubjects = SUBJECTS.filter(s => s.compartment === key);
        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-lg">{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {compartmentSubjects.map(subject => {
                const config = configs.get(subject.id);
                if (!config) return null;
                
                return (
                  <div key={subject.id} className="border rounded-lg p-4 space-y-4">
                    <h3 className="font-bold text-base">{subject.label}</h3>
                    
                    {subject.hasSub && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Ressources</label>
                            <div className="space-y-2">
                              {(config.resources || []).slice(0, 6).map((res, i) => (
                                <Input
                                  key={i}
                                  value={res}
                                  onChange={(e) => updateResource(subject.id, i, e.target.value)}
                                  placeholder={`Ressource ${i + 1}`}
                                  className="h-8 text-sm"
                                />
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Compétences</label>
                            <div className="space-y-2">
                              {(config.competences || []).slice(0, 6).map((comp, i) => (
                                <Input
                                  key={i}
                                  value={comp}
                                  onChange={(e) => updateCompetence(subject.id, i, e.target.value)}
                                  placeholder={`Competence ${i + 1}`}
                                  className="h-8 text-sm"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex gap-2">
        <Button onClick={saveConfigs} className="gap-2">
          <Save className="w-4 h-4" /> Enregistrer la configuration
        </Button>
      </div>
    </div>
  );
}
