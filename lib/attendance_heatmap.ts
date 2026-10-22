

import { supabase } from './supabase';

export async function getAttendanceHeatmapData(filters?: {
  startDate?: string;
  endDate?: string;
  classId?: string;
  teacherId?: string;
}) {
  let query = supabase
    .from('attendance')
    .select(`
      id,
      scanned_at,
      student_id,
      event_id,
      events!inner (
        id,
        title,
        event_code,
        created_by,
        class_id
      )
    `)
    .order('scanned_at', { ascending: true });

  if (filters?.startDate) {
    query = query.gte('scanned_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('scanned_at', filters.endDate);
  }
  if (filters?.teacherId) {
    query = query.eq('events.created_by', filters.teacherId);
  }

  const { data, error } = await query;

  if (error || !data) return { data: [], error: error?.message };
  return { data, error: null };
}

export async function getAllAttendanceForHeatmap() {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id,
      scanned_at,
      student_id,
      event_id,
      events (
        id,
        title,
        event_code,
        created_by,
        class_id,
        classes(id, name, section, subject)
      )
    `)
    .order('scanned_at', { ascending: false });

  if (error || !data) return [];
  return data;
}
