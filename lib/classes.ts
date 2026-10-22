export type Class = {
  id: string;
  name: string;
  section: string | null;
  subject: string | null;
  teacher_id: string;
  created_at: string;
  updated_at: string;
};

let classes: Class[] = [];
let nextId = 1;

export async function createClass(classData: {
  name: string;
  section?: string;
  subject?: string;
  teacher_id: string;
}): Promise<{ data: Class | null; error: string | null }> {
  const newClass: Class = {
    id: String(nextId++),
    name: classData.name,
    section: classData.section || null,
    subject: classData.subject || null,
    teacher_id: classData.teacher_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  classes.push(newClass);
  return { data: newClass, error: null };
}

export async function getTeacherClasses(teacherId: string): Promise<Class[]> {
  return classes.filter((c) => c.teacher_id === teacherId);
}

export async function getStudentClasses(studentId: string): Promise<Class[]> {
  return [];
}

export async function enrollStudent(classId: string, studentId: string): Promise<{ error: string | null }> {
  return { error: null };
}

export async function getAllClasses(): Promise<Class[]> {
  return classes;
}
