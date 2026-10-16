type ChatPayload = {
  question?: unknown;
  contact?: Record<string, unknown>;
};

const CHAT_RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_CHAT_ASKS_PER_WINDOW = 10;
const MAX_CHAT_RATE_ENTRIES = 5000;
const CHAT_ASK_MAX_LENGTH = 2000;
const CHAT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHAT_PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const chatAskRate = new Map<string, { count: number; resetAt: number }>();

export function validateChatAsk(value: unknown): { question: string; contact: Record<string, string> } | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as ChatPayload;
  if (typeof payload.question !== 'string') return null;
  const question = payload.question.trim();
  const contact = payload.contact;
  if (question.length < 8 || question.length > CHAT_ASK_MAX_LENGTH) return null;
  if (!contact || typeof contact.name !== 'string' || !contact.name.trim() || contact.name.length > 120) return null;
  if (typeof contact.phone !== 'string' || !CHAT_PHONE_RE.test(contact.phone.trim())) return null;

  const optionalFields: Array<[string, number]> = [
    ['email', 254],
    ['company', 120],
    ['positionOffer', 200],
  ];
  for (const [field, maxLength] of optionalFields) {
    const fieldValue = contact[field];
    if (fieldValue !== undefined && (typeof fieldValue !== 'string' || fieldValue.length > maxLength)) return null;
  }
  if (typeof contact.email === 'string' && contact.email.trim() && !CHAT_EMAIL_RE.test(contact.email.trim())) return null;

  return {
    question,
    contact: {
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      ...(typeof contact.email === 'string' && contact.email.trim() ? { email: contact.email.trim() } : {}),
      ...(typeof contact.company === 'string' && contact.company.trim() ? { company: contact.company.trim() } : {}),
      ...(typeof contact.positionOffer === 'string' && contact.positionOffer.trim()
        ? { positionOffer: contact.positionOffer.trim() }
        : {}),
    },
  };
}

export function allowChatAsk(ip: string, now = Date.now()): boolean {
  for (const [key, entry] of chatAskRate) {
    if (now >= entry.resetAt) chatAskRate.delete(key);
  }

  let entry = chatAskRate.get(ip);
  if (!entry || now >= entry.resetAt) {
    if (chatAskRate.size >= MAX_CHAT_RATE_ENTRIES) return false;
    entry = { count: 0, resetAt: now + CHAT_RATE_WINDOW_MS };
    chatAskRate.set(ip, entry);
  }
  if (entry.count >= MAX_CHAT_ASKS_PER_WINDOW) return false;
  entry.count++;
  return true;
}
