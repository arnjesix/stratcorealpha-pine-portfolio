# StratCoreAlpha Pine Script portfolio

Public, source-level proof for deterministic TradingView engineering.

## Webhook Idempotency Fixture

`webhook_idempotency_fixture.mjs` and its Node test file demonstrate the
receiver-side boundary behind the synthetic duplicated-webhook report. The
fixture reserves a stable event ID before a side effect, returns a successful
duplicate response for an identical retry, rejects an ID reused with a changed
payload, holds concurrent retries and fails closed for an uncertain downstream
error until it can be reconciled.

Run the seven deterministic cases with:

```bash
node --test webhook_idempotency_fixture.test.mjs
```

The store is deliberately in-memory so the example stays dependency-free and
auditable. It is not production persistence and does not claim crash recovery,
distributed locking, exchange acceptance or live trading safety. A real
receiver needs a durable atomic reservation in its own infrastructure.

See the clearly labelled synthetic report:
<https://stratcorealpha.com/diagnostic/sample-webhook-report>.

## MTF Confirmation Timing Inspector

`mtf_confirmation_timing_inspector.pine` is a Pine Script v6 diagnostic that
shows the difference between:

- the last fully confirmed higher-timeframe close; and
- the still-developing higher-timeframe close.

The script is designed for requirements clarification and replay/reload QA. It
does not generate trades, predict price, or promise performance.

### Quick validation

1. Open a 15-minute chart in TradingView.
2. Paste the source into Pine Editor and select a 4-hour higher timeframe.
3. Confirm that the teal step line changes only when a new 4-hour interval
   begins.
4. Observe that the orange line can change while the current 4-hour candle is
   developing.
5. Reload the chart and verify that the confirmed series retains the same
   historical values.

The script intentionally raises a runtime error when the selected higher
timeframe is not above the chart timeframe.

## Trend Stack Acceptance Inspector

`trend_stack_acceptance_inspector.pine` is a Pine Script v6 reference for the
small indicator briefs that combine chart overlays, an oscillator pane and
state-change alerts. It provides:

- chart-overlay EMA, SMA and built-in SuperTrend values;
- RSI in a separate pane from the same script;
- explicit bullish, bearish and neutral state definitions;
- optional completed-bar gating; and
- alerts only when the complete state changes, rather than on every bar that
  remains inside the same state.

The default bullish state requires `close > EMA > SMA`, bullish SuperTrend and
RSI at or above 50. The bearish state is the inverse. These are transparent
acceptance rules, not a recommendation or a claim of trading edge.

### Quick validation

1. Paste the source into Pine Editor and add it to a chart.
2. Confirm that EMA, SMA and SuperTrend render on the price chart while RSI
   renders in its own pane.
3. Keep `Require completed chart bar` enabled and use Bar Replay.
4. Verify that a `B` or `S` marker appears only on the first completed bar of a
   newly aligned state.
5. Reload the chart and confirm that historical states and markers are stable.
6. Change one threshold so the stack is no longer aligned and confirm the
   neutral alert becomes eligible only on the state transition.

The script places no order, sizes no position and makes no profitability claim.

## TradersPost Webhook Contract Inspector

`traderspost_webhook_contract_inspector.pine` is a Pine Script v6 proof for a
bounded TradingView-to-TradersPost signal contract. A transparent EMA crossover
creates deterministic buy/sell test events while the engineering proof covers:

- required `ticker` and `action` fields;
- explicit fixed quantity and quantity type;
- completed-bar timing and one-event-per-bar suppression;
- an inspectable event ID and JSON payload;
- an optional explicit ticker override for symbol-mapping cases; and
- disabled-by-default alert transmission with no bundled webhook URL.

The field names follow TradersPost's public Signal Message Reference and
TradingView integration documentation as checked on 2026-08-10. The source is
not a strategy edge, does not place TradingView orders and makes no claim of a
live endpoint acceptance test.

The exact source compiled and was saved in the authenticated TradingView Pine
Editor on 2026-08-10. Adding it to the chart was not tested
because the Basic account had already reached its two-indicator limit. No alert,
webhook or TradersPost endpoint was configured.

### Quick validation

1. Paste the source into Pine Editor and add it to a chart.
2. Leave `Enable alert() calls` off.
3. Use Bar Replay to reach a completed EMA crossover.
4. Parse the table payload and verify its required fields and event ID.
5. Reload and verify historical markers remain stable and no bar has duplicate
   contract events.
6. Use only an owned TradersPost paper/test route if transport is later tested.

## PineConnector Signal Contract Inspector

`pineconnector_signal_contract_inspector.pine` is a Pine Script v6 proof for
the current PineConnector explicit market-order message format. It generates a
masked, inspectable contract with one `vol_lots=`, `sl_pips=` and `tp_pips=`
field, completed-bar timing, one-event-per-bar suppression and an optional
broker-symbol override.

Alert transport is disabled by default. A valid owned 13- or 14-digit License
ID is required before `alert()` can run, and the on-chart table always masks it
as `LICENSE_ID`. The public source contains no webhook URL, secret or account
data and makes no live endpoint or profitability claim.

The explicit syntax is documented for market orders and PineConnector MT5 EA
v3.53.2 or later. Older EAs, pending orders and broker-specific execution are
outside this proof.

### Quick validation

1. Compile with alerts disabled and leave the License ID blank.
2. Reach a completed EMA crossover in Bar Replay.
3. Verify the masked message has exactly one volume, stop and target field.
4. Reload and confirm markers remain stable with no duplicate event per bar.
5. Use an owned trial or paper route only if transport is later tested.

## Request a bounded scope check

If you need help with an authorized Pine Script or TradingView timing problem,
[open a scope request](https://github.com/arnjesix/stratcorealpha-pine-portfolio/issues/new?template=scope-request.md).
Describe expected behavior and acceptance examples only. Do not post private
source code, credentials, broker tokens or proprietary strategy rules in a
public issue.

## Engineering boundary

The confirmed series uses the previous higher-timeframe bar together with
`barmerge.lookahead_on`. The developing series uses the current
higher-timeframe value with `barmerge.lookahead_off` and is labelled diagnostic
only.

## Contact

- Website: <https://stratcorealpha.com>
- MQL5 public tools: <https://www.mql5.com/en/users/stratcorealpha>

Only buyer-owned, authorized, or public source is accepted for modification.
No decompilation, hidden-source extraction, or profitability guarantees.
