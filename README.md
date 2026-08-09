# StratCoreAlpha Pine Script portfolio

Public, source-level proof for deterministic TradingView engineering.

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
