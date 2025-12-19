import { Mark, SubjectConfig } from "./db";

// Compartiments pour Excel export
export const COMPARTMENTS = {
  MOHEBS: "MOHEBS (Français)",
  PAAM: "PAAM (Mathématiques)",
  ESVS: "ESVS (Découverte & Développement)",
  AUTRES: "AUTRES (Arts, Musique, Arabe)"
};

export const SUBJECTS = [
  // MOHEBS (Français)
  { id: "francais", label: "Français", hasSub: true, compartment: "MOHEBS" },
  
  // PAAM (Mathématiques)
  { id: "maths", label: "Mathématiques", hasSub: true, compartment: "PAAM" },
  
  // ESVS (Découverte & Développement)
  { id: "decouverte", label: "Découverte du monde", hasSub: true, compartment: "ESVS" },
  { id: "edd", label: "Éducation au dév. durable", hasSub: true, compartment: "ESVS" },
  
  // AUTRES
  { id: "arts", label: "Art plastique", hasSub: false, compartment: "AUTRES" },
  { id: "musique", label: "Éducation musicale", hasSub: false, compartment: "AUTRES" },
  { id: "arabe", label: "Arabe", hasSub: false, compartment: "AUTRES" },
];

// Ressources et compétences par défaut
export const DEFAULT_RESOURCES = {
  francais: {
    resources: ["Grammaire", "Orthographe", "Conjugaison", "Vocabulaire", "Lecture", "Écriture", "Dictée", "Expression", "Compréhension", "Fluidité", "Prononciation", "Intonation"],
    competences: ["Communication orale", "Expression écrite", "Compréhension", "Analyse de texte", "Production de texte", "Réflexion linguistique", "Créativité"]
  },
  maths: {
    resources: ["Numération", "Addition", "Soustraction", "Multiplication", "Division", "Décimaux", "Fractions", "Géométrie", "Mesure", "Algèbre", "Résolution", "Logique"],
    competences: ["Calcul mental", "Opérations", "Géométrie", "Mesure", "Logique", "Résolution de problèmes", "Raisonnement"]
  },
  decouverte: {
    resources: ["Histoire", "Géographie", "Sciences", "Écologie", "Observation", "Classification"],
    competences: ["Observation", "Analyse", "Curiosité", "Questionnement"]
  },
  edd: {
    resources: ["Environnement", "Citoyenneté"],
    competences: ["Engagement", "Conscience écologique"]
  }
};

// Default config - can be overridden per class later
export const DEFAULT_CONFIG: SubjectConfig[] = [
  { subjectId: "francais", maxRes: 280, maxComp: 280 },
  { subjectId: "maths", maxRes: 280, maxComp: 280 },
  { subjectId: "decouverte", maxRes: 40, maxComp: 60 },
  { subjectId: "edd", maxRes: 40, maxComp: 60 },
  { subjectId: "arts", maxGlobal: 40 },
  { subjectId: "musique", maxGlobal: 40 },
  { subjectId: "arabe", maxGlobal: 40 },
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

// Group subjects by compartment
export function getSubjectsByCompartment(compartment: string) {
  return SUBJECTS.filter(s => s.compartment === compartment);
}

// Get all compartments used
export function getAllCompartments() {
  return Object.keys(COMPARTMENTS).map(key => ({
    key,
    label: COMPARTMENTS[key as keyof typeof COMPARTMENTS]
  }));
}
