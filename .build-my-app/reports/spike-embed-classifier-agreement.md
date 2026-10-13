
### http  (chromium 141.0.7390.37, firefox 142.0.1, webkit 26.0)

| Fixture | Spec | Classifier | chromium | firefox | webkit | Agree |
|---|---|---|---|---|---|---|
| g1 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |
| g2 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |
| g3 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |
| g4 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |
| g5 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |
| b1 | blocked | blocked | blocked | blocked | blocked | yes |
| b2 | blocked | blocked | blocked | blocked | blocked | yes |
| b3 | blocked | blocked | blocked | blocked | blocked | yes |
| b4 | blocked | blocked | blocked | blocked | blocked | yes |
| b5 | blocked | blocked | blocked | blocked | blocked | yes |
| x1 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |
| x2 | blocked | blocked | blocked | blocked | blocked | yes |
| x3 | blocked | blocked | blocked | blocked | blocked | yes |
| x4 | blocked | blocked | blocked | blocked | blocked | yes |
| x5 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |
| x6 | blocked | blocked | blocked | blocked | blocked | yes |
| x7 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |
| x8 | blocked | blocked | blocked | blocked | blocked | yes |
| x9 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |
| x10 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |
| x11 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |
| x12 | embeddable | embeddable | embeddable | embeddable | embeddable | yes |

Agreement (core g1-g5,b1-b5 / extras x1-x12):
  chromium: core 10/10, extras 12/12
  firefox: core 10/10, extras 12/12
  webkit: core 10/10, extras 12/12

Reachability:
  r1 6 redirects: fail reason=too-many-redirects attempts=1 12 ms -> correct
  r2 11 s delay (timeout after one retry): fail reason=timeout attempts=2 20005 ms -> correct
  r3 404: fail reason=status-404 attempts=1 6 ms -> correct
  r4 500 then 200 on retry: pass reason=ok-after-retry attempts=2 8 ms -> correct
  r5 extra: exactly 5 redirects (limit is inclusive): pass reason=ok attempts=1 14 ms -> correct

### https  (chromium 141.0.7390.37, firefox NOT RUN, webkit 26.0)

| Fixture | Spec | Classifier | chromium | firefox | webkit | Agree |
|---|---|---|---|---|---|---|
| g1 | embeddable | embeddable | embeddable | n/a | embeddable | yes |
| g2 | embeddable | embeddable | embeddable | n/a | embeddable | yes |
| g3 | embeddable | embeddable | embeddable | n/a | embeddable | yes |
| g4 | embeddable | embeddable | embeddable | n/a | embeddable | yes |
| g5 | embeddable | embeddable | embeddable | n/a | embeddable | yes |
| b1 | blocked | blocked | blocked | n/a | blocked | yes |
| b2 | blocked | blocked | blocked | n/a | blocked | yes |
| b3 | blocked | blocked | blocked | n/a | blocked | yes |
| b4 | blocked | blocked | blocked | n/a | blocked | yes |
| b5 | blocked | blocked | blocked | n/a | blocked | yes |
| x1 | embeddable | embeddable | embeddable | n/a | embeddable | yes |
| x2 | blocked | blocked | blocked | n/a | blocked | yes |
| x3 | blocked | blocked | blocked | n/a | blocked | yes |
| x4 | blocked | blocked | blocked | n/a | blocked | yes |
| x5 | embeddable | embeddable | embeddable | n/a | embeddable | yes |
| x6 | blocked | blocked | blocked | n/a | blocked | yes |
| x7 | embeddable | embeddable | embeddable | n/a | embeddable | yes |
| x8 | blocked | blocked | blocked | n/a | blocked | yes |
| x9 | embeddable | embeddable | embeddable | n/a | embeddable | yes |
| x10 | embeddable | embeddable | embeddable | n/a | embeddable | yes |
| x11 | embeddable | embeddable | embeddable | n/a | embeddable | yes |
| x12 | embeddable | embeddable | embeddable | n/a | embeddable | yes |

Agreement (core g1-g5,b1-b5 / extras x1-x12):
  chromium: core 10/10, extras 12/12
  firefox: not run
  webkit: core 10/10, extras 12/12

Reachability:
  r1 6 redirects: fail reason=too-many-redirects attempts=1 10 ms -> correct
  r2 11 s delay (timeout after one retry): fail reason=timeout attempts=2 20004 ms -> correct
  r3 404: fail reason=status-404 attempts=1 7 ms -> correct
  r4 500 then 200 on retry: pass reason=ok-after-retry attempts=2 9 ms -> correct
  r5 extra: exactly 5 redirects (limit is inclusive): pass reason=ok attempts=1 15 ms -> correct
