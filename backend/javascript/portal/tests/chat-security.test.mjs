import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { allowChatAsk, validateChatAsk } from '../dist/chat-security.js';

const validAsk = {
  question: '¿Qué experiencia tiene con Java?',
  contact: { name: 'Ana Pérez', phone: '+525512345678', email: 'ana@example.com' },
};

test('valida y normaliza el payload permitido del chat', () => {
  assert.deepEqual(validateChatAsk({
    ...validAsk,
    contact: { ...validAsk.contact, unexpected: 'ignored' },
  }), validAsk);
});

test('rechaza preguntas y datos de contacto fuera de límites', () => {
  assert.equal(validateChatAsk({ ...validAsk, question: 'corta' }), null);
  assert.equal(validateChatAsk({ ...validAsk, question: 'x'.repeat(2001) }), null);
  assert.equal(validateChatAsk({ ...validAsk, contact: { ...validAsk.contact, phone: 'not a phone' } }), null);
  assert.equal(validateChatAsk({ ...validAsk, contact: { ...validAsk.contact, email: 'bad-email' } }), null);
  assert.equal(validateChatAsk({ ...validAsk, contact: { ...validAsk.contact, company: 'x'.repeat(121) } }), null);
});

test('limita a diez consultas por IP cada quince minutos', () => {
  const ip = `test-${randomUUID()}`;
  const now = 1_000_000;
  for (let i = 0; i < 10; i++) assert.equal(allowChatAsk(ip, now), true);
  assert.equal(allowChatAsk(ip, now), false);
  assert.equal(allowChatAsk(ip, now + 15 * 60 * 1000), true);
});
