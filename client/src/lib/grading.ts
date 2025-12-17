import { Mark } from "./db";

export const SUBJECTS = [
  { id: "francais", label: "Français", hasSub: true },
  { id: "maths", label: "Mathématiques", hasSub: true },
  { id: "decouverte", label: "Découverte du monde", hasSub: true },
  { id: "edd", label: "Éducation au dév. durable", hasSub: true },
  { id: "arts", label: "Art plastique", hasSub: false },
  { id: "musique", label: "Éducation musicale", hasSub: false },
  { id: "arabe", label: "Arabe", hasSub: false },
];

export interface SubjectConfig {
  subjectId: string;
  maxRes?: number;
  maxComp?: number;
  maxGlobal?: number; // for subjects without sub-parts
}

// Default config - can be overridden per class later
export const DEFAULT_CONFIG: SubjectConfig[] = [
  { subjectId: "francais", maxRes: 40, maxComp: 60 },
  { subjectId: "maths", maxRes: 40, maxComp: 60 },
  { subjectId: "decouverte", maxRes: 20, maxComp: 30 },
  { subjectId: "edd", maxRes: 10, maxComp: 10 },
  { subjectId: "arts", maxGlobal: 20 },
  { subjectId: "musique", maxGlobal: 20 },
  { subjectId: "arabe", maxGlobal: 20 },
];

export function getMark(marks: Mark[], studentId: number, baseSubjectId: string, trimester: number, type: 'res' | 'comp' | 'global') {
  const storedId = type === 'global' ? baseSubjectId : `${baseSubjectId}_${type}`;
  return marks.find(m => 
    m.studentId === studentId && 
    m.subjectId === storedId && 
    m.trimestre === trimester
  );
}

// Helper to normalize to /20 or /10 for display in bulletin
export function normalize(value: number, max: number, target: number = 20) {
  if (!max) return 0;
  return (value / max) * target;
}
