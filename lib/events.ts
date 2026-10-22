import { supabase } from './supabase';

export type EventStatus = 'open' | 'closed';

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  venue: string | null;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
};

export type EventInput = {
  event_code: string;
  title: string;
  venue: string | null;
  description: string | null;
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
};

export type EventAttendee = {
  studentId: string;
  name: string;
  scannedAt: string;
};

type Result = { error: string | null };

const NO_PERMISSION =
  'Nothing was changed. You may not have permission, or the event no longer exists.';

function normalize(row: any): CloudEvent {
  return { ...row, status: row?.status === 'closed' ? 'closed' : 'open' };
}

export async function listEvents(
  scope: 'mine' | 'all',
  userId: string
): Promise<{ events: CloudEvent[]; error: string | null }> {
  let query = supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (scope === 'mine') {
    query = query.eq('created_by', userId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { events: [], error: error?.message ?? 'Could not load events.' };
  }

  return { events: data.map(normalize), error: null };
}

export async function createEvent(
  input: EventInput,
  userId: string
): Promise<Result> {
  const { error } = await supabase
    .from('events')
    .insert([{ ...input, created_by: userId, status: 'open' }]);

  if (error) {
    if (error.code === '23505') {
      return { error: 'That event code is already in use. Choose another.' };
    }
    return { error: error.message };
  }

  return { error: null };
}

export async function updateEvent(
  id: string,
  fields: Partial<Omit<EventInput, 'event_code'>>
): Promise<Result> {
  const { data, error } = await supabase
    .from('events')
    .update(fields)
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: NO_PERMISSION };
  return { error: null };
}

export async function setEventStatus(
  id: string,
  status: EventStatus
): Promise<Result> {
  const { data, error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', id)
    .select('id');

  if (error) {
    return {
      error: error.message.includes('status')
        ? 'The events table has no "status" column yet. Run event_management.sql in Supabase.'
        : error.message,
    };
  }
  if (!data || data.length === 0) return { error: NO_PERMISSION };
  return { error: null };
}

// Admin only (enforced by database policy).
export async function deleteEvent(id: string): Promise<Result> {
  const { error: attError } = await supabase
    .from('attendance')
    .delete()
    .eq('event_id', id);

  if (attError) return { error: attError.message };

  const { data, error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: NO_PERMISSION };
  return { error: null };
}

export async function getAttendanceCounts(
  eventIds: string[]
): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};

  const { data, error } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  data.forEach((row: any) => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  });
  return counts;
}

export async function getEventAttendees(
  eventId: string
): Promise<EventAttendee[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('student_id, scanned_at')
    .eq('event_id', eventId)
    .order('scanned_at', { ascending: false });

  if (error || !data) return [];

  const ids = data.map((row: any) => row.student_id);
  const names: Record<string, string> = {};

  if (ids.length > 0) {

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids);

    (profiles ?? []).forEach((p: any) => {
      names[p.id] = p.full_name || p.email;
    });
  }

  return data.map((row: any) => ({
    studentId: row.student_id,
    name: names[row.student_id] ?? `Student ${String(row.student_id).slice(0, 8)}`,
    scannedAt: row.scanned_at,
  }));
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalize(data);
}