import { createHash } from 'node:crypto';

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function payloadHash(payload) {
  return createHash('sha256').update(canonicalJson(payload)).digest('hex');
}

export class InMemoryEventStore {
  #events = new Map();

  reserve(eventId, hash) {
    const existing = this.#events.get(eventId);
    if (!existing) {
      const reservation = { eventId, hash, state: 'reserved', actionId: null };
      this.#events.set(eventId, reservation);
      return { status: 'reserved', record: { ...reservation } };
    }

    if (existing.hash !== hash) {
      return { status: 'conflict', record: { ...existing } };
    }

    return { status: 'duplicate', record: { ...existing } };
  }

  complete(eventId, actionId) {
    const existing = this.#events.get(eventId);
    if (!existing || existing.state !== 'reserved') {
      throw new Error(`Event ${eventId} is not reserved`);
    }
    this.#events.set(eventId, { ...existing, state: 'completed', actionId });
  }

  fail(eventId) {
    const existing = this.#events.get(eventId);
    if (!existing || existing.state !== 'reserved') {
      throw new Error(`Event ${eventId} is not reserved`);
    }
    this.#events.set(eventId, { ...existing, state: 'failed' });
  }

  get(eventId) {
    const record = this.#events.get(eventId);
    return record ? { ...record } : null;
  }
}

export function createWebhookReceiver({ store, createAction }) {
  if (!store || typeof store.reserve !== 'function' || typeof store.complete !== 'function') {
    throw new TypeError('A reservation-capable event store is required');
  }
  if (typeof createAction !== 'function') {
    throw new TypeError('createAction must be a function');
  }

  return async function receive(payload) {
    const eventId = payload?.event_id;
    if (typeof eventId !== 'string' || eventId.trim() === '') {
      return { httpStatus: 400, outcome: 'rejected', reason: 'missing_event_id' };
    }

    const normalizedEventId = eventId.trim();
    const hash = payloadHash(payload);
    const reservation = store.reserve(normalizedEventId, hash);

    if (reservation.status === 'conflict') {
      return {
        httpStatus: 409,
        outcome: 'rejected',
        reason: 'event_id_payload_conflict',
      };
    }

    if (reservation.status === 'duplicate') {
      if (reservation.record.state === 'reserved') {
        return {
          httpStatus: 202,
          outcome: 'in_progress',
          eventId: normalizedEventId,
        };
      }

      if (reservation.record.state === 'failed') {
        return {
          httpStatus: 503,
          outcome: 'manual_reconciliation_required',
          eventId: normalizedEventId,
        };
      }

      return {
        httpStatus: 200,
        outcome: 'duplicate',
        eventId: normalizedEventId,
        state: reservation.record.state,
        actionId: reservation.record.actionId,
      };
    }

    let actionId;
    try {
      actionId = await createAction(payload);
      store.complete(normalizedEventId, actionId);
    } catch {
      store.fail(normalizedEventId);
      return {
        httpStatus: 500,
        outcome: 'action_failed',
        eventId: normalizedEventId,
      };
    }

    return {
      httpStatus: 201,
      outcome: 'created',
      eventId: normalizedEventId,
      actionId,
    };
  };
}
