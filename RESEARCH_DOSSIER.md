# PROJECT 85 — Research Dossier

**Goal:** Personal fat-loss PWA · **96.5 → 85 kg** · **Start ~27 Oct 2026** · **Deadline 15 Jan 2027**  
**Access date:** 2026-10-27  
**Window:** ~81 days (~11.6 weeks) → **~1.0 kg/week** average required (≈2.2 lb/week), at the upper end of CDC guidance; expect slowdown per NIDDK adaptive-metabolism model.

---

## Research methodology note

Bright Data `search_engine` / `scrape_as_markdown` returned **HTTP 401 (Auth method is not supported)** in this environment. Findings below use publicly reachable pages via alternate retrieval (including WebSearch-indexed excerpts). Direct fetch of [CDC losing weight](https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html) was blocked from this network (403); CDC wording is cited from the same official URL surfaced in search results.

**Quora:** Explicitly **blocked** — `curl` to a sample Quora weight-loss URL returned **HTTP 403**. No Quora claims included.

---

## 1. CDC healthy weight-loss rates

- **Rate:** Gradual loss **about 1–2 pounds per week**; slower loss is associated with better long-term maintenance ([CDC — Steps for Losing Weight](https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html)).
- **Calorie framing (CDC diabetes-prevention materials):** ~**500 kcal/day deficit ≈ 1 lb/week**; **1–2 lb/week** described as a healthy goal for most adults ([CDC Participant Module 7 PDF](https://www.cdc.gov/diabetes-prevention/media/pdfs/legacy/Participant-Module-7_Burn_More_Calories_Than_You_Take_In.pdf)).
- **Lifestyle bundle:** Nutrition, activity, stress, sleep ([CDC](https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html)).
- **Project 85 implication:** 11.5 kg in 81 days is **ambitious but not absurd** if early weeks include glycogen/water and the **trend** (not daily scale) stays downward; plan for **slower weeks** as weight falls.

---

## 2. NIDDK Body Weight Planner — context

- **What it is:** NIH/NIDDK tool for personalized calorie and activity plans to reach a goal weight **and** maintenance calories afterward ([About the Body Weight Planner](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner), [BWP app](https://www.niddk.nih.gov/bwp)).
- **Why not “3,500 kcal = 1 lb”:** As intake drops, expenditure and appetite **adapt**; real loss is **slower** than the old rule ([NIDDK blog — Kevin Hall](https://www.niddk.nih.gov/health-information/professionals/diabetes-discoveries-practice/nih-body-weight-planner)).
- **Dynamics (Hall et al., *Lancet*):** Body-weight response to energy imbalance is **slow**; half-time of change **~1 year**; heavier individuals lose more per same deficit but take **longer** to reach steady state ([PMC3880593](https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/)).
- **NIH news release:** ~**10 kcal/day cut per pound of desired loss** as a rough long-horizon heuristic; emphasizes consulting a physician ([NIH news](https://www.nih.gov/news-events/news-releases/nih-research-model-predicts-weight-varying-diet-exercise-changes)).
- **Planner UX cues:** Warns users **underestimate intake**; minimum **1,000 kcal/day** in tool ([BWP](https://www.niddk.nih.gov/bwp)).
- **Project 85 implication:** Briefings should **re-calibrate expectations** over time (TDEE ↓ as weight ↓), not treat linear 0.5 kg/week as guaranteed.

---

## 3. Resistance training during deficit / muscle retention

- **Overweight/obese adults + diet:** Adding resistance exercise **did not change total scale weight** vs diet alone, but **protected fat-free mass** (SMD 0.40) and **increased fat-mass loss** (SMD −0.36); strength ↑ (BMJ Open Sport & Exercise Medicine 2025 meta-analysis: [BMJ Open SEM e002363](https://bmjopensem.bmj.com/content/11/3/e002363)).
- **Older obese + CR:** RT prevented **~93.5%** of CR-induced lean-mass loss ([Nutrients 2018](https://doi.org/10.3390/nu10040423)).
- **Deficit size:** Meta-regression: deficits **>~500 kcal/day** impede lean-mass **gains** during RT; for **preserving** LM while losing, avoid very aggressive deficits ([Scandinavian Journal of Medicine & Science in Sports — PubMed 34623696](https://pubmed.ncbi.nlm.nih.gov/34623696/)).
- **Project 85 implication:** Track **trend + optional strength**, not panic when scale stalls while training; avoid “starvation” scoring that rewards extreme deficits.

---

## 4. Self-monitoring weight — evidence

- **Burke et al. 2011 (systematic review):** Self-monitoring (diet, activity, **self-weighing**) is central to behavioral programs; **more frequent monitoring ↔ more weight loss**, but evidence quality limited (homogeneous samples, self-report) ([PMC3268700](https://pmc.ncbi.nlm.nih.gov/articles/PMC3268700/)).
- **Self-weighing reviews:** Daily/weekly weighing **likely helps** when embedded in broader behavior change; **standalone** “weigh only” evidence weak; accountability may add benefit ([PubMed 26896865](https://pubmed.ncbi.nlm.nih.gov/26896865/), [Nutrition Evidence summary of meta-analysis](https://nutrition-evidence.com/article/237381/is-self-weighing-an-effective-tool-for-weight-loss-a-systematic-literature-review-and-meta-analysis)).
- **Project 85 implication:** Daily log-in + weight capture supports adherence; **interpret via trend**, not single readings.

---

## 5. Daily scale noise ≠ plateau (7-day averages)

- **Physiology:** In a long-term n=1 euvolemic series, day-to-day body mass SD **~0.53%** (~**±0.4 kg** at 75 kg) — dominated by **water**, sodium, glycogen, gut contents, not fat ([PMC10653631](https://pmc.ncbi.nlm.nih.gov/articles/PMC10653631/)).
- **Signal extraction:** Moving averages **filter noise** and track underlying trend; 7-day window covers one full weekly routine ([Hacker’s Diet — moving averages](https://fourmilab.ch/hackdiet/www/subsubsection1_2_4_0_4_2.html), [trend interpretation](https://fourmilab.ch/hackdiet/www/subsection1_2_4_0_5.html)).
- **Practical rule:** Compare **this week’s average vs last week’s**, not morning-to-morning ([Healthline — weight fluctuation](https://www.healthline.com/health/weight-fluctuation)).
- **“Plateau” (CDC lifestyle materials):** Weight **unchanged several weeks** (e.g. within **2–4 lb**) may warrant auditing logging accuracy and deficit — not a single bad weigh-in ([CDC GLB PDF via Stacks](https://stacks.cdc.gov/view/cdc/146604/cdc_146604_DS1.pdf)).
- **Project 85 implication:** **Trend engine (7-day avg)** is evidence-aligned core UX, not a cosmetic chart.

---

## 6. Reddit r/loseit — anecdotal themes *(not peer-reviewed)*

| Theme | Anecdotal pattern | Example threads |
|--------|-------------------|-----------------|
| **Plateaus / “whoosh”** | Multi-week scale flatlines while deficit believed intact; later sudden drops; caution that **fat loss may continue under water noise** | [Plateau advice](https://www.reddit.com/r/loseit/comments/6382ec/reached_the_plateau_a_few_months_ago_it_seems/), [whoosh duration](https://www.reddit.com/r/loseit/comments/6xhs1k/how_long_have_your_whoosh_plateaus_been/) |
| **Logging fatigue** | Tracking “hell”; selective weighing (proteins/fats/starches, not every leaf); burnout from perfection | [Calorie tracking exhausting](https://www.reddit.com/r/loseit/comments/1gi2wxl/anyone_else_find_calorie_tracking_exhausting_and/) |
| **Restaurant / street food** | **Cannot know calories precisely**; strategies = eat out less, **estimate high**, Google equivalents, accept error bands, “scale doesn’t lie” over weeks | Same thread + [cheat-day whoosh debate](https://www.reddit.com/r/loseit/comments/1twq7xz/why_always_woosh_effect_after_a_cheat_day/) (top comment: maintenance days don’t “flush” fat — **water/glycogen timing**) |
| **User error on stalls** | Outdated TDEE, unlogged oils/bites, cooked vs raw entries, eating back exercise calories | [6382ec comments](https://www.reddit.com/r/loseit/comments/6382ec/reached_the_plateau_a_few_months_ago_it_seems/) |

**Project 85 implication:** UX should **reduce shame** and **bounded estimation** (especially desi/restaurant meals), not 100% logging completeness as the only virtue.

---

## 7. YouTube — credible titles *(metadata/search snippets only; no fabricated transcripts)*

| Title | Creator / channel (as indexed) | URL | Relevance |
|--------|----------------------------------|-----|-----------|
| **The NIH Body Weight Planner** | NIDDK / Kevin Hall (official explainer) | https://www.youtube.com/watch?v=yJ8jmf0kGk0 | Adaptive metabolism vs 3,500 kcal/lb; maintenance calories |
| **Body Weight Planner** | Dr. Kevin Hall, NIH (walkthrough) | https://www.youtube.com/watch?v=v1gluQwieog | How to use BWP for goal date + activity |
| **“Calories, Carbs, or Quality: What Matters Most for Body Weight?”** | Kevin D. Hall, PhD — UMass Diabetes Center of Excellence | https://www.youtube.com/watch?v=J7mCP8PtgCI | Deep dive on energy balance, flawed 500 kcal/day rule |

---

## 8. Quora

**Not accessed:** HTTP **403** from this environment. Use Reddit + primary literature above for plateau/weigh-in psychology.

---

## Research → feature matrix (PROJECT 85)

| Research finding | Product feature | Design intent |
|------------------|-----------------|---------------|
| CDC 1–2 lb/week; deficit ~500 kcal ≈ 1 lb/week | **Daily briefing** | Set realistic weekly **trend** target; flag if required rate exceeds CDC band for >2 weeks |
| NIDDK adaptive model; loss slows; maintenance ≠ loss calories | **Daily briefing** + **trend engine** | Show “expected slowdown” copy; optional BWP link for recalibration |
| Day-to-day noise ~0.5% body mass; 7-day avg | **Trend engine (7-day avg)** | Primary KPI = rolling average + week-over-week delta |
| Self-monitoring ↔ outcomes (esp. with food log) | **Daily briefing** | Prompt: weigh + log **something** (meal or weight), not all-or-nothing |
| RT preserves FFM; scale weight may flatline | **Daily briefing** | Separate “composition” note when user logs strength |
| Restaurant/unknown meals = high error (anecdotal + CDC portion bias) | **Pakistani food library** | Curated kcal ranges for common home/des/vendor dishes; **range logging** not false precision |
| Logging fatigue; imperfect days normal | **Recovery after imperfect days** | Next-day “reset” flow: one honest estimate, resume streak without penalty spiral |
| Burke: completeness beats perfection; r/loseit: estimate and move on | **Honesty over perfection** | UI rewards **logged uncertainty** (“~600–800 kcal”) over skipped meals |
| Deficits >500 kcal/day + RT = LM risk; CDC warns against very low intake | **No starvation scoring** | Never gamify extreme deficit; warn below ~1200 kcal/day (align CDC GLB floor) |

---

## Executive summary

For **96.5 → 85 kg by 15 Jan 2027**, average loss (~**1 kg/week**) sits at the **top of CDC’s 1–2 lb/week** band; NIDDK’s Body Weight Planner science predicts **non-linear** loss and **metabolic adaptation**, so the app must lead with **7-day trend**, not daily scale drama. **Resistance training** supports fat-free mass during deficit; **self-weighing** helps when paired with logging. **r/loseit** (anecdotal) reinforces **logging fatigue**, **restaurant uncertainty**, and **plateau anxiety**—addressed via **Pakistani food ranges**, **recovery days**, and **honesty-over-perfection**. **Quora** was unavailable (403). **Bright Data** tools were unavailable (401); citations are from official CDC/NIDDK/NIH/PMC sources and indexed Reddit/YouTube URLs above.

---

## Sources

- [CDC — Steps for Losing Weight](https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html) (accessed 2026-10-27)
- [CDC — Burn More Calories Than You Take In (PDF)](https://www.cdc.gov/diabetes-prevention/media/pdfs/legacy/Participant-Module-7_Burn_More_Calories_Than_You_Take_In.pdf)
- [CDC — Group Lifestyle Balance PDF (Stacks)](https://stacks.cdc.gov/view/cdc/146604/cdc_146604_DS1.pdf)
- [NIDDK — About the Body Weight Planner](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner)
- [NIDDK — Body Weight Planner (app)](https://www.niddk.nih.gov/bwp)
- [NIDDK — NIH Body Weight Planner (Kevin Hall blog)](https://www.niddk.nih.gov/health-information/professionals/diabetes-discoveries-practice/nih-body-weight-planner)
- [Hall KD et al. — Lancet / PMC3880593](https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/)
- [NIH News — weight simulation model](https://www.nih.gov/news-events/news-releases/nih-research-model-predicts-weight-varying-diet-exercise-changes)
- [BMJ Open SEM — resistance exercise + diet meta-analysis](https://bmjopensem.bmj.com/content/11/3/e002363)
- [Nutrients 2018 — RT + CR in elderly obese](https://doi.org/10.3390/nu10040423)
- [PubMed 34623696 — energy deficit and RT lean mass](https://pubmed.ncbi.nlm.nih.gov/34623696/)
- [Burke et al. 2011 — PMC3268700](https://pmc.ncbi.nlm.nih.gov/articles/PMC3268700/)
- [PubMed 26896865 — self-weighing review](https://pubmed.ncbi.nlm.nih.gov/26896865/)
- [PMC10653631 — day-to-day body mass variability](https://pmc.ncbi.nlm.nih.gov/articles/PMC10653631/)
- [Hacker’s Diet — moving averages & trend](https://fourmilab.ch/hackdiet/www/subsubsection1_2_4_0_4_2.html)
- [Healthline — weight fluctuation](https://www.healthline.com/health/weight-fluctuation)
- [r/loseit threads](https://www.reddit.com/r/loseit/) (linked in §6)
- [YouTube — NIH Body Weight Planner](https://www.youtube.com/watch?v=yJ8jmf0kGk0)
- [YouTube — Body Weight Planner tutorial](https://www.youtube.com/watch?v=v1gluQwieog)
- [YouTube — Kevin Hall UMass lecture](https://www.youtube.com/watch?v=J7mCP8PtgCI)
