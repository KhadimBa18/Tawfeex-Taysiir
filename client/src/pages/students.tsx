import { useState, useEffect } from "react";
import { db, type Student, type Class } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Upload, FileUp, IdCard, FileText, FileSpreadsheet, FileType } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table as DocTable, TableRow as DocTableRow, TableCell as DocTableCell, WidthType, Footer, TextRun, AlignmentType } from "docx";

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
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

    const duplicate = students.find(s => 
      s.firstName.toLowerCase() === newStudent.firstName?.toLowerCase() &&
      s.lastName.toLowerCase() === newStudent.lastName?.toLowerCase() &&
      s.classId === newStudent.classId
    );

    if (duplicate && !newStudent.id) {
       if (!confirm("Un élève avec ce nom existe déjà dans cette classe. Continuer ?")) {
         return;
       }
    }

    try {
      if (newStudent.id) {
        await db.students.update(newStudent.id, newStudent);
      } else {
        const matricule = await generateMatricule();
        await db.students.add({
          ...newStudent,
          matricule,
          sex: newStudent.sex as 'M' | 'F'
        } as Student);
      }
      
      toast({ title: "Succès", description: "Élève enregistré" });
      setIsDialogOpen(false);
      loadData();
      setNewStudent({ sex: 'M' });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Supprimer cet élève ?")) {
      await db.students.delete(id);
      loadData();
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

        let imported = 0;
        let skipped = 0;

        for (const row of data) {
          if (row.Prénom && row.Nom) {
            let classId = 0;
            if (row.Classe) {
                const cls = classes.find(c => c.name.toLowerCase() === row.Classe.toString().toLowerCase());
                if (cls) classId = cls.id!;
            }
            if (!classId && selectedClassFilter !== 'all') {
               classId = parseInt(selectedClassFilter);
            }
            if (!classId) {
                skipped++; 
                continue;
            }

            const exists = await db.students.where({
                firstName: row.Prénom,
                lastName: row.Nom,
                classId: classId
            }).first();

            if (!exists) {
                const matricule = await generateMatricule();
                await db.students.add({
                  matricule,
                  firstName: row.Prénom,
                  lastName: row.Nom,
                  sex: row.Sexe === 'F' ? 'F' : 'M',
                  classId: classId,
                  dob: row.DateNaissance,
                  pob: row.LieuNaissance
                });
                imported++;
            } else {
                skipped++;
            }
          }
        }
        
        toast({ title: "Import terminé", description: `${imported} ajoutés, ${skipped} ignorés.` });
        setIsImportOpen(false);
        loadData();
      } catch (err) {
        toast({ title: "Erreur", description: "Échec de l'importation", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  const getFilteredData = () => {
    return students.filter(s => {
      const matchesSearch = s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.matricule.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClassFilter === "all" || s.classId.toString() === selectedClassFilter;
      return matchesSearch && matchesClass;
    });
  };

  const FOOTER_TEXT = "Tawfeex_ak_Taysiir / khadimba18@gmail.com / 77 737 95 80";

  const exportPDFList = () => {
    const doc = new jsPDF();
    const clsName = selectedClassFilter !== 'all' ? classes.find(c => c.id === parseInt(selectedClassFilter))?.name : 'Tous';
    
    doc.text(`Liste Nominative - Classe: ${clsName}`, 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Matricule', 'Prénom', 'Nom', 'Sexe', 'Né(e) le', 'À']],
      body: getFilteredData().map(s => [
        s.matricule, s.firstName, s.lastName, s.sex, s.dob || '-', s.pob || '-'
      ]),
    });
    
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(FOOTER_TEXT, 105, 290, { align: "center" });
    }
    
    doc.save(`Liste_Eleves_${clsName}.pdf`);
  };

  const exportExcelList = () => {
    const clsName = selectedClassFilter !== 'all' ? classes.find(c => c.id === parseInt(selectedClassFilter))?.name : 'Global';
    const data = getFilteredData().map(s => ({
      "Matricule": s.matricule,
      "Prénom": s.firstName,
      "Nom": s.lastName,
      "Sexe": s.sex,
      "Date Naissance": s.dob,
      "Lieu Naissance": s.pob,
      "Classe": classes.find(c => c.id === s.classId)?.name,
      "Footer": FOOTER_TEXT
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Élèves");
    XLSX.writeFile(wb, `Eleves_${clsName}.xlsx`);
  };

  const exportWordList = async () => {
     const clsName = selectedClassFilter !== 'all' ? classes.find(c => c.id === parseInt(selectedClassFilter))?.name : 'Tous';
     const rows = getFilteredData().map(s => 
      new DocTableRow({
        children: [
          new DocTableCell({ children: [new Paragraph(s.matricule)] }),
          new DocTableCell({ children: [new Paragraph(s.firstName)] }),
          new DocTableCell({ children: [new Paragraph(s.lastName)] }),
          new DocTableCell({ children: [new Paragraph(s.sex)] }),
          new DocTableCell({ children: [new Paragraph(s.dob || "")] }),
        ],
      })
    );

    const doc = new Document({
      sections: [{
        footers: {
            default: new Footer({
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun(FOOTER_TEXT)],
                    }),
                ],
            }),
        },
        children: [
          new Paragraph(`Liste Nominative - ${clsName}`),
          new DocTable({
             rows: [
               new DocTableRow({
                 children: [
                   new DocTableCell({ children: [new Paragraph("Matricule")] }),
                   new DocTableCell({ children: [new Paragraph("Prénom")] }),
                   new DocTableCell({ children: [new Paragraph("Nom")] }),
                   new DocTableCell({ children: [new Paragraph("Sexe")] }),
                   new DocTableCell({ children: [new Paragraph("Date Naiss.")] }),
                 ]
               }),
               ...rows
             ],
             width: { size: 100, type: WidthType.PERCENTAGE }
          })
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Liste_Eleves_${clsName}.docx`);
  };

  const generateCard = (student: Student) => {
    const doc = new jsPDF({ format: 'a7', orientation: 'landscape' });
    
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 105, 74, 'F');
    
    doc.setLineWidth(1);
    doc.setDrawColor(41, 128, 185); 
    doc.rect(2, 2, 101, 70);

    doc.setFontSize(8);
    doc.setTextColor(41, 128, 185);
    doc.text("RÉPUBLIQUE DU SÉNÉGAL", 52.5, 8, { align: "center" });
    doc.text("TAWFEEX AK TAYSIIR", 52.5, 12, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("CARTE SCOLAIRE", 52.5, 20, { align: "center" });

    doc.rect(5, 25, 25, 30);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("PHOTO", 17.5, 40, { align: "center" });

    doc.setFontSize(8);
    doc.text(`Prénom: ${student.firstName}`, 35, 30);
    doc.text(`Nom: ${student.lastName}`, 35, 35);
    doc.text(`Né(e) le: ${student.dob || '-'}`, 35, 40);
    doc.text(`Classe: ${classes.find(c => c.id === student.classId)?.name || '-'}`, 35, 45);
    doc.text(`Matricule: ${student.matricule}`, 35, 50);

    doc.setFontSize(6);
    doc.text("Le Directeur", 80, 60, { align: "center" });
    
    doc.setFontSize(5);
    doc.text(FOOTER_TEXT, 52.5, 70, { align: "center" });
    
    doc.save(`Carte_${student.matricule}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gestion des Élèves</h1>
          <p className="text-muted-foreground">Inscriptions, listes et cartes scolaires.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
           <Button className="bg-red-600 hover:bg-red-700 text-white" size="icon" onClick={exportPDFList} title="PDF"><FileText className="w-4 h-4" /></Button>
           <Button className="bg-green-600 hover:bg-green-700 text-white" size="icon" onClick={exportExcelList} title="Excel"><FileSpreadsheet className="w-4 h-4" /></Button>
           <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="icon" onClick={exportWordList} title="Word"><FileType className="w-4 h-4" /></Button>

          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <FileUp className="w-4 h-4" /> Importer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importer Excel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 text-center">
                <div className="border-2 border-dashed rounded-lg p-8 hover:bg-muted/50 transition-colors">
                  <Input 
                    type="file" 
                    accept=".xlsx,.xls" 
                    onChange={handleImport} 
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Format: Prénom, Nom, Sexe, DateNaissance, LieuNaissance, Classe<br/>
                    Nom du fichier suggéré: élèves_CI.xlsx
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setNewStudent({ sex: 'M' })}>
                <Plus className="w-4 h-4" /> Nouvel Élève
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{newStudent.id ? 'Modifier' : 'Inscrire'} un élève</DialogTitle>
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
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
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
             <SelectTrigger className="w-[180px]">
               <SelectValue placeholder="Filtrer par classe" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Toutes les classes</SelectItem>
               {classes.map(c => <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>)}
             </SelectContent>
          </Select>
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
              {getFilteredData().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun élève trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredData().map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.matricule}</TableCell>
                    <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                    <TableCell>{s.sex}</TableCell>
                    <TableCell>{classes.find(c => c.id === s.classId)?.name || '?'}</TableCell>
                    <TableCell>{s.dob || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                         <Button variant="ghost" size="icon" title="Carte Scolaire" onClick={() => generateCard(s)}>
                            <IdCard className="w-4 h-4 text-blue-500" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => { setNewStudent(s); setIsDialogOpen(true); }}>
                          <Pencil className="w-4 h-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id!)}>
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
