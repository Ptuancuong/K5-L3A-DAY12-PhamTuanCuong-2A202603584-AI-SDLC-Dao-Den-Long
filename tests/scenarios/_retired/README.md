# Retired scenarios

| Scenario | Retired in | Reason |
|---|---|---|
| `p1-island-edge` | phase-2 | Phase 1 assumption A15 (`fall_enabled = false`, the island edge blocks Mây). Ticket-02 replaces it: falling off the island (Y < −10) is a rule. Replaced by `p2-fall-respawn` and `p2-fall-last-flame`. |
| `p1-win` | phase-3 | Ticket-03 [THAY THẾ] "thắng ngay khi tất cả đèn sáng": no early win any more, reason `all_lit` is gone. Replaced by `p3-all-lit-continues` (lighting the last lantern does not end the night) and `p3-win-dawn` / `p3-lose-dawn`. |
