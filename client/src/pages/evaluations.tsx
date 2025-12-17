import { useState, useEffect } from "react";
import { db, type Student, type Class, type Mark } from "@/lib/db";
import { SUBJECTS, DEFAULT_CONFIG, type SubjectConfig } from "@/lib/grading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Loader2, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

  useEffect(() => {
    db.classes.toArray().then(setClasses);
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      db.students.where("classId").equals(parseInt(selectedClassId)).toArray().then(setStudents);
      loadMarks();
    }
  }, [selectedClassId, selectedTrimestre]);

  const loadMarks = async () => {
    if (!selectedClassId) return;
    const allMarks = await db.marks.toArray(); 
    setMarks(allMarks);
  };

  const handleMarkChange = (studentId: number, type: 'res' | 'comp' | 'global', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) && value !== "") return; // Allow empty string to clear

    // Optimistic update
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

  const getMarkValue = (studentId: number, type: 'res' | 'comp' | 'global') => {
    const subId = selectedSubjectId + (type !== 'global' ? `_${type}` : '');
    const m = marks.find(m => 
      m.studentId === studentId && 
      m.subjectId === subId && 
      m.trimestre === parseInt(selectedTrimestre)
    );
    return m?.value?.toString() || "";
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
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Settings2 className="w-4 h-4" /> Configurer Barèmes
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Barèmes pour {currentSubject?.label}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {currentSubject?.hasSub ? (
                <>
                  <div className="space-y-2">
                    <Label>Max Ressources</Label>
                    <Input type="number" defaultValue={currentConfig.maxRes} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Compétences</Label>
                    <Input type="number" defaultValue={currentConfig.maxComp} />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Max Note Globale</Label>
                  <Input type="number" defaultValue={currentConfig.maxGlobal} />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsConfigOpen(false)}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
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
          Veuillez sélectionner une classe pour commencer la saisie.
        </div>
      )}
    </div>
  );
}
