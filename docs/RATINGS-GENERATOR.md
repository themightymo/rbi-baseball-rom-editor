# Ratings Lab methodology

Ratings Lab converts a user-entered real-stat line into editable recommendations. It is deliberately
separate from ROM parsing and writing. These formulas are transparent balancing heuristics; they
are **not** a recovered Tengen formula, a historical rating source, or canonical truth.

All results are clamped to the confirmed writable range. The UI labels every result “Suggested,”
allows manual adjustment, and writes nothing until the user clicks the apply button. The apply step
uses the same confirmed batter/pitcher writer APIs as the roster editor, so record slots and unknown
bytes remain untouched.

## Batter recommendations

Inputs are at-bats, hits, home runs, and stolen bases. Each playable rating is deliberately tied to
one familiar result: Contact to batting average, Power to home runs, and Speed to stolen-base rate.

```text
Average = round(H / AB × 1000), clamped 150–405
Home Runs = HR, clamped 0–255
Contact = round(H / AB × 80), clamped 0–255
Power = 650 + HR × 8, clamped 0–65535
Speed = round(110 + SB / AB × 500), clamped 0–255
```

The constants place ordinary historical stat lines near the observed RBI scale; they are editorial
choices and can be changed later without changing ROM code. Stolen bases are a recommendation input,
not a newly decoded ROM field; the generated Speed value is the only value written from that input.

## Pitcher recommendations

Inputs are decimal innings pitched, appearances, earned runs, strikeouts, walks, and a scouting
fastball velocity in MPH. Decimal innings means a true decimal (for example, `6.67` for approximately
six and two-thirds innings), not baseball's scorebook `.2` notation.

```text
ERA = round(ER × 9 / IP × 100), clamped 100–355
K/9 = SO × 9 / IP
BB/9 = BB × 9 / IP
Drop = round(8 − BB/9 × 0.8), clamped 0–15
Left Curve = Right Curve = round((K/9 − 2) × 1.2), clamped 0–15
Fast = round(MPH × 2), clamped 0–255
Normal = Fast − 20, clamped 0–255
Slow = Fast − 40, clamped 0–255
Stamina = round(IP / appearances × 10), clamped 0–255
```

K/9 and BB/9 cannot identify pitch shape or handedness. Their use for equal curve and drop proxies is
explicitly heuristic, which is why review and manual adjustment are required. Ratings Lab does not
change pitcher handedness, delivery, name, or either unknown byte.
