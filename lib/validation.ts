

export type Valid<T> = { ok: true; value: T } | { ok: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EVENT_CODE_RE = /^[A-Za-z0-9_-]{3,40}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BAD_TEXT_RE = /[\u0000-\u001f<>{}\[\]\\]/;

export const LIMITS = {
  email: 254,
  password: 72, 
  name: 60,
  eventTitle: 120,
  venue: 120,
  description: 1000,
} as const;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function validateEmail(input: string): Valid<string> {
  const value = input.trim().toLowerCase();

  if (!value) return { ok: false, message: 'Please enter your email.' };
  if (value.length > LIMITS.email || !EMAIL_RE.test(value)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  return { ok: true, value };
}


export function validateNewPassword(input: string): Valid<string> {
  if (input.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' };
  }
  if (input.length > LIMITS.password) {
    return {
      ok: false,
      message: `Password must be at most ${LIMITS.password} characters.`,
    };
  }
  if (!/[A-Za-z]/.test(input) || !/[0-9]/.test(input)) {
    return {
      ok: false,
      message: 'Password must include at least one letter and one number.',
    };
  }

  return { ok: true, value: input };
}

export function validateFullName(input: string): Valid<string> {
  const value = input.trim().replace(/\s+/g, ' ');

  if (value.length < 2) {
    return { ok: false, message: 'Please enter your full name.' };
  }
  if (value.length > LIMITS.name) {
    return {
      ok: false,
      message: `Name must be at most ${LIMITS.name} characters.`,
    };
  }
  if (BAD_TEXT_RE.test(value)) {
    return { ok: false, message: 'Name contains characters that are not allowed.' };
  }

  return { ok: true, value };
}

export function validateEventTitle(input: string): Valid<string> {
  const value = input.trim().replace(/\s+/g, ' ');

  if (!value) return { ok: false, message: 'Please enter an event name.' };
  if (value.length > LIMITS.eventTitle) {
    return {
      ok: false,
      message: `Event name must be at most ${LIMITS.eventTitle} characters.`,
    };
  }
  if (BAD_TEXT_RE.test(value)) {
    return { ok: false, message: 'Event name contains characters that are not allowed.' };
  }

  return { ok: true, value };
}

export function validateEventCode(input: string): Valid<string> {
  const value = input.trim();

  if (!EVENT_CODE_RE.test(value)) {
    return {
      ok: false,
      message:
        'Event code must be 3-40 characters: letters, numbers, dash or underscore.',
    };
  }

  return { ok: true, value };
}


export function validateOptionalText(
  label: string,
  input: string,
  max: number
): Valid<string | null> {
  const value = input.trim();

  if (!value) return { ok: true, value: null };
  if (value.length > max) {
    return { ok: false, message: `${label} must be at most ${max} characters.` };
  }

  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    return { ok: false, message: `${label} contains characters that are not allowed.` };
  }

  return { ok: true, value };
}