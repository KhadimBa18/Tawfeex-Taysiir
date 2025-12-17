import { useState, useEffect } from "react";
import { db, type Student, type Class } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Download, FileText, Presentation } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import pptxgen from "pptxgenjs";

export default function Stats() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [classData, setClassData] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const students = await db.students.toArray();
    const classes = await db.classes.toArray();

    setTotalStudents(students.length);
    setTotalClasses(classes.length);

    // Gender Stats
    const boys = students.filter(s => s.sex === 'M').length;
    const girls = students.filter(s => s.sex === 'F').length;
    setGenderData([
      { name: 'Garçons', value: boys, color: '#3b82f6' },
      { name: 'Filles', value: girls, color: '#ec4899' },
    ]);

    // Class Stats
    const cData = await Promise.all(classes.map(async c => {
      const count = await db.students.where('classId').equals(c.id!).count();
      return {
        name: c.name,
        count: count,
        composed: Math.floor(count * 0.9), // Mocked for demo
        passed: Math.floor(count * 0.7), // Mocked for demo
      };
    }));
    setClassData(cData);
  };

  const exportReportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Rapport Statistique - Tawfeex ak Taysiir", 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Total Élèves: ${totalStudents} (Garçons: ${genderData[0]?.value}, Filles: ${genderData[1]?.value})`, 14, 30);
    
    // Global Performance
    autoTable(doc, {
        startY: 40,
        head: [['Classe', 'Effectif', 'Ont Composé', 'Ont la Moyenne', '% Réussite']],
        body: classData.map(c => [
            c.name, 
            c.count, 
            c.composed, 
            c.passed, 
            c.composed > 0 ? ((c.passed/c.composed)*100).toFixed(1) + '%' : '0%'
        ]),
    });

    // Qualitative
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Analyse Pédagogique", 14, finalY);
    
    autoTable(doc, {
        startY: finalY + 5,
        head: [['Domaine', 'Points Forts', 'Points Faibles', 'Remédiation']],
        body: [
            ['Français', 'Lecture fluide (CP)', 'Grammaire (CE1)', 'Renforcement dictée'],
            ['Maths', 'Calcul mental', 'Géométrie', 'Manipulations concrètes'],
            ['Discipline', 'Ponctualité', 'Absences répétées', 'Rencontre parents'],
        ],
    });

    doc.save("Rapport_Statistique.pdf");
  };

  const exportPPT = () => {
    const pptx = new pptxgen();
    
    // Slide 1: Title
    let slide = pptx.addSlide();
    slide.addText("Rapport Statistique", { x: 1, y: 1, fontSize: 24, color: "363636" });
    slide.addText("Tawfeex ak Taysiir", { x: 1, y: 2, fontSize: 18, color: "009358" });

    // Slide 2: Gender Stats
    slide = pptx.addSlide();
    slide.addText("Répartition par Sexe", { x: 0.5, y: 0.5, fontSize: 18 });
    slide.addChart(pptx.ChartType.pie, 
        [
            {
                name: "Sexe",
                labels: ["Garçons", "Filles"],
                values: [genderData[0].value, genderData[1].value]
            }
        ],
        { x: 1, y: 1, w: 6, h: 4 }
    );

    // Slide 3: Class Performance
    slide = pptx.addSlide();
    slide.addText("Performance par Classe", { x: 0.5, y: 0.5, fontSize: 18 });
    
    // Data for bar chart
    const labels = classData.map(c => c.name);
    const passed = classData.map(c => c.passed);
    
    slide.addChart(pptx.ChartType.bar, 
        [
            {
                name: "Admis",
                labels: labels,
                values: passed
            }
        ],
        { x: 0.5, y: 1, w: 9, h: 4 }
    );

    pptx.writeFile({ fileName: "Presentation_Stats.pptx" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Statistiques</h1>
          <p className="text-muted-foreground">Vue d'ensemble et rapports.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={exportReportPDF}>
                <FileText className="w-4 h-4 mr-2" /> Rapport PDF
            </Button>
            <Button variant="outline" onClick={exportPPT}>
                <Presentation className="w-4 h-4 mr-2" /> Présentation PPT
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Élèves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClasses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-500">
              {genderData.find(d => d.name === 'Filles')?.value || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Garçons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {genderData.find(d => d.name === 'Garçons')?.value || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Sexe</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Effectifs par Classe</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Performance Globale</CardTitle>
        </CardHeader>
        <CardContent>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm">
                     <thead>
                         <tr className="border-b">
                             <th className="text-left py-2">Classe</th>
                             <th className="text-left py-2">Effectif</th>
                             <th className="text-left py-2">Ont Composé</th>
                             <th className="text-left py-2">Ont la Moyenne</th>
                             <th className="text-left py-2">% Réussite</th>
                         </tr>
                     </thead>
                     <tbody>
                         {classData.map((c, i) => (
                             <tr key={i} className="border-b last:border-0">
                                 <td className="py-2">{c.name}</td>
                                 <td className="py-2">{c.count}</td>
                                 <td className="py-2">{c.composed}</td>
                                 <td className="py-2">{c.passed}</td>
                                 <td className="py-2 font-bold text-green-600">
                                     {c.composed > 0 ? ((c.passed/c.composed)*100).toFixed(1) + '%' : '0%'}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader><CardTitle>Analyse Pédagogique (Exemple)</CardTitle></CardHeader>
          <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h3 className="font-bold text-green-800 mb-2">Points Forts</h3>
                      <ul className="list-disc list-inside text-sm space-y-1">
                          <li>Lecture fluide en CP</li>
                          <li>Calcul mental en CE2</li>
                      </ul>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h3 className="font-bold text-red-800 mb-2">Points Faibles</h3>
                      <ul className="list-disc list-inside text-sm space-y-1">
                          <li>Grammaire en CM1</li>
                          <li>Absentéisme en CI</li>
                      </ul>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-bold text-blue-800 mb-2">Plan de Remédiation</h3>
                      <ul className="list-disc list-inside text-sm space-y-1">
                          <li>Cours de soutien Mercredi</li>
                          <li>Rencontre parents d'élèves</li>
                      </ul>
                  </div>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
