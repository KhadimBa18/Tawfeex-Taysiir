import { useState, useEffect } from "react";
import { db, type Student, type Class } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Download, Upload, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { toast } = useToast();

  const [newStudent, setNewStudent] = useState<Partial<Student>>({ sex: 'M' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [s, c] = await Promise.all([
      db.students.toArray(),
      db.classes.toArray()
    ]);
    setStudents(s);
    setClasses(c);
  };

  const generateMatricule = async () => {
    const count = await db.students.count();
    return `KB_${(count + 1).toString().padStart(4, '0')}`;
  };

  const handleSave = async () => {
    if (!newStudent.firstName || !newStudent.lastName || !newStudent.classId) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires", variant: "destructive" });
      return;
    }

    try {
      const matricule = await generateMatricule();
      await db.students.add({
        ...newStudent,
        matricule,
        sex: newStudent.sex as 'M' | 'F'
      } as Student);
      
      toast({ title: "Succès", description: "Élève ajouté avec succès" });
      setIsDialogOpen(false);
      loadData();
      setNewStudent({ sex: 'M' });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'ajouter l'élève", variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        // Basic validation and import
        let imported = 0;
        for (const row of data) {
          if (row.Prénom && row.Nom && row.Classe) {
            // Find class ID
            const className = row.Classe.toString().trim();
            let cls = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
            
            // Auto-create class if missing (optional feature, but helpful)
            if (!cls) {
               // Skip for now or handle
               continue; 
            }

            const matricule = await generateMatricule();
            await db.students.add({
              matricule,
              firstName: row.Prénom,
              lastName: row.Nom,
              sex: row.Sexe === 'F' ? 'F' : 'M',
              classId: cls.id!,
              dob: row.DateNaissance,
              pob: row.LieuNaissance
            });
            imported++;
          }
        }
        
        toast({ title: "Import terminé", description: `${imported} élèves importés.` });
        setIsImportOpen(false);
        loadData();
      } catch (err) {
        toast({ title: "Erreur", description: "Échec de l'importation", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredStudents = students.filter(s => 
    s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.matricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gestion des Élèves</h1>
          <p className="text-muted-foreground">Inscriptions, listes et cartes scolaires.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <FileUp className="w-4 h-4" /> Importer Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importer depuis Excel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 text-center">
                <div className="border-2 border-dashed rounded-lg p-8 hover:bg-muted/50 transition-colors">
                  <Input 
                    type="file" 
                    accept=".xlsx,.xls" 
                    onChange={handleImport} 
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Format: Prénom, Nom, Sexe, DateNaissance, LieuNaissance, Classe</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Nouvel Élève
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inscrire un élève</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prénom</label>
                    <Input value={newStudent.firstName || ""} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nom</label>
                    <Input value={newStudent.lastName || ""} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sexe</label>
                     <Select 
                      value={newStudent.sex} 
                      onValueChange={(v) => setNewStudent({...newStudent, sex: v as 'M'|'F'})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Classe</label>
                     <Select 
                      value={newStudent.classId?.toString()} 
                      onValueChange={(v) => setNewStudent({...newStudent, classId: parseInt(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-sm font-medium">Date de naissance</label>
                    <Input type="date" value={newStudent.dob || ""} onChange={e => setNewStudent({...newStudent, dob: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lieu de naissance</label>
                    <Input value={newStudent.pob || ""} onChange={e => setNewStudent({...newStudent, pob: e.target.value})} />
                  </div>
                </div>

              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleSave}>Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom ou matricule..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matricule</TableHead>
                <TableHead>Prénom & Nom</TableHead>
                <TableHead>Sexe</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Né(e) le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun élève trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.matricule}</TableCell>
                    <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                    <TableCell>{s.sex}</TableCell>
                    <TableCell>{classes.find(c => c.id === s.classId)?.name || '?'}</TableCell>
                    <TableCell>{s.dob || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                         <Button variant="ghost" size="icon">
                          <Pencil className="w-4 h-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
