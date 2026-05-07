/**
 * ws-handler.ts — WebSocket + MQTT pub/sub para el chat de IA.
 *
 * Flujo:
 *   Browser ←WebSocket─ /ws/chat ─ portal ─MQTT publish─▶ mosquitto ─▶ backend-ia
 *   Browser ─WebSocket─ /ws/chat ─ portal ◀MQTT subscribe─ mosquitto ◀─ backend-ia
 *
 * Cada sesión WebSocket tiene un clientId único.
 * Las respuestas MQTT llegan por topic ai/response/{correlationId},
 * donde correlationId = clientId + timestamp.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import { randomUUID } from 'node:crypto';
import mqtt from 'mqtt';
import { getCurrentPrompt } from './admin-routes.js';

const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://mosquitto:1883';
const MQTT_TOPIC_ASK = 'ai/ask';
const MQTT_TOPIC_RESPONSE_PREFIX = 'ai/response/';

// ─── Tipos de mensajes WebSocket ─────────────────────────────────────

type WsMessageIn =
  | { type: 'ask'; payload: { question: string; contact: Record<string, string> } }
  | { type: 'ping' };

type WsMessageOut =
  | { type: 'answer'; id: number; answer: string; mode: string }
  | { type: 'error'; message: string }
  | { type: 'pong' }
  | { type: 'connected'; clientId: string };

// ─── Estado del módulo ────────────────────────────────────────────────

// Mapa correlationId → WebSocket cliente que espera la respuesta
const pendingRequests = new Map<string, WebSocket>();

let mqttClient: mqtt.MqttClient | null = null;

// ─── MQTT client (singleton) ──────────────────────────────────────────

function getMqttClient(): mqtt.MqttClient {
  if (mqttClient) return mqttClient;

  console.log(`[ws-handler] Conectando a MQTT: ${MQTT_URL}`);

  mqttClient = mqtt.connect(MQTT_URL, {
    clientId: `backend-portal-${randomUUID().substring(0, 8)}`,
    clean: true,
    reconnectPeriod: 2_000,
    connectTimeout: 10_000,
  });

  mqttClient.on('connect', () => {
    console.log('[ws-handler] MQTT conectado');
    // Suscribirse al prefijo de respuestas
    mqttClient!.subscribe(`${MQTT_TOPIC_RESPONSE_PREFIX}+`, (err) => {
      if (err) console.error('[ws-handler] Error suscripción MQTT:', err);
      else console.log(`[ws-handler] Suscrito a ${MQTT_TOPIC_RESPONSE_PREFIX}+`);
    });
  });

  mqttClient.on('error', (err) => {
    console.error('[ws-handler] Error MQTT:', err.message);
  });

  mqttClient.on('message', (topic, message) => {
    // topic = ai/response/{correlationId}
    if (!topic.startsWith(MQTT_TOPIC_RESPONSE_PREFIX)) return;

    const correlationId = topic.slice(MQTT_TOPIC_RESPONSE_PREFIX.length);
    const ws = pendingRequests.get(correlationId);

    if (!ws) {
      // Cliente ya desconectado o correlationId desconocido
      return;
    }

    pendingRequests.delete(correlationId);

    let parsed: any;
    try {
      parsed = JSON.parse(message.toString());
    } catch {
      sendWs(ws, { type: 'error', message: 'Respuesta IA inválida' });
      return;
    }

    if (parsed.error) {
      sendWs(ws, { type: 'error', message: parsed.error });
    } else {
      sendWs(ws, {
        type: 'answer',
        id: parsed.id,
        answer: parsed.answer,
        mode: parsed.mode,
      });
    }
  });

  return mqttClient;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function sendWs(ws: WebSocket, msg: WsMessageOut): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ─── WebSocket Server ─────────────────────────────────────────────────

export function attachWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Registrar upgrade solo para /ws/chat
  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = req.url ?? '';
    if (!url.startsWith('/ws/chat')) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  // Inicializar MQTT al arrancar el WS server
  const mq = getMqttClient();

  wss.on('connection', (ws: WebSocket) => {
    const clientId = randomUUID();
    console.log(`[ws-handler] Cliente conectado: ${clientId}`);

    // Confirmar conexión al cliente
    sendWs(ws, { type: 'connected', clientId });

    // Timeout de inactividad: 5 minutos
    let inactivityTimer: NodeJS.Timeout | null = null;

    function resetTimer() {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log(`[ws-handler] Cliente ${clientId} inactivo, cerrando`);
        ws.close(1000, 'Inactividad');
      }, 5 * 60 * 1000);
    }

    resetTimer();

    ws.on('message', (raw) => {
      resetTimer();
      let msg: WsMessageIn;

      try {
        msg = JSON.parse(raw.toString());
      } catch {
        sendWs(ws, { type: 'error', message: 'Mensaje inválido' });
        return;
      }

      if (msg.type === 'ping') {
        sendWs(ws, { type: 'pong' });
        return;
      }

      if (msg.type === 'ask') {
        const { question, contact } = msg.payload ?? {};

        if (!question || question.trim().length < 8) {
          sendWs(ws, { type: 'error', message: 'La pregunta debe tener al menos 8 caracteres' });
          return;
        }
        if (!contact?.name?.trim() || !contact?.phone?.trim()) {
          sendWs(ws, { type: 'error', message: 'Nombre y teléfono son obligatorios' });
          return;
        }

        const correlationId = `${clientId}-${Date.now()}`;
        pendingRequests.set(correlationId, ws);

        // Timeout de espera de respuesta IA: 60 segundos
        setTimeout(() => {
          if (pendingRequests.has(correlationId)) {
            pendingRequests.delete(correlationId);
            sendWs(ws, { type: 'error', message: 'Tiempo de espera agotado. Intenta de nuevo.' });
          }
        }, 60_000);

        // Publicar en MQTT para que backend-ia procese
        const mqPayload = JSON.stringify({
          correlationId,
          question: question.trim(),
          contact,
          systemPrompt: getCurrentPrompt(),
        });

        mq.publish(MQTT_TOPIC_ASK, mqPayload, { qos: 1 }, (err) => {
          if (err) {
            pendingRequests.delete(correlationId);
            sendWs(ws, { type: 'error', message: 'Error publicando en cola. Intenta de nuevo.' });
          }
        });

        return;
      }

      sendWs(ws, { type: 'error', message: `Tipo de mensaje desconocido` });
    });

    ws.on('close', () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      console.log(`[ws-handler] Cliente desconectado: ${clientId}`);
    });

    ws.on('error', (err) => {
      console.error(`[ws-handler] Error en cliente ${clientId}:`, err.message);
    });
  });

  console.log('[ws-handler] WebSocket server adjunto en /ws/chat');
  return wss;
}
