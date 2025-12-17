import { useState, useEffect } from "react";
import { db, type Student, type Class, type Mark, type User } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SUBJECTS, normalize } from "@/lib/grading";

export default function Bulletins() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>("1");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    db.classes.toArray().then(setClasses);
    db.users.toArray().then(setUsers);
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      db.students.where("classId").equals(parseInt(selectedClassId)).toArray().then(setStudents);
    }
  }, [selectedClassId]);

  const generatePDF = (student: Student) => {
    const doc = new jsPDF();
    const cls = classes.find(c => c.id === student.classId);
    const teacher = users.find(u => u.classId === student.classId);
    const director = users.find(u => u.role === 'director' || u.role === 'admin'); // Fallback

    // Draw Flag of Senegal (Vertical Stripes: Green, Yellow, Red)
    // Rect size: 20x15
    doc.setFillColor(0, 147, 88); // Green
    doc.rect(15, 10, 8, 15, 'F');
    doc.setFillColor(252, 221, 9); // Yellow
    doc.rect(23, 10, 8, 15, 'F');
    doc.setFillColor(239, 51, 64); // Red
    doc.rect(31, 10, 8, 15, 'F');
    
    // Star (Green) in the middle of Yellow stripe
    // Simple 5-point star or just a small circle if drawing star is complex in pure jsPDF lines
    doc.setFillColor(0, 147, 88);
    doc.circle(27, 17.5, 2, 'F');

    // Header Text
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("RÉPUBLIQUE DU SÉNÉGAL", 45, 15);
    doc.text("MINISTÈRE DE L'ÉDUCATION NATIONALE", 45, 20);
    doc.text("IA: DAKAR / IEF: PARCELLES ASSAINIES", 45, 25);
    doc.text("ÉCOLE: TAWFEEX AK TAYSIIR", 45, 30);
    
    // Logo Placeholder (Text for now or simple circle)
    doc.setDrawColor(0,0,0);
    doc.circle(180, 20, 10);
    doc.setFontSize(8);
    doc.text("LOGO", 176, 20);

    // Title Zone
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185); // Blue
    doc.setFont("helvetica", "bold");
    doc.text("BULLETIN DE NOTES", 105, 45, { align: "center" });
    
    // Student Info Box (Styled)
    doc.setDrawColor(41, 128, 185);
    doc.setFillColor(236, 240, 241); // Light Gray/Blue
    doc.roundedRect(15, 50, 180, 25, 3, 3, 'FD');
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`${student.firstName} ${student.lastName}`, 20, 60);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Matricule: ${student.matricule}`, 20, 68);
    doc.text(`Classe: ${cls?.name}`, 80, 68);
    doc.text(`Trimestre: ${selectedTrimestre}${selectedTrimestre === '1' ? 'er' : 'ème'}`, 140, 68);
    doc.text(`Année: 2024-2025`, 170, 68);

    // Prepare Table Data (Mocked marks for now, ideally fetch real marks)
    const tableBody = SUBJECTS.map(sub => [
        sub.label,
        '--', // Note
        '--', // Coeff
        '--', // Total
        '--', // Appréciation
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['Discipline', 'Note', 'Coeff', 'Total', 'Appréciation']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 2 },
      alternateRowStyles: { fillColor: [240, 248, 255] }
    });

    // Summary & Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Stats Box
    doc.setDrawColor(0);
    doc.setFillColor(255, 255, 255);
    doc.rect(130, finalY, 65, 25);
    doc.text("Moyenne: -- / 20", 135, finalY + 7);
    doc.text("Rang: -- / --", 135, finalY + 14);
    doc.text("Décision: --", 135, finalY + 21);

    // Signatures
    doc.text(`L'Enseignant(e):`, 30, finalY + 40);
    doc.setFont("helvetica", "bold");
    doc.text(teacher?.fullName || "Non assigné", 30, finalY + 47);
    
    doc.setFont("helvetica", "normal");
    doc.text("Le Directeur:", 150, finalY + 40);
    doc.setFont("helvetica", "bold");
    doc.text(director?.fullName || "Le Directeur", 150, finalY + 47);

    // Footer
    const footerText = "Tawfeex_ak_Taysiir / khadimba18@gmail.com / 77 737 95 80";
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(footerText, 105, 285, { align: "center" });

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
                    <TableCell>--/20</TableCell>
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
