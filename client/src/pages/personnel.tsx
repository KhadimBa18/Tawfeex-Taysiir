import { useState, useEffect } from "react";
import { db, type User, type Class } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Upload, FileText, FileSpreadsheet, FileType } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table as DocTable, TableRow as DocTableRow, TableCell as DocTableCell, WidthType, Footer, TextRun, AlignmentType } from "docx";
import { useAuth } from "@/hooks/use-auth";

export default function Personnel() {
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [newUser, setNewUser] = useState<Partial<User>>({ role: "teacher" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allUsers, allClasses] = await Promise.all([
      db.users.toArray(),
      db.classes.toArray()
    ]);
    setUsers(allUsers);
    setClasses(allClasses);
  };

  const handleSave = async () => {
    if (!newUser.username || !newUser.fullName) {
       toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires", variant: "destructive" });
       return;
    }
    
    try {
      if (newUser.id) {
        await db.users.update(newUser.id, newUser);
      } else {
        await db.users.add({
          ...newUser,
          passwordHash: newUser.passwordHash || "123456" 
        } as User);
      }
      
      toast({ title: "Succès", description: "Membre enregistré avec succès" });
      setIsDialogOpen(false);
      loadData();
      setNewUser({ role: "teacher" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Supprimer ce membre ?")) {
      await db.users.delete(id);
      loadData();
      toast({ title: "Supprimé", description: "Membre supprimé" });
    }
  };

  const handleEdit = (user: User) => {
    setNewUser(user);
    setIsDialogOpen(true);
  };

  const FOOTER_TEXT = "Tawfeex_ak_Taysiir / khadimba18@gmail.com / 77 737 95 80";

  // Export Functions
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Liste du Personnel - Tawfeex ak Taysiir", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Nom Complet', 'Matricule', 'Rôle', 'Tel', 'Email', 'Classe']],
      body: users.map(u => [
        u.fullName, 
        u.matricule || '-', 
        u.role, 
        u.tel || '-', 
        u.email || '-',
        classes.find(c => c.id === u.classId)?.name || '-'
      ]),
    });
    
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(FOOTER_TEXT, 105, 290, { align: "center" });
    }
    
    doc.save("personnel.pdf");
  };

  const exportExcel = () => {
    const data = users.map(u => ({
      "Nom Complet": u.fullName,
      "Matricule": u.matricule,
      "Rôle": u.role,
      "Téléphone": u.tel,
      "Email": u.email,
      "Classe": classes.find(c => c.id === u.classId)?.name || '-',
      "Footer": FOOTER_TEXT
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Personnel");
    XLSX.writeFile(wb, "personnel.xlsx");
  };

  const exportWord = async () => {
    const rows = users.map(u => 
      new DocTableRow({
        children: [
          new DocTableCell({ children: [new Paragraph(u.fullName)] }),
          new DocTableCell({ children: [new Paragraph(u.matricule || "")] }),
          new DocTableCell({ children: [new Paragraph(u.role)] }),
          new DocTableCell({ children: [new Paragraph(u.tel || "")] }),
          new DocTableCell({ children: [new Paragraph(classes.find(c => c.id === u.classId)?.name || "")] }),
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
          new Paragraph("Liste du Personnel"),
          new DocTable({
             rows: [
               new DocTableRow({
                 children: [
                   new DocTableCell({ children: [new Paragraph("Nom")] }),
                   new DocTableCell({ children: [new Paragraph("Matricule")] }),
                   new DocTableCell({ children: [new Paragraph("Rôle")] }),
                   new DocTableCell({ children: [new Paragraph("Tel")] }),
                   new DocTableCell({ children: [new Paragraph("Classe")] }),
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
    saveAs(blob, "personnel.docx");
  };

  const handleSync = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentUser?.role !== 'admin') {
      toast({ title: "Accès refusé", description: "Seul l'administrateur peut synchroniser les données.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        await db.transaction('rw', db.users, db.classes, db.students, db.marks, async () => {
          if (json.students) await db.students.bulkPut(json.students);
          if (json.marks) await db.marks.bulkPut(json.marks);
        });
        toast({ title: "Synchronisation réussie", description: "Les données ont été fusionnées." });
        loadData();
        setIsSyncOpen(false);
      } catch (err) {
        toast({ title: "Erreur", description: "Fichier invalide", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Personnel</h1>
          <p className="text-muted-foreground">Gestion des enseignants et de l'administration.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={isSyncOpen} onOpenChange={setIsSyncOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" /> Sync Données
              </Button>
            </DialogTrigger>
            <DialogContent>
               <DialogHeader><DialogTitle>Synchroniser les données</DialogTitle></DialogHeader>
               <div className="py-4">
                 <p className="text-sm text-muted-foreground mb-4">
                   Importez un fichier de sauvegarde d'un collègue pour fusionner les données.
                   Seul l'administrateur peut effectuer cette action.
                 </p>
                 <Input type="file" accept=".json" onChange={handleSync} />
               </div>
            </DialogContent>
          </Dialog>

          <Button className="bg-red-600 hover:bg-red-700 text-white" size="icon" onClick={exportPDF} title="PDF"><FileText className="w-4 h-4" /></Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" size="icon" onClick={exportExcel} title="Excel"><FileSpreadsheet className="w-4 h-4" /></Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="icon" onClick={exportWord} title="Word"><FileType className="w-4 h-4" /></Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setNewUser({ role: 'teacher' })}>
                <Plus className="w-4 h-4" /> Nouveau Membre
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{newUser.id ? 'Modifier' : 'Ajouter'} un membre</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Nom complet</label>
                  <Input value={newUser.fullName || ""} onChange={(e) => setNewUser({...newUser, fullName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Matricule</label>
                  <Input value={newUser.matricule || ""} onChange={(e) => setNewUser({...newUser, matricule: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Téléphone</label>
                  <Input value={newUser.tel || ""} onChange={(e) => setNewUser({...newUser, tel: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={newUser.email || ""} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Identifiant</label>
                  <Input value={newUser.username || ""} onChange={(e) => setNewUser({...newUser, username: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rôle</label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({...newUser, role: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="director">Directeur</SelectItem>
                      <SelectItem value="teacher">Enseignant</SelectItem>
                      <SelectItem value="teacher">Enseignante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newUser.role === 'teacher' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Classe Attribuée</label>
                    <Select 
                      value={newUser.classId?.toString()} 
                      onValueChange={(v) => setNewUser({...newUser, classId: parseInt(v)})}
                    >
                      <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Aucune</SelectItem>
                        {classes.map(c => <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
              placeholder="Rechercher..." 
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
                <TableHead>Nom complet</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Tel</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.matricule || '-'}</TableCell>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell className="capitalize">{u.role === 'teacher' ? 'Enseignant(e)' : u.role}</TableCell>
                  <TableCell>{classes.find(c => c.id === u.classId)?.name || '-'}</TableCell>
                  <TableCell>{u.tel || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}>
                        <Pencil className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id!)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
