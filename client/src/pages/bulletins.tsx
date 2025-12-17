import { useState, useEffect } from "react";
import { db, type Student, type Class, type Mark } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download, Eye } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import generatedImage from '@assets/generated_images/modern_logo_for_school_app_tawfeex_ak_taysiir.png';

export default function Bulletins() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>("1");

  useEffect(() => {
    db.classes.toArray().then(setClasses);
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      db.students.where("classId").equals(parseInt(selectedClassId)).toArray().then(setStudents);
    }
  }, [selectedClassId]);

  const generatePDF = (student: Student) => {
    const doc = new jsPDF();
    const cls = classes.find(c => c.id === student.classId);

    // Header
    doc.setFontSize(10);
    doc.text("IA: DAKAR", 15, 15);
    doc.text("IEF: PARCELLES ASSAINIES", 15, 20);
    doc.text("ÉCOLE: TAWFEEX AK TAYSIIR", 15, 25);
    
    // Logo placeholder
    // doc.addImage(logo, 'PNG', 170, 10, 20, 20);
    doc.setFontSize(16);
    doc.setTextColor(0, 50, 100);
    doc.text("BULLETIN DE NOTES", 105, 40, { align: "center" });
    
    // Student Info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.roundedRect(15, 50, 180, 25, 3, 3);
    doc.text(`Prénom & Nom: ${student.firstName} ${student.lastName}`, 20, 60);
    doc.text(`Classe: ${cls?.name} | Matricule: ${student.matricule}`, 20, 68);
    doc.text(`Trimestre: ${selectedTrimestre}${selectedTrimestre === '1' ? 'er' : 'ème'}`, 120, 68);

    // Table
    autoTable(doc, {
      startY: 85,
      head: [['Discipline', 'Note', 'Coeff', 'Total', 'Appréciation']],
      body: [
        ['Français', '15/20', '2', '30', 'Bien'],
        ['Mathématiques', '14/20', '2', '28', 'Bien'],
        ['Découverte du monde', '16/20', '1', '16', 'Très Bien'],
        ['Éducation musicale', '18/20', '1', '18', 'Excellent'],
        // Mock data for prototype
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }, // Blue header
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Moyenne: 15.5/20", 140, finalY);
    doc.text("Rang: 3ème", 140, finalY + 7);
    
    doc.text("L'Enseignant", 30, finalY + 30);
    doc.text("Le Directeur", 150, finalY + 30);

    doc.setFontSize(8);
    doc.text("Généré par Tawfeex_ak_Taysiir - 77 737 95 80", 105, 280, { align: "center" });

    doc.save(`Bulletin_${student.lastName}_${student.firstName}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Bulletins Scolaires</h1>
          <p className="text-muted-foreground">Génération et impression des bulletins.</p>
        </div>
      </div>

      <Card className="bg-secondary/10 border-none">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {selectedClassId && (
        <Card>
           <CardContent className="pt-0 px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Prénom & Nom</TableHead>
                  <TableHead>Moyenne (Simulée)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.matricule}</TableCell>
                    <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                    <TableCell>15.5/20</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => generatePDF(s)}>
                        <Printer className="w-4 h-4" /> Imprimer PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
