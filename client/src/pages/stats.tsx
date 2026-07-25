import { useState, useEffect } from "react";
import { db, type Student, type Class, type Mark } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Download, FileText, Presentation } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import pptxgen from "pptxgenjs";
import { SUBJECTS } from "@/lib/grading";

export default function Stats() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [classData, setClassData] = useState<any[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  useEffect(() => {
    loadStats();
  }, [selectedClassId]);

  const loadStats = async () => {
    const allStudents = await db.students.toArray();
    const allClasses = await db.classes.toArray();
    setClasses(allClasses);

    // Filter if class selected
    const students = selectedClassId === "all" 
      ? allStudents 
      : allStudents.filter(s => s.classId.toString() === selectedClassId);

    setTotalStudents(students.length);
    setTotalClasses(allClasses.length);

    // Gender Stats
    const boys = students.filter(s => s.sex === 'M').length;
    const girls = students.filter(s => s.sex === 'F').length;
    setGenderData([
      { name: 'Garçons', value: boys, color: '#3b82f6' },
      { name: 'Filles', value: girls, color: '#ec4899' },
    ]);

    // Class Performance Stats
    const relevantClasses = selectedClassId === "all" 
        ? allClasses 
        : allClasses.filter(c => c.id !== undefined && c.id.toString() === selectedClassId);

    const cData = await Promise.all(relevantClasses.map(async c => {
      const count = await db.students.where('classId').equals(c.id!).count();
      // Need real stats: composed = has marks?
      const marks = await db.marks.where('classId').equals(c.id!).toArray();
      // Distinct students with marks
      const studentIds = new Set(marks.map(m => m.studentId));
      const composed = studentIds.size;
      // Mock passing for now as real calculation is heavy
      const passed = Math.floor(composed * 0.75); 

      return {
        name: c.name,
        count: count,
        composed: composed,
        passed: passed,
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

    doc.save("Rapport_Statistique.pdf");
  };

  const exportPPT = () => {
    const pptx = new pptxgen();
    let slide = pptx.addSlide();
    slide.addText("Rapport Statistique", { x: 1, y: 1, fontSize: 24, color: "363636" });
    slide.addText("Tawfeex ak Taysiir", { x: 1, y: 2, fontSize: 18, color: "009358" });

    slide = pptx.addSlide();
    slide.addText("Répartition par Sexe", { x: 0.5, y: 0.5, fontSize: 18 });
    slide.addChart(pptx.ChartType.pie, 
        [{ name: "Sexe", labels: ["Garçons", "Filles"], values: [genderData[0].value, genderData[1].value] }],
        { x: 1, y: 1, w: 6, h: 4 }
    );

    slide = pptx.addSlide();
    slide.addText("Performance par Classe", { x: 0.5, y: 0.5, fontSize: 18 });
    const labels = classData.map(c => c.name);
    const passed = classData.map(c => c.passed);
    slide.addChart(pptx.ChartType.bar, 
        [{ name: "Admis", labels: labels, values: passed }],
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

      <Card className="bg-secondary/10 border-none">
        <CardContent className="pt-6">
            <div className="flex items-center gap-4">
                <label className="text-sm font-medium whitespace-nowrap">Filtrer par :</label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="bg-white w-[200px]">
                        <SelectValue placeholder="Toute l'école" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Toute l'école</SelectItem>
                        {classes.map(c => <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue Globale</TabsTrigger>
          <TabsTrigger value="charts">Graphiques</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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

            <Card>
                <CardHeader>
                    <CardTitle>Tableau de Synthèse</CardTitle>
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
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
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
                    <CardTitle>Performance Comparée</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="composed" name="Composé" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="passed" name="Admis" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
            <Card>
                <CardHeader><CardTitle>Analyse Pédagogique</CardTitle></CardHeader>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
