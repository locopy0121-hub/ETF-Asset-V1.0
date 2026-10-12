# V4.0.48 automatic Widget background LIVE

User chose background LIVE with Android connection notification. Starting point V4.0.47 @39ceaf2. No price-polling intervals. Preserve protected Settings except identity and canonical finance formulas.

1. Shared pure finance holding projection used by App and headless Widget task; test same canonical accounting, last-trade metadata, missing/invalid ledger, per-symbol latest events.
2. One process-wide native market owner, event listeners. Widget foreground service starts during trading when installed Widgets exist and App is visible (or explicit Widget interaction), stays alive when screen/App is background, stops on close/last Widget removed/platform timeout. Heartbeat/reconnect and session boundary timers remain connection/lifecycle timers, never price polling.
3. Headless JS receives native quote events, reads existing ledger and calls the exact existing canonical core + shared projection, writes automatic Widget snapshot. Coalesced latest-event queue, no manual-refresh gate. Foreground App remains snapshot writer while visible.
4. Native shared snapshot monotonic market-version acceptance; Widget redraw on accepted App/headless snapshot without relying on forceRefreshOnTap. Remove Android updatePeriodMillis 30-minute timer. Do not modify protected Settings diagnostic clock or unrelated UI elapsed clocks.
5. Full inherited regressions + native lifecycle/projection/background writer tests + Android build. Device screen-off, background, Widget button disabled, restart/reconnect pending device validation. Advance identity to 4.0.48/40048 and deliver QA APK.

Review: bootstrap exception recovery and official calendar parity identified and repaired, with behavioral tests. App/Monitor queued writes are gated at execution time. Native version policy has JVM input/output tests. QA target only; device LIVE/background/screen-off/restart validation remains pending.
