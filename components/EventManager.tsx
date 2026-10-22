import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import DateTimeField from '@/components/DateTimeField';
import CampusButton from '@/components/CampusButton';
import { CAMPUS } from '@/constants/colors';
import {
  createEvent,
  deleteEvent,
  getAttendanceCounts,
  getEventAttendees,
  listEvents,
  setEventStatus,
  updateEvent,
  type CloudEvent,
  type EventAttendee,
} from '@/lib/events';
import { buildQRPayload } from '@/lib/qr';
import {
  LIMITS,
  validateEventCode,
  validateEventTitle,
  validateOptionalText,
} from '@/lib/validation';

type Props = {
  /** 'mine' = only events this user created (teachers). 'all' = every event (admins). */
  scope: 'mine' | 'all';
  userId: string;
  /** Show the permanent Delete button (admins only). */
  canDelete?: boolean;
  /** Called after any change so a parent screen can refresh its own totals. */
  onChanged?: () => void;
};

type Filter = 'all' | 'open' | 'closed';

type ModalState =
  | null
  | { kind: 'form'; event: CloudEvent | null }
  | { kind: 'view'; event: CloudEvent }
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      onConfirm: () => void;
    };

type Notice = { type: 'success' | 'error'; text: string } | null;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
];

function randomEventCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'EVT-';
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function nextHour(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

function describeWhen(event: CloudEvent): { date: string; time: string } {
  if (!event.start_time) return { date: 'Not set', time: 'Not set' };

  const start = new Date(event.start_time);
  const end = event.end_time ? new Date(event.end_time) : null;

  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  if (Number.isNaN(start.getTime())) return { date: 'Not set', time: 'Not set' };

  const startDate = start.toLocaleDateString(undefined, dateOpts);
  const startTime = start.toLocaleTimeString([], timeOpts);

  if (!end || Number.isNaN(end.getTime())) {
    return { date: startDate, time: startTime };
  }

  const endDate = end.toLocaleDateString(undefined, dateOpts);
  const endTime = end.toLocaleTimeString([], timeOpts);

  if (startDate === endDate) {
    return { date: startDate, time: `${startTime} – ${endTime}` };
  }

  return {
    date: `${startDate} → ${endDate}`,
    time: `${startTime} – ${endTime}`,
  };
}

export default function EventManager({
  scope,
  userId,
  canDelete = false,
  onChanged,
}: Props) {
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [notice, setNotice] = useState<Notice>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const load = useCallback(async () => {
    const result = await listEvents(scope, userId);

    if (result.error) {
      setNotice({ type: 'error', text: result.error });
    }

    setEvents(result.events);
    setCounts(await getAttendanceCounts(result.events.map((e) => e.id)));
    setLoading(false);
  }, [scope, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Runs a write, shows the result, and reloads the list.
  const run = async (
    action: () => Promise<{ error: string | null }>,
    successText: string
  ): Promise<boolean> => {
    setBusy(true);
    setNotice(null);

    const { error } = await action();

    if (error) {
      setNotice({ type: 'error', text: error });
      setBusy(false);
      return false;
    }

    setNotice({ type: 'success', text: successText });
    await load();
    onChanged?.();
    setBusy(false);
    return true;
  };

  const askClose = (event: CloudEvent) => {
    setModal({
      kind: 'confirm',
      title: 'Close this event?',
      message: `Students will no longer be able to record attendance for "${event.title}". You can reopen it later.`,
      confirmLabel: 'Close event',
      onConfirm: () => {
        setModal(null);
        void run(() => setEventStatus(event.id, 'closed'), 'Event closed.');
      },
    });
  };

  const reopen = (event: CloudEvent) => {
    void run(() => setEventStatus(event.id, 'open'), 'Event reopened.');
  };

  const askDelete = (event: CloudEvent) => {
    setModal({
      kind: 'confirm',
      title: 'Delete event?',
      message: `"${event.title}" and its ${
        counts[event.id] ?? 0
      } attendance record(s) will be permanently deleted. Closing the event instead keeps the records.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        setModal(null);
        void run(() => deleteEvent(event.id), 'Event deleted.');
      },
    });
  };

  const visible = events.filter((e) => filter === 'all' || e.status === filter);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={CAMPUS.accent} />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.newWrap}>
        <CampusButton
          variant="primary"
          title="Create Event"
          icon="add-circle-outline"
          onPress={() => {
            setNotice(null);
            setModal({ kind: 'form', event: null });
          }}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
            hitSlop={6}
          >
            <Text
              style={[styles.chipText, filter === f.key && styles.chipTextActive]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          style={styles.refresh}
          onPress={() => void load()}
          hitSlop={8}
        >
          <Ionicons name="refresh-outline" size={20} color={CAMPUS.accent} />
        </Pressable>
      </View>

      {notice && (
        <Pressable
          onPress={() => setNotice(null)}
          style={[
            styles.notice,
            notice.type === 'success' ? styles.noticeOk : styles.noticeError,
          ]}
        >
          <Text
            style={
              notice.type === 'success' ? styles.noticeOkText : styles.noticeErrorText
            }
          >
            {notice.text}
          </Text>
        </Pressable>
      )}

      {visible.length === 0 ? (
        <Text style={styles.empty}>
          {events.length === 0
            ? 'No events yet. Tap "Create Event" to add one.'
            : `No ${filter} events.`}
        </Text>
      ) : (
        visible.map((event) => {
          const when = describeWhen(event);
          const isClosed = event.status === 'closed';

          return (
            <View key={event.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {event.title}
                </Text>
                <StatusBadge status={event.status} />
              </View>

              <Text style={styles.cardMeta}>
                <Ionicons name="calendar-outline" size={13} /> {when.date}
              </Text>
              <Text style={styles.cardMeta}>
                <Ionicons name="time-outline" size={13} /> {when.time}
              </Text>
              {event.venue ? (
                <Text style={styles.cardMeta}>
                  <Ionicons name="location-outline" size={13} /> {event.venue}
                </Text>
              ) : null}
              <Text style={styles.cardMeta}>
                <Ionicons name="people-outline" size={13} />{' '}
                {counts[event.id] ?? 0} attendee(s) · {event.event_code}
              </Text>

              <View style={styles.actions}>
                <ActionButton
                  icon="eye-outline"
                  label="View"
                  onPress={() => setModal({ kind: 'view', event })}
                />
                <ActionButton
                  icon="create-outline"
                  label="Edit"
                  onPress={() => {
                    setNotice(null);
                    setModal({ kind: 'form', event });
                  }}
                />
                {isClosed ? (
                  <ActionButton
                    icon="lock-open-outline"
                    label="Reopen"
                    onPress={() => reopen(event)}
                  />
                ) : (
                  <ActionButton
                    icon="lock-closed-outline"
                    label="Close"
                    danger
                    onPress={() => askClose(event)}
                  />
                )}
                {canDelete && (
                  <ActionButton
                    icon="trash-outline"
                    label="Delete"
                    danger
                    onPress={() => askDelete(event)}
                  />
                )}
              </View>
            </View>
          );
        })
      )}

      <Modal
        visible={modal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {modal?.kind === 'confirm' && (
              <>
                <Text style={styles.sheetTitle}>{modal.title}</Text>
                <Text style={styles.sheetMessage}>{modal.message}</Text>
                <View style={styles.sheetButtons}>
                  <Pressable
                    style={styles.btnGhost}
                    onPress={() => setModal(null)}
                  >
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.btnDanger} onPress={modal.onConfirm}>
                    <Text style={styles.btnSolidText}>{modal.confirmLabel}</Text>
                  </Pressable>
                </View>
              </>
            )}

            {modal?.kind === 'form' && (
              <EventForm
                key={modal.event?.id ?? 'new'}
                event={modal.event}
                onCancel={() => setModal(null)}
                onSave={async (values) => {
                  const ok = modal.event
                    ? await run(
                        () => updateEvent(modal.event!.id, values),
                        'Event updated.'
                      )
                    : await run(
                        () => createEvent(values, userId),
                        'Event created.'
                      );
                  if (ok) setModal(null);
                }}
              />
            )}

            {modal?.kind === 'view' && (
              <EventDetails
                event={modal.event}
                count={counts[modal.event.id] ?? 0}
                onClose={() => setModal(null)}
                onEdit={() => setModal({ kind: 'form', event: modal.event })}
                onToggle={() => {
                  const ev = modal.event;
                  if (ev.status === 'open') {
                    askClose(ev);
                  } else {
                    setModal(null);
                    reopen(ev);
                  }
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {busy && (
        <View style={styles.busy}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

/* ------------------------------ Pieces ------------------------------ */

function StatusBadge({ status }: { status: 'open' | 'closed' }) {
  const open = status === 'open';
  return (
    <View style={[styles.badge, open ? styles.badgeOpen : styles.badgeClosed]}>
      <Text
        style={[styles.badgeText, open ? styles.badgeOpenText : styles.badgeClosedText]}
      >
        {open ? 'Open' : 'Closed'}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={[styles.action, danger && styles.actionDanger]}
      onPress={onPress}
      hitSlop={6}
    >
      <Ionicons
        name={icon}
        size={15}
        color={danger ? CAMPUS.danger : CAMPUS.accent}
      />
      <Text style={[styles.actionText, danger && { color: CAMPUS.danger }]}>
        {label}
      </Text>
    </Pressable>
  );
}

type FormValues = {
  event_code: string;
  title: string;
  venue: string | null;
  description: string | null;
  start_time: string;
  end_time: string;
};

function EventForm({
  event,
  onSave,
  onCancel,
}: {
  event: CloudEvent | null;
  onSave: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [code, setCode] = useState(event?.event_code ?? randomEventCode());
  const [venue, setVenue] = useState(event?.venue ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [start, setStart] = useState(() =>
    event?.start_time ? new Date(event.start_time) : nextHour()
  );
  const [end, setEnd] = useState(() =>
    event?.end_time
      ? new Date(event.end_time)
      : new Date((event?.start_time ? new Date(event.start_time) : nextHour()).getTime() + 3600000)
  );
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const titleCheck = validateEventTitle(title);
    if (!titleCheck.ok) return setError(titleCheck.message);

    const codeCheck = event
      ? { ok: true as const, value: event.event_code }
      : validateEventCode(code);
    if (!codeCheck.ok) return setError(codeCheck.message);

    const venueCheck = validateOptionalText('Venue', venue, LIMITS.venue);
    if (!venueCheck.ok) return setError(venueCheck.message);

    const descCheck = validateOptionalText(
      'Description',
      description,
      LIMITS.description
    );
    if (!descCheck.ok) return setError(descCheck.message);

    if (end.getTime() <= start.getTime()) {
      return setError('The end time must be after the start time.');
    }

    setError(null);
    await onSave({
      event_code: codeCheck.value,
      title: titleCheck.value,
      venue: venueCheck.value,
      description: descCheck.value,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Text style={styles.sheetTitle}>{event ? 'Edit Event' : 'Create Event'}</Text>

      <Text style={styles.label}>Event name</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        maxLength={LIMITS.eventTitle}
        placeholder="e.g. Founders Day Assembly"
        placeholderTextColor={CAMPUS.textFaint}
      />

      <Text style={styles.label}>
        Event code{event ? ' (cannot be changed)' : ''}
      </Text>
      <TextInput
        style={[styles.input, event && styles.inputDisabled]}
        value={code}
        onChangeText={setCode}
        editable={!event}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Starts (date & time)</Text>
      <DateTimeField
        value={start}
        onChange={(d) => {
          // Keep the same duration when the start moves.
          const length = end.getTime() - start.getTime();
          setStart(d);
          if (length > 0) setEnd(new Date(d.getTime() + length));
        }}
      />

      <Text style={styles.label}>Ends (date & time)</Text>
      <DateTimeField value={end} onChange={setEnd} />

      <Text style={styles.label}>Venue</Text>
      <TextInput
        style={styles.input}
        value={venue}
        onChangeText={setVenue}
        maxLength={LIMITS.venue}
        placeholder="e.g. School Gymnasium"
        placeholderTextColor={CAMPUS.textFaint}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        maxLength={LIMITS.description}
        placeholder="What is this event about?"
        placeholderTextColor={CAMPUS.textFaint}
        multiline
      />

      {event && (
        <View style={styles.statusRow}>
          <Text style={styles.label}>Status</Text>
          <StatusBadge status={event.status} />
        </View>
      )}

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <View style={styles.sheetButtons}>
        <Pressable style={styles.btnGhost} onPress={onCancel}>
          <Text style={styles.btnGhostText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.btnPrimary} onPress={() => void submit()}>
          <Text style={styles.btnSolidText}>Save</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function EventDetails({
  event,
  count,
  onClose,
  onEdit,
  onToggle,
}: {
  event: CloudEvent;
  count: number;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const [attendees, setAttendees] = useState<EventAttendee[] | null>(null);
  const when = describeWhen(event);
  const isClosed = event.status === 'closed';

  // Load attendees once when the details open.
  useEffect(() => {
    let active = true;
    getEventAttendees(event.id).then((rows) => {
      if (active) setAttendees(rows);
    });
    return () => {
      active = false;
    };
  }, [event.id]);

  return (
    <ScrollView>
      <View style={styles.cardTop}>
        <Text style={[styles.sheetTitle, { flex: 1 }]}>{event.title}</Text>
        <StatusBadge status={event.status} />
      </View>

      <DetailRow label="Date" value={when.date} />
      <DetailRow label="Time" value={when.time} />
      <DetailRow label="Venue" value={event.venue || 'Not set'} />
      <DetailRow label="Description" value={event.description || 'No description'} />
      <DetailRow label="Event code" value={event.event_code} />
      <DetailRow label="Attendees" value={String(count)} />

      <View style={styles.qrBox}>
        <View style={styles.qrTile}>
        <QRCode
          value={buildQRPayload({
            eventId: event.event_code,
            title: event.title,
            start: event.start_time ?? undefined,
            end: event.end_time ?? undefined,
          })}
          size={170}
        />
        </View>
        <Text style={styles.qrNote}>
          {isClosed
            ? 'This event is closed — scans will be rejected.'
            : 'Students scan this code to record attendance.'}
        </Text>
      </View>

      <Text style={styles.label}>Who attended</Text>
      {attendees === null ? (
        <ActivityIndicator color={CAMPUS.accent} />
      ) : attendees.length === 0 ? (
        <Text style={styles.cardMeta}>No one has scanned yet.</Text>
      ) : (
        attendees.map((a) => (
          <View key={a.studentId} style={styles.attendee}>
            <Text style={styles.attendeeName}>{a.name}</Text>
            <Text style={styles.attendeeTime}>
              {new Date(a.scannedAt).toLocaleString()}
            </Text>
          </View>
        ))
      )}

      <View style={styles.sheetButtons}>
        <Pressable style={styles.btnGhost} onPress={onClose}>
          <Text style={styles.btnGhostText}>Done</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={onEdit}>
          <Text style={styles.btnGhostText}>Edit</Text>
        </Pressable>
        <Pressable
          style={isClosed ? styles.btnPrimary : styles.btnDanger}
          onPress={onToggle}
        >
          <Text style={styles.btnSolidText}>
            {isClosed ? 'Reopen' : 'Close event'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/* ------------------------------ Styles ------------------------------ */

const SHEET_BG = '#0F1629';

const styles = StyleSheet.create({
  loading: { paddingVertical: 40 },
  newWrap: { marginBottom: 14 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  chipActive: {
    backgroundColor: 'rgba(34,211,238,0.14)',
    borderColor: CAMPUS.accent,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: CAMPUS.textMuted },
  chipTextActive: { color: CAMPUS.accent },
  refresh: {
    marginLeft: 'auto',
    padding: 8,
    borderRadius: 12,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },

  notice: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  noticeOk: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderColor: 'rgba(52,211,153,0.35)',
  },
  noticeError: {
    backgroundColor: CAMPUS.dangerBg,
    borderColor: CAMPUS.dangerBorder,
  },
  noticeOkText: { color: CAMPUS.mint, fontSize: 13, lineHeight: 19 },
  noticeErrorText: { color: CAMPUS.danger, fontSize: 13, lineHeight: 19 },
  empty: {
    textAlign: 'center',
    color: CAMPUS.textMuted,
    fontSize: 14,
    paddingVertical: 32,
    lineHeight: 21,
  },

  card: {
    backgroundColor: CAMPUS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: CAMPUS.text,
  },
  cardMeta: {
    fontSize: 13,
    color: CAMPUS.textMuted,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(34,211,238,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.3)',
  },
  actionDanger: {
    backgroundColor: CAMPUS.dangerBg,
    borderColor: CAMPUS.dangerBorder,
  },
  actionText: { fontSize: 12, fontWeight: '700', color: CAMPUS.accent },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeOpen: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderColor: 'rgba(52,211,153,0.4)',
  },
  badgeClosed: {
    backgroundColor: CAMPUS.dangerBg,
    borderColor: CAMPUS.dangerBorder,
  },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  badgeOpenText: { color: CAMPUS.mint },
  badgeClosedText: { color: CAMPUS.danger },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,6,14,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '92%',
    backgroundColor: SHEET_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CAMPUS.border,
    padding: 22,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: CAMPUS.text,
    marginBottom: 6,
  },
  sheetMessage: {
    fontSize: 14,
    color: CAMPUS.textMuted,
    lineHeight: 21,
    marginBottom: 6,
  },
  sheetButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  btnGhost: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: CAMPUS.surface,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  btnGhostText: { fontSize: 14, fontWeight: '700', color: CAMPUS.textMuted },
  btnPrimary: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: CAMPUS.primary,
  },
  btnDanger: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#E5484D',
  },
  btnSolidText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  label: {
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: CAMPUS.textMuted,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: CAMPUS.inputBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: CAMPUS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: CAMPUS.text,
  },
  inputDisabled: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    color: CAMPUS.textFaint,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  formError: {
    color: CAMPUS.danger,
    fontSize: 13,
    marginTop: 14,
    lineHeight: 19,
  },

  detailRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  detailLabel: {
    width: 92,
    fontFamily: CAMPUS.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    color: CAMPUS.textMuted,
    textTransform: 'uppercase',
    paddingTop: 2,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: CAMPUS.text,
    lineHeight: 20,
  },
  qrBox: {
    alignItems: 'center',
    marginTop: 16,
  },
  // QR codes need a light background to scan reliably
  qrTile: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    shadowColor: CAMPUS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  qrNote: {
    fontSize: 12,
    color: CAMPUS.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
  attendee: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  attendeeName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: CAMPUS.text,
  },
  attendeeTime: { fontSize: 11, color: CAMPUS.textMuted },

  busy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,6,14,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
});