import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWebhookReceiver,
  InMemoryEventStore,
} from './webhook_idempotency_fixture.mjs';

function buildHarness() {
  const actions = [];
  const store = new InMemoryEventStore();
  const receive = createWebhookReceiver({
    store,
    createAction: async (payload) => {
      const actionId = `action-${actions.length + 1}`;
      actions.push({ actionId, payload });
      return actionId;
    },
  });
  return { actions, receive, store };
}

const event = {
  event_id: 'EVT-1042',
  ticker: 'EURUSD',
  action: 'buy',
  bar_time: '2026-08-10T14:30:00.000Z',
};

test('a first valid event creates exactly one action', async () => {
  const { actions, receive, store } = buildHarness();
  const result = await receive(event);

  assert.equal(result.httpStatus, 201);
  assert.equal(result.outcome, 'created');
  assert.equal(actions.length, 1);
  assert.deepEqual(store.get('EVT-1042'), {
    eventId: 'EVT-1042',
    hash: store.get('EVT-1042').hash,
    state: 'completed',
    actionId: 'action-1',
  });
});

test('a transport retry returns success without repeating the action', async () => {
  const { actions, receive } = buildHarness();
  await receive(event);
  const retry = await receive({ ...event });

  assert.equal(retry.httpStatus, 200);
  assert.equal(retry.outcome, 'duplicate');
  assert.equal(retry.actionId, 'action-1');
  assert.equal(actions.length, 1);
});

test('reusing an event ID for a changed payload is rejected', async () => {
  const { actions, receive } = buildHarness();
  await receive(event);
  const conflict = await receive({ ...event, action: 'sell' });

  assert.equal(conflict.httpStatus, 409);
  assert.equal(conflict.reason, 'event_id_payload_conflict');
  assert.equal(actions.length, 1);
});

test('a missing event ID fails before any side effect', async () => {
  const { actions, receive } = buildHarness();
  const result = await receive({ ticker: 'EURUSD', action: 'buy' });

  assert.equal(result.httpStatus, 400);
  assert.equal(result.reason, 'missing_event_id');
  assert.equal(actions.length, 0);
});

test('a later event with a new ID creates one new action', async () => {
  const { actions, receive } = buildHarness();
  await receive(event);
  const next = await receive({ ...event, event_id: 'EVT-1043' });

  assert.equal(next.httpStatus, 201);
  assert.equal(next.actionId, 'action-2');
  assert.equal(actions.length, 2);
});

test('a concurrent retry is acknowledged without a second action', async () => {
  const store = new InMemoryEventStore();
  let releaseAction;
  let actionCalls = 0;
  const actionGate = new Promise((resolve) => { releaseAction = resolve; });
  const receive = createWebhookReceiver({
    store,
    createAction: async () => {
      actionCalls += 1;
      await actionGate;
      return 'action-1';
    },
  });

  const first = receive(event);
  const concurrent = await receive({ ...event });
  assert.equal(concurrent.httpStatus, 202);
  assert.equal(concurrent.outcome, 'in_progress');
  assert.equal(actionCalls, 1);

  releaseAction();
  assert.equal((await first).outcome, 'created');
});

test('an uncertain action failure is held for reconciliation, not retried', async () => {
  const store = new InMemoryEventStore();
  let actionCalls = 0;
  const receive = createWebhookReceiver({
    store,
    createAction: async () => {
      actionCalls += 1;
      throw new Error('synthetic downstream failure');
    },
  });

  const failure = await receive(event);
  const retry = await receive({ ...event });

  assert.equal(failure.httpStatus, 500);
  assert.equal(failure.outcome, 'action_failed');
  assert.equal(retry.httpStatus, 503);
  assert.equal(retry.outcome, 'manual_reconciliation_required');
  assert.equal(actionCalls, 1);
});
