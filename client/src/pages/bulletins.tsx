import { useState, useEffect } from "react";
import { db, type Student, type Class, type Mark, type User } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SUBJECTS, normalize, type SubjectConfig, DEFAULT_CONFIG } from "@/lib/grading";
import generatedImage from '@assets/generated_images/modern_logo_for_school_app_tawfeex_ak_taysiir.png';

export default function Bulletins() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [configs, setConfigs] = useState<SubjectConfig[]>(DEFAULT_CONFIG);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>("1");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    db.classes.toArray().then(setClasses);
    db.users.toArray().then(setUsers);
    db.configs.toArray().then(conf => {
      if (conf.length > 0) {
        const merged = DEFAULT_CONFIG.map(def => {
          const found = conf.find(s => s.subjectId === def.subjectId);
          return found || def;
        });
        setConfigs(merged);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      db.students.where("classId").equals(parseInt(selectedClassId)).toArray().then(setStudents);
      db.marks.where("classId").equals(parseInt(selectedClassId)).toArray().then(setMarks);
    }
  }, [selectedClassId]);

  const getMarkValue = (studentId: number, baseSubjectId: string, type: 'res' | 'comp' | 'global') => {
    const subId = type === 'global' ? baseSubjectId : `${baseSubjectId}_${type}`;
    const m = marks.find(m => 
      m.studentId === studentId && 
      m.subjectId === subId && 
      m.trimestre === parseInt(selectedTrimestre)
    );
    return m ? m.value : null;
  };

  const calculateStudentRank = (studentId: number) => {
    // Calculate average for each student in the class
    const studentAverages = students.map(s => {
      let totalScore = 0;
      let totalMax = 0;
      
      SUBJECTS.forEach(sub => {
        const conf: SubjectConfig = configs.find(c => c.subjectId === sub.id) || { subjectId: sub.id };
        
        if (sub.hasSub) {
          const resVal = getMarkValue(s.id!, sub.id, 'res');
          const resMax = conf.maxRes || 40;
          if (resVal !== null) { totalScore += resVal; totalMax += resMax; }
          
          const compVal = getMarkValue(s.id!, sub.id, 'comp');
          const compMax = conf.maxComp || 60;
          if (compVal !== null) { totalScore += compVal; totalMax += compMax; }
        } else {
          const val = getMarkValue(s.id!, sub.id, 'global');
          const max = conf.maxGlobal || 20;
          if (val !== null) { totalScore += val; totalMax += max; }
        }
      });
      
      const average = totalMax > 0 ? (totalScore / totalMax) * 10 : 0;
      return { studentId: s.id, average };
    });

    // Sort by average descending
    const sorted = studentAverages.sort((a, b) => b.average - a.average);
    
    // Find rank
    let rank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].studentId === studentId) {
        rank = i + 1;
        break;
      }
    }
    
    return { rank, total: students.length };
  };

  const generatePDF = (student: Student) => {
    const doc = new jsPDF();
    const cls = classes.find(c => c.id === student.classId);
    const teacher = users.find(u => u.classId === student.classId);
    const director = users.find(u => u.role === 'director') || users.find(u => u.role === 'admin');

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0); // Black for header text as standard, or use blue if preferred. User asked for blue menu color in header.
    const MENU_BLUE = [41, 128, 185]; // RGB for standard blue used
    
    doc.setTextColor(MENU_BLUE[0], MENU_BLUE[1], MENU_BLUE[2]);
    doc.setFontSize(10);
    doc.text("RÉPUBLIQUE DU SÉNÉGAL", 105, 15, { align: "center" });
    doc.text("MINISTÈRE DE L'ÉDUCATION NATIONALE", 105, 20, { align: "center" });
    doc.text("IA: DAKAR / IEF: PARCELLES ASSAINIES", 105, 25, { align: "center" });
    doc.text("ÉCOLE: TAWFEEX AK TAYSIIR", 105, 30, { align: "center" });

    // --- Flag of Senegal (Star Fixed) ---
    // Rect size: 20x15, Position: Left side or centered? Usually left or centered. Let's put it top left.
    // Actually user said "etoile verte milieu du drapeau non point".
    const flagX = 15;
    const flagY = 10;
    const flagW = 24;
    const flagH = 16;
    const stripeW = flagW / 3;

    doc.setFillColor(0, 147, 88); // Green
    doc.rect(flagX, flagY, stripeW, flagH, 'F');
    doc.setFillColor(252, 221, 9); // Yellow
    doc.rect(flagX + stripeW, flagY, stripeW, flagH, 'F');
    doc.setFillColor(239, 51, 64); // Red
    doc.rect(flagX + stripeW * 2, flagY, stripeW, flagH, 'F');

    // Draw Star (Polygon)
    doc.setFillColor(0, 147, 88); // Green
    const cx = flagX + stripeW + (stripeW/2);
    const cy = flagY + (flagH/2);
    const r = 2.5; // Radius
    // 5 point star coordinates
    const angles = [18, 90, 162, 234, 306].map(a => (a - 90) * (Math.PI / 180)); // Rotated to point up
    // Actually standard star points:
    // We can draw a star by lines.
    // Simple approach: Use a character if font supports it, but polygon is safer.
    // Manual points for a star centered at cx, cy with outer radius r and inner radius r/2
    const starPoints : any[] = [];
    const step = Math.PI / 5;
    for(let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? r : r * 0.4;
        const angle = i * step - Math.PI / 2;
        starPoints.push({
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius
        });
    }
    // doc.lines requires segment format, simpler to use triangle hack or just lines
    // jsPDF 'lines' method: lines(lines, x, y, scale, style, closed)
    // Construct path
    for(let i = 0; i < starPoints.length; i++) {
        const p1 = starPoints[i];
        const p2 = starPoints[(i + 1) % starPoints.length];
        doc.line(p1.x, p1.y, p2.x, p2.y); // Stroke
    }
    // Fill is harder with lines. Let's use 'triangle' for the center or just use a small circle if polygon is too complex for this env.
    // User explicitly said "non point". Let's try text star "★"
    doc.setFontSize(12);
    doc.setTextColor(0, 147, 88);
    doc.text("★", cx, cy + 1.5, { align: "center" }); // Simple and effective

    // --- Logo ---
    // doc.addImage(generatedImage, 'PNG', 170, 10, 20, 20); // If valid base64/url.
    // Since generatedImage is a path in code, we need the actual image data. 
    // In a browser environment, we might need to load it. For now, text fallback is safer if image load fails.
    try {
       doc.addImage(generatedImage, 'PNG', 170, 10, 20, 20);
    } catch (e) {
       doc.setDrawColor(0);
       doc.circle(180, 20, 10);
       doc.setFontSize(8);
       doc.text("LOGO", 176, 20);
    }

    // --- Title ---
    doc.setFontSize(18);
    doc.setTextColor(MENU_BLUE[0], MENU_BLUE[1], MENU_BLUE[2]);
    doc.setFont("helvetica", "bold");
    doc.text("BULLETIN DE NOTES", 105, 45, { align: "center" });

    // --- Student Info ---
    doc.setDrawColor(MENU_BLUE[0], MENU_BLUE[1], MENU_BLUE[2]);
    doc.setFillColor(236, 240, 241);
    doc.roundedRect(15, 50, 180, 25, 3, 3, 'FD');
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`${student.firstName} ${student.lastName}`, 20, 60);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    // Avoid overflow by spacing
    doc.text(`Matricule: ${student.matricule}`, 20, 68);
    doc.text(`Classe: ${cls?.name}`, 80, 68);
    doc.text(`Trimestre: ${selectedTrimestre}${selectedTrimestre === '1' ? 'er' : 'ème'}`, 130, 68);
    doc.text(`Année: 2024-2025`, 165, 68);

    // --- Grades Table ---
    let totalScore = 0;
    let totalMax = 0;
    
    const tableBody = SUBJECTS.flatMap(sub => {
      const conf: SubjectConfig = configs.find(c => c.subjectId === sub.id) || { subjectId: sub.id };
      
      if (sub.hasSub) {
        // Resources
        const resVal = getMarkValue(student.id!, sub.id, 'res');
        const resMax = conf.maxRes || 40;
        const resRow = [
          `${sub.label} (Ressources)`,
          resVal !== null ? resVal : '-',
          resMax,
          resVal !== null ? resVal : 0,
          '' // Appréciation
        ];
        if (resVal !== null) { totalScore += resVal; totalMax += resMax; }

        // Compétences
        const compVal = getMarkValue(student.id!, sub.id, 'comp');
        const compMax = conf.maxComp || 60;
        const compRow = [
          `${sub.label} (Compétences)`,
          compVal !== null ? compVal : '-',
          compMax,
          compVal !== null ? compVal : 0,
          ''
        ];
        if (compVal !== null) { totalScore += compVal; totalMax += compMax; }

        return [resRow, compRow];
      } else {
        // Global
        const val = getMarkValue(student.id!, sub.id, 'global');
        const max = conf.maxGlobal || 20;
        if (val !== null) { totalScore += val; totalMax += max; }
        
        return [[
          sub.label,
          val !== null ? val : '-',
          max,
          val !== null ? val : 0,
          ''
        ]];
      }
    });

    autoTable(doc, {
      startY: 85,
      head: [['Discipline', 'Note', 'Barème', 'Total', 'Appréciation']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: MENU_BLUE as [number, number, number], textColor: 255, halign: 'center', fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 2, valign: 'middle' },
      columnStyles: { 0: { cellWidth: 70 } }, // Wider first column
      alternateRowStyles: { fillColor: [240, 248, 255] }
    });

    // --- Summary & Signatures ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Stats
    const average = totalMax > 0 ? (totalScore / totalMax) * 10 : 0;
    const { rank, total } = calculateStudentRank(student.id!);
    
    doc.setDrawColor(0);
    doc.setFillColor(255, 255, 255);
    doc.rect(130, finalY, 65, 25);
    doc.setFont("helvetica", "bold");
    doc.text(`Moyenne: ${average.toFixed(2)} / 10`, 135, finalY + 7);
    doc.text(`Rang: ${rank} / ${total}`, 135, finalY + 14);
    doc.text(`Décision: ${average >= 5 ? 'Admis' : 'Échoué'}`, 135, finalY + 21);

    // Signatures
    doc.setFontSize(10);
    doc.text(`L'Enseignant(e):`, 30, finalY + 40);
    doc.setFont("helvetica", "bold");
    doc.text(teacher?.fullName || "Non assigné", 30, finalY + 47);
    
    doc.setFont("helvetica", "normal");
    doc.text("Le Directeur:", 150, finalY + 40);
    doc.setFont("helvetica", "bold");
    doc.text(director?.fullName || "Le Directeur", 150, finalY + 47);

    // --- Footer ---
    // Colored line separator
    doc.setDrawColor(MENU_BLUE[0], MENU_BLUE[1], MENU_BLUE[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 280, 195, 280);

    const footerText = "Tawfeex_ak_Taysiir / khadimba18@gmail.com / 77 737 95 80";
    doc.setFontSize(8);
    doc.setTextColor(MENU_BLUE[0], MENU_BLUE[1], MENU_BLUE[2]); // Email/Text in blue
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
                  <TableHead>Moyenne (Aperçu)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.matricule}</TableCell>
                    <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                    <TableCell>--</TableCell>
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
