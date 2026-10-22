import { useAuth } from './auth';

export type Announcement = {
  id: string;
  teacher_id: string;
  title: string;
  message: string;
  class_id: string | null;
  type: 'general' | 'schedule_change' | 'room_update' | 'reminder';
  created_at: string;
  updated_at: string;
  class?: {
    name: string;
    section: string | null;
  };
};

export type AnnouncementWithReadStatus = Announcement & {
  read: boolean;
};

// In-memory storage
let announcements: Announcement[] = [];
let notifications: Array<{
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_id: string;
  read: boolean;
  created_at: string;
}> = [];
let nextId = 1;

export async function createAnnouncement(announcement: {
  teacher_id: string;
  title: string;
  message: string;
  class_id?: string | null;
  type?: 'general' | 'schedule_change' | 'room_update' | 'reminder';
}): Promise<{ data: Announcement | null; error: string | null }> {
  try {
    const newAnnouncement: Announcement = {
      id: String(nextId++),
      teacher_id: announcement.teacher_id,
      title: announcement.title,
      message: announcement.message,
      class_id: announcement.class_id || null,
      type: announcement.type || 'general',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    announcements.unshift(newAnnouncement);

    // Create mock notifications for students
    const notificationId = String(nextId++);
    notifications.push({
      id: notificationId,
      user_id: 'student-1', // Mock student
      title: newAnnouncement.title,
      message: newAnnouncement.message,
      type: 'announcement',
      related_id: newAnnouncement.id,
      read: false,
      created_at: new Date().toISOString(),
    });

    return {
      data: newAnnouncement,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

export async function getTeacherAnnouncements(teacherId: string): Promise<Announcement[]> {
  return announcements.filter((a) => a.teacher_id === teacherId);
}

export async function getStudentAnnouncements(studentId: string): Promise<AnnouncementWithReadStatus[]> {
  return announcements.map((a) => ({
    ...a,
    read: notifications.some((n) => n.related_id === a.id && n.user_id === studentId && n.read),
  }));
}

export async function markAnnouncementAsRead(userId: string, announcementId: string): Promise<void> {
  const notification = notifications.find(
    (n) => n.related_id === announcementId && n.user_id === userId
  );
  if (notification) {
    notification.read = true;
  }
}

export async function updateAnnouncement(
  announcementId: string,
  updates: Partial<Announcement>
): Promise<{ error: string | null }> {
  const index = announcements.findIndex((a) => a.id === announcementId);
  if (index !== -1) {
    announcements[index] = {
      ...announcements[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return { error: null };
  }
  return { error: 'Announcement not found' };
}

export async function deleteAnnouncement(announcementId: string): Promise<{ error: string | null }> {
  const index = announcements.findIndex((a) => a.id === announcementId);
  if (index !== -1) {
    announcements.splice(index, 1);
    return { error: null };
  }
  return { error: 'Announcement not found' };
}
