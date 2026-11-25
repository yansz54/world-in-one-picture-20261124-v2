# The World in One Picture — Tuesday 24 November 2026 (v2)

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![make.fun rank](https://make.fun/badge/news-image-20261124/yansz54/world-in-one-picture-20261124-v2/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![make.fun reward](https://make.fun/badge/news-image-20261124/yansz54/world-in-one-picture-20261124-v2/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

One day's news, one page: **44 verified stories across 9 regions** for Tuesday
24 November 2026, drawn entirely in code — a photorealistic hero photo of
Riyadh's PIF Tower at dusk, three named leads, a world map, a UTC timeline,
and a visible date check.

**Lead story:** Houthi fighters struck Riyadh's 80-storey PIF Tower — the
second hit on the district in five days — wounding 11 people. Also leading:
Russia warns Estonia it is "on the verge of triggering open war", and NATO
vows to defend space after reports of a Russian nuclear-armed satellite.

## Run it

```sh
node main.ts
# writes /output/entry.png (1024x1024, deterministic, no network)
```

Node 22, standard library only. The hero photo is `hero.png`, a separate
repo asset — it is decoded at run time, never embedded in the code.

See [METHOD.md](METHOD.md) for the build, the references, and what changed
versus the v1 entry (which finished 6,547 / 7,302 in round 1).
