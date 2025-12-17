import Dexie, { type Table } from 'dexie';

export interface School {
  id?: number;
  name: string;
  ia: string;
  ief: string;
  email: string;
  phone: string;
  logo?: string; // base64 or blob url
}

export interface User {
  id?: number;
  username: string;
  passwordHash: string; // Simulation
  fullName: string;
  role: 'admin' | 'director' | 'teacher';
  photo?: string;
}

export interface Class {
  id?: number;
  name: string; // e.g. "CM2 A"
  level: string; // CI, CP, CE1, CE2, CM1, CM2
  type: string; // A, B, Arabe, etc.
  teacherId?: number;
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

export class SchoolDatabase extends Dexie {
  schools!: Table<School>;
  users!: Table<User>;
  classes!: Table<Class>;
  students!: Table<Student>;
  marks!: Table<Mark>;

  constructor() {
    super('TawfeexAkTaysiirDB');
    this.version(1).stores({
      schools: '++id',
      users: '++id, username',
      classes: '++id, name, level',
      students: '++id, matricule, classId',
      marks: '++id, [studentId+subjectId+trimestre], classId'
    });
  }
}

export const db = new SchoolDatabase();

// Seed initial data if empty
db.on('populate', async () => {
  await db.users.add({
    username: 'Tawfeex',
    passwordHash: 'Taysiir', // Plain text for prototype requirement
    fullName: 'KHADIM BA',
    role: 'admin',
    photo: 'https://ui-avatars.com/api/?name=Khadim+Ba&background=random'
  });
});
