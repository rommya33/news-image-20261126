# The World in One Day

[![news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/rommya33/news-image-20261126/rank.svg)](https://make.fun/bounty/news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/rommya33/news-image-20261126/reward.svg)](https://make.fun/bounty/news-image-20261126)

A one-page newspaper image summing up the world news of Thursday 26 November 2026: 33 stories in a single 1024×1024 picture. Three hero stories (Kim's nuclear order, the Houthi claim on Ras Tanura, the Nasdaq plunge and recovery), six middle stories, eight briefs and sixteen more in "Also Today", plus a box that separates what is claimed from what is confirmed.

## Run

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

It writes `out/entry.png` (1024×1024, ≤1 MiB) and reports `no truncations` when every line of text fits. Two runs produce byte-identical output.

## How it works

`main.ts` draws everything from scratch: a pixel buffer, a hand-made 5×7 bitmap font, and a manual PNG encoder (IHDR/IDAT/IEND, CRC-32, deflate). The date is a fixed string; the program uses no clock, no randomness and no network. All facts and figures come from reporting on 26 November 2026; claims that were still unverified that day are labelled CLAIMED, confirmed events CONFIRMED.

Entered on make.fun
