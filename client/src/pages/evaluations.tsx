import { useState, useEffect } from "react";
import { db, type Student, type Class, type Mark } from "@/lib/db";
import { SUBJECTS, DEFAULT_CONFIG, type SubjectConfig } from "@/lib/grading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2, Settings2, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import * as XLSX from 'xlsx';

export default function Evaluations() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>("1");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(SUBJECTS[0].id);
  
  const [configs, setConfigs] = useState<SubjectConfig[]>(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadInitData();
  }, [user]);

  const loadInitData = async () => {
    let cls = await db.classes.toArray();
    if (user?.role === 'teacher' && user.classId) {
      cls = cls.filter(c => c.id === user.classId);
      if (cls.length > 0) {
        setSelectedClassId(cls[0].id!.toString());
      }
    }
    setClasses(cls);

    const storedConfigs = await db.configs.toArray();
    if (storedConfigs.length > 0) {
      const merged = DEFAULT_CONFIG.map(def => {
        const found = storedConfigs.find(s => s.subjectId === def.subjectId);
        return found || def;
      });
      setConfigs(merged);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      db.students.where("classId").equals(parseInt(selectedClassId)).toArray().then(setStudents);
      loadMarks();
    }
  }, [selectedClassId, selectedTrimestre]);

  const loadMarks = async () => {
    if (!selectedClassId) return;
    const allMarks = await db.marks.where("classId").equals(parseInt(selectedClassId)).toArray();
    setMarks(allMarks);
  };

  const saveConfig = async () => {
    try {
      await db.configs.clear();
      await db.configs.bulkAdd(configs);
      toast({ title: "Succès", description: "Barèmes enregistrés" });
      setIsConfigOpen(false);
    } catch (e) {
      toast({ title: "Erreur", description: "Échec de l'enregistrement", variant: "destructive" });
    }
  };

  const handleConfigChange = (subjectId: string, field: keyof SubjectConfig, value: string) => {
    const num = parseInt(value) || 0;
    setConfigs(prev => prev.map(c => c.subjectId === subjectId ? { ...c, [field]: num } : c));
  };

  const handleMarkChange = (studentId: number, type: 'res' | 'comp' | 'global', value: string) => {
    const numValue = parseFloat(value);
    
    // VALIDATION: Check max score
    const currentSub = SUBJECTS.find(s => s.id === selectedSubjectId);
    const conf = configs.find(c => c.subjectId === selectedSubjectId) || {};
    let max = 20; // fallback
    if (currentSub?.hasSub) {
        max = type === 'res' ? (conf.maxRes || 40) : (conf.maxComp || 60);
    } else {
        max = conf.maxGlobal || 20;
    }

    if (!isNaN(numValue) && numValue > max) {
        toast({ title: "Erreur", description: `La note ne peut pas dépasser ${max}`, variant: "destructive" });
        return;
    }
    if (isNaN(numValue) && value !== "") return; 

    const newMark = {
      studentId,
      classId: parseInt(selectedClassId),
      subjectId: selectedSubjectId + (type !== 'global' ? `_${type}` : ''),
      trimestre: parseInt(selectedTrimestre) as 1|2|3,
      value: isNaN(numValue) ? 0 : numValue
    };

    setMarks(prev => {
      const filtered = prev.filter(m => 
        !(m.studentId === studentId && 
          m.subjectId === newMark.subjectId && 
          m.trimestre === newMark.trimestre)
      );
      return [...filtered, newMark];
    });

    db.marks.put(newMark as any);
  };

  const getMarkValue = (studentId: number, type: 'res' | 'comp' | 'global', subjId = selectedSubjectId) => {
    const subId = subjId + (type !== 'global' ? `_${type}` : '');
    const m = marks.find(m => 
      m.studentId === studentId && 
      m.subjectId === subId && 
      m.trimestre === parseInt(selectedTrimestre)
    );
    return m?.value?.toString() || "";
  };

  // Excel Export/Import
  const exportGrades = () => {
    if (!selectedClassId) return;
    const cls = classes.find(c => c.id === parseInt(selectedClassId));
    
    // Export All Subjects
    const data = students.map(s => {
      const row: any = {
        "Matricule": s.matricule,
        "Prénom": s.firstName,
        "Nom": s.lastName,
      };
      
      SUBJECTS.forEach(sub => {
         if (sub.hasSub) {
            row[`${sub.label} (Res)`] = getMarkValue(s.id!, 'res', sub.id);
            row[`${sub.label} (Comp)`] = getMarkValue(s.id!, 'comp', sub.id);
         } else {
            row[`${sub.label}`] = getMarkValue(s.id!, 'global', sub.id);
         }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Attempt Data Validation (Limited in SheetJS Free)
    // We can add comments or specific formatting, but strict Data Validation 
    // requires Pro version or complex XML manipulation.
    // However, we can set cell type to 'n' (number).
    // Let's rely on robust IMPORT validation.

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Notes");
    XLSX.writeFile(wb, `Notes_${cls?.name}_T${selectedTrimestre}.xlsx`);
  };

  const importGrades = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const newMarks: Mark[] = [];
        let errorCount = 0;

        for(const row of data) {
            const student = students.find(s => s.matricule === row.Matricule);
            if (student) {
                for(const sub of SUBJECTS) {
                    const conf = configs.find(c => c.subjectId === sub.id) || {};

                    if (sub.hasSub) {
                        const res = row[`${sub.label} (Res)`];
                        const comp = row[`${sub.label} (Comp)`];
                        
                        if (res !== undefined) {
                            const val = parseFloat(res);
                            const max = conf.maxRes || 40;
                            if (isNaN(val) || val > max) { errorCount++; } 
                            else {
                                newMarks.push({
                                    studentId: student.id!,
                                    classId: parseInt(selectedClassId),
                                    subjectId: `${sub.id}_res`,
                                    trimestre: parseInt(selectedTrimestre) as 1|2|3,
                                    value: val
                                });
                            }
                        }
                        if (comp !== undefined) {
                            const val = parseFloat(comp);
                            const max = conf.maxComp || 60;
                            if (isNaN(val) || val > max) { errorCount++; }
                            else {
                                newMarks.push({
                                    studentId: student.id!,
                                    classId: parseInt(selectedClassId),
                                    subjectId: `${sub.id}_comp`,
                                    trimestre: parseInt(selectedTrimestre) as 1|2|3,
                                    value: val
                                });
                            }
                        }
                    } else {
                        const valRaw = row[`${sub.label}`];
                        if (valRaw !== undefined) {
                            const val = parseFloat(valRaw);
                            const max = conf.maxGlobal || 20;
                            if (isNaN(val) || val > max) { errorCount++; }
                            else {
                                newMarks.push({
                                    studentId: student.id!,
                                    classId: parseInt(selectedClassId),
                                    subjectId: sub.id,
                                    trimestre: parseInt(selectedTrimestre) as 1|2|3,
                                    value: val
                                });
                            }
                        }
                    }
                }
            }
        }

        if (newMarks.length > 0) {
            await db.transaction('rw', db.marks, async () => {
                for (const m of newMarks) {
                   const existing = await db.marks.where({
                       studentId: m.studentId, 
                       subjectId: m.subjectId, 
                       trimestre: m.trimestre
                   }).first();
                   
                   if (existing) m.id = existing.id;
                   await db.marks.put(m);
                }
            });
            loadMarks();
            if (errorCount > 0) {
                toast({ title: "Import partiel", description: `${newMarks.length} notes importées. ${errorCount} erreurs (valeur invalide ou > barème).`, variant: "warning" });
            } else {
                toast({ title: "Import terminé", description: `Toutes les notes ont été importées.` });
            }
        } else {
            toast({ title: "Aucune note", description: "Aucune note valide trouvée.", variant: "destructive" });
        }

      } catch (e) {
        toast({ title: "Erreur", description: "Fichier invalide", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  const currentSubject = SUBJECTS.find(s => s.id === selectedSubjectId);
  const currentConfig = configs.find(c => c.subjectId === selectedSubjectId) || { subjectId: selectedSubjectId } as SubjectConfig;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Évaluations</h1>
          <p className="text-muted-foreground">Saisie des notes par trimestre et discipline.</p>
        </div>
        <div className="flex gap-2">
           <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={exportGrades} title="Exporter Excel">
             <Download className="w-4 h-4 mr-2" /> Exporter
           </Button>
           <div className="relative">
             <Button className="bg-orange-600 hover:bg-orange-700 text-white cursor-pointer" size="sm">
               <Upload className="w-4 h-4 mr-2" /> Importer
             </Button>
             <Input 
               type="file" 
               accept=".xlsx" 
               className="absolute inset-0 opacity-0 cursor-pointer" 
               onChange={importGrades}
             />
           </div>

          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="w-4 h-4" /> Barèmes
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurer les Barèmes</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                {configs.map((conf) => {
                  const sub = SUBJECTS.find(s => s.id === conf.subjectId);
                  if (!sub) return null;
                  return (
                    <div key={conf.subjectId} className="border p-3 rounded-lg space-y-2">
                      <h4 className="font-semibold">{sub.label}</h4>
                      {sub.hasSub ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Max Res</Label>
                            <Input 
                              type="number" 
                              value={conf.maxRes} 
                              onChange={(e) => handleConfigChange(conf.subjectId, 'maxRes', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Max Comp</Label>
                            <Input 
                              type="number" 
                              value={conf.maxComp} 
                              onChange={(e) => handleConfigChange(conf.subjectId, 'maxComp', e.target.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Label className="text-xs">Max Note</Label>
                          <Input 
                            type="number" 
                            value={conf.maxGlobal} 
                            onChange={(e) => handleConfigChange(conf.subjectId, 'maxGlobal', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button onClick={saveConfig}>Enregistrer Tout</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-secondary/10 border-none">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Classe</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Trimestre</label>
              <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1er Trimestre</SelectItem>
                  <SelectItem value="2">2ème Trimestre</SelectItem>
                  <SelectItem value="3">3ème Trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Discipline</label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClassId ? (
        <Card>
          <CardContent className="pt-0 px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Matricule</TableHead>
                  <TableHead className="w-[200px]">Prénom & Nom</TableHead>
                  {currentSubject?.hasSub ? (
                    <>
                      <TableHead>Ressources <span className="text-xs text-muted-foreground">/{currentConfig.maxRes || 40}</span></TableHead>
                      <TableHead>Compétences <span className="text-xs text-muted-foreground">/{currentConfig.maxComp || 60}</span></TableHead>
                    </>
                  ) : (
                    <TableHead>Note <span className="text-xs text-muted-foreground">/{currentConfig.maxGlobal || 20}</span></TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.matricule}</TableCell>
                    <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                    {currentSubject?.hasSub ? (
                      <>
                        <TableCell>
                          <Input 
                            type="number" 
                            className="w-24" 
                            value={getMarkValue(s.id!, 'res')}
                            onChange={e => handleMarkChange(s.id!, 'res', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            className="w-24" 
                            value={getMarkValue(s.id!, 'comp')}
                            onChange={e => handleMarkChange(s.id!, 'comp', e.target.value)}
                          />
                        </TableCell>
                      </>
                    ) : (
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-24" 
                          value={getMarkValue(s.id!, 'global')}
                          onChange={e => handleMarkChange(s.id!, 'global', e.target.value)}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
          {user?.role === 'teacher' && classes.length === 0 
            ? "Aucune classe ne vous est attribuée. Contactez l'administrateur." 
            : "Veuillez sélectionner une classe pour commencer la saisie."}
        </div>
      )}
    </div>
  );
}
