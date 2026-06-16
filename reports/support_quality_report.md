# Support Quality (M10) — honesty grades, 85 cards
| Grade | Count | Notes |
|---|---|---|
| FULLY SUPPORTED (scripted + executed in tests AND fuzz) | 55 | |
| FULLY SUPPORTED, passive (aura/keyword evaluated in power calc + unit tests; no "ops" to trace) | 5 | ST01-004/013, ST02-003/014, ST05-008 |
| VANILLA (no effect) | 20 | trivially correct |
| GENERATED-AND-EXECUTED | 9 of 9 auto-scripts ran in fuzz | all A-class verified at runtime |
| PARTIAL | 1 | ST05-005 (typed cost filter) |
| ESCAPE-HATCH | 0 real cards | framework tested via fixture |
**Executed-in-tests rate: 60/65 scripted (92%) by op-trace; 65/65 (100%) counting passive evaluation + unit tests.**
