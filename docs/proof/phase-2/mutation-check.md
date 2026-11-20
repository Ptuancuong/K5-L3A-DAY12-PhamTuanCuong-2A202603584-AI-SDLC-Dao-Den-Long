# Mutation check — phase-2

| Mutation | Failing scenarios |
|---|---|
| `pickup_radius`: 1 → 1.2 | p1-pickup |
| `lantern_cost`: 10 → 9 | p1-deposit-light, p1-partial-deposit, p1-win |
| `pulse_stun_s`: 2 → 2.5 | p1-pulse-stun |
| `pulse_cost`: 3 → 2 | p1-pulse-cooldown, p1-pulse-no-light, p1-pulse-stun, p2-drifter-pulse-chase |
| `invuln_s`: 1.5 → 1 | p1-hit-invuln |
| `dash_speed`: 14 → 13 | p2-dash, p2-dash-air |
| `dash_cooldown_s`: 1.5 → 1 | p2-dash |
| `safe_radius`: 6 → 5 | p1-safe-radius, p2-safe-evict |
| `shade_speed`: 4 → 5 | p2-shade-detect-lose, p2-shade-recoil |

Mutations survived: 0 / 9
