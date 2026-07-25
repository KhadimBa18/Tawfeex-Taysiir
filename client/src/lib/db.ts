import Dexie, { type Table } from 'dexie';

export interface School {
  id?: number;
  name: string;
  ia: string;
  ief: string;
  commune: string;
  zone: string;
  code: string; // Code école (identifiant officiel)
  email: string;
  phone: string;
  logo?: string; // base64 or blob url
  configured?: boolean; // true une fois paramétrée par l'admin
}

export interface User {
  id?: number;
  username: string;
  passwordHash: string; // Simulation
  fullName: string;
  role: 'admin' | 'director' | 'teacher';
  photo?: string;
  email?: string;
  tel?: string;
  matricule?: string;
  classId?: number; // Linked class for teachers
}

export interface Class {
  id?: number;
  name: string; // e.g. "CM2 A"
  level: string; // CI, CP, CE1, CE2, CM1, CM2
  type: string; // A, B, Arabe, etc.
}

export interface Student {
  id?: number;
  matricule: string; // KB_0000
  firstName: string;
  lastName: string;
  sex: 'M' | 'F';
  dob?: string;
  pob?: string;
  classId: number;
}

export interface Mark {
  id?: number;
  studentId: number;
  classId: number;
  subjectId: string; // e.g., "francais_res", "math_comp"
  trimestre: 1 | 2 | 3;
  value: number;
}

export interface SubjectConfig {
  id?: number;
  subjectId: string;
  maxRes?: number;
  maxComp?: number;
  maxGlobal?: number;
}

export class SchoolDatabase extends Dexie {
  schools!: Table<School>;
  users!: Table<User>;
  classes!: Table<Class>;
  students!: Table<Student>;
  marks!: Table<Mark>;
  configs!: Table<SubjectConfig>;

  constructor() {
    super('TawfeexAkTaysiirDB');
    this.version(2).stores({
      schools: '++id',
      users: '++id, username',
      classes: '++id, name, level',
      students: '++id, matricule, classId',
      marks: '++id, [studentId+subjectId+trimestre], classId',
      configs: '++id, subjectId'
    });
  }
}

export const db = new SchoolDatabase();

// Seed initial data if empty
db.on('populate', async () => {
  await db.users.add({
    username: 'Tawfeex',
    passwordHash: 'Taysiir', 
    fullName: 'KHADIM BA',
    role: 'admin',
    photo: 'https://ui-avatars.com/api/?name=Khadim+Ba&background=random'
  });
});
