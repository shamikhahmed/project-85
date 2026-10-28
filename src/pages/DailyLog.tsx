import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WATER_QUICK_ADDS, EMPTY_HONESTY } from '../domain/defaults';
import type {
  FoodEntry,
  MealCategory,
  NutritionConfidence,
  WorkoutType,
} from '../domain/types';
import * as repo from '../data/repository';
import { overnightWakeDate, sleepDurationHours, toLocalISODate } from '../lib/dates';
import { sumFoodEntries } from '../lib/nutrition';
import { useAppStore } from '../store/useAppStore';

const TABS = [
  'weight',
  'food',
  'steps',
  'water',
  'workout',
  'sleep',
  'smoking',
  'notes',
] as const;
type Tab = (typeof TABS)[number];

const MEALS: MealCategory[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
  'pre_workout',
  'post_workout',
  'drinks',
  'other',
];

export function DailyLog() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'food';
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setDate = useAppStore((s) => s.setDate);
  const refreshDay = useAppStore((s) => s.refreshDay);
  const setToast = useAppStore((s) => s.setToast);
  const settings = useAppStore((s) => s.settings);
  const agg = useAppStore((s) => s.todayAgg);

  const setTab = (t: Tab) => setParams({ tab: t });

  return (
    <div className="stack page">
      <header className="panel page-header">
        <div className="page-toolbar">
          <div>
            <h1>Daily Log</h1>
            <p className="muted">Honest tracking · autosaves to this device</p>
          </div>
          <label>
            <span className="sr-only">Log date</span>
            <input
              className="input"
              type="date"
              value={selectedDate}
              min={settings?.startDate}
              max={settings?.deadline}
              onChange={(e) => void setDate(e.target.value)}
            />
          </label>
        </div>
        <div className="tab-row" role="tablist" aria-label="Log sections">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {tab === 'weight' && (
        <WeightPanel date={selectedDate} onSaved={refreshDay} toast={setToast} />
      )}
      {tab === 'food' && (
        <FoodPanel date={selectedDate} onSaved={refreshDay} toast={setToast} />
      )}
      {tab === 'steps' && (
        <StepsPanel
          date={selectedDate}
          target={settings?.stepsTarget ?? 10000}
          current={agg?.steps ?? null}
          onSaved={refreshDay}
          toast={setToast}
        />
      )}
      {tab === 'water' && (
        <WaterPanel
          date={selectedDate}
          target={settings?.waterTargetMl ?? 3000}
          current={agg?.waterMl ?? 0}
          onSaved={refreshDay}
          toast={setToast}
        />
      )}
      {tab === 'workout' && (
        <WorkoutPanel date={selectedDate} onSaved={refreshDay} toast={setToast} />
      )}
      {tab === 'sleep' && (
        <SleepPanel date={selectedDate} onSaved={refreshDay} toast={setToast} />
      )}
      {tab === 'smoking' && (
        <SmokingPanel date={selectedDate} onSaved={refreshDay} toast={setToast} />
      )}
      {tab === 'notes' && (
        <NotesPanel date={selectedDate} onSaved={refreshDay} toast={setToast} />
      )}

    </div>
  );
}

function WeightPanel({
  date,
  onSaved,
  toast,
}: {
  date: string;
  onSaved: () => Promise<void>;
  toast: (m: string) => void;
}) {
  const [kg, setKg] = useState('96');
  const [waist, setWaist] = useState('');
  const [notes, setNotes] = useState('');
  const [estimate, setEstimate] = useState(false);
  const [list, setList] = useState<Awaited<ReturnType<typeof repo.getWeightsByDate>>>([]);

  const reload = async () => setList(await repo.getWeightsByDate(date));
  useEffect(() => {
    void reload();
  }, [date]);

  const save = async () => {
    const weightKg = Number(kg);
    if (!Number.isFinite(weightKg) || weightKg < 40 || weightKg > 300) {
      toast('Enter a realistic weight in kg');
      return;
    }
    const enteredLate = date !== toLocalISODate();
    await repo.upsertPrimaryWeight({
      date,
      weightKg,
      waistCm: waist ? Number(waist) : undefined,
      notes: notes || undefined,
      isEstimate: estimate,
      enteredLate,
    });
    toast('Weight saved');
    await onSaved();
    await reload();
  };

  return (
    <section className="panel stack">
      <h2 style={{ fontSize: '1.05rem' }}>Morning weight</h2>
      <p className="dim" style={{ margin: 0, fontSize: '0.85rem' }}>
        One primary morning weight per day. Corrections demote the previous primary.
      </p>
      <label>
        <span className="label">Weight (kg)</span>
        <input className="input" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} />
      </label>
      <label>
        <span className="label">Waist (cm, optional)</span>
        <input className="input" inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} />
      </label>
      <label>
        <span className="label">Notes</span>
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <label className="row">
        <input type="checkbox" checked={estimate} onChange={(e) => setEstimate(e.target.checked)} />
        This is an estimate, not a measured weigh-in
      </label>
      <button type="button" className="btn btn-primary" onClick={() => void save()}>
        Save primary weight
      </button>
      <div className="stack">
        {list.map((w) => (
          <div key={w.id} className="metric row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="mono">{w.weightKg} kg</div>
              <div className="dim" style={{ fontSize: '0.75rem' }}>
                {w.isPrimaryMorning ? 'Primary' : 'Correction'} · {w.isEstimate ? 'Estimate' : 'Measured'}
                {w.enteredLate ? ' · Late entry' : ''}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                if (!confirm('Delete this weight entry?')) return;
                await repo.deleteWeight(w.id);
                toast('Deleted');
                await onSaved();
                await reload();
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function FoodPanel({
  date,
  onSaved,
  toast,
}: {
  date: string;
  onSaved: () => Promise<void>;
  toast: (m: string) => void;
}) {
  const library = useAppStore((s) => s.foodLibrary);
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MealCategory>('lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fibre, setFibre] = useState('');
  const [portion, setPortion] = useState('');
  const [confidence, setConfidence] = useState<NutritionConfidence>('estimated');
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');
  const [honesty, setHonesty] = useState(EMPTY_HONESTY);
  const [honestAnswer, setHonestAnswer] = useState<boolean | null>(null);

  const totals = useMemo(() => sumFoodEntries(foods), [foods]);

  const reload = async () => {
    setFoods(await repo.getFoodsByDate(date));
    const notes = await repo.getNotesByDate(date);
    if (notes?.honestyChecklist) setHonesty(notes.honestyChecklist);
    if (notes?.loggedEverythingHonestly != null) setHonestAnswer(notes.loggedEverythingHonestly);
  };
  useEffect(() => {
    void reload();
  }, [date]);

  const add = async (fromLib?: (typeof library)[0]) => {
    const entryName = fromLib?.name ?? name;
    const cal = fromLib ? fromLib.calories : Number(calories);
    if (!entryName.trim() || !Number.isFinite(cal)) {
      toast('Name and calories required');
      return;
    }
    await repo.addFood({
      date,
      category: fromLib?.category ?? category,
      name: entryName.trim(),
      portion: (fromLib?.defaultPortion ?? portion) || undefined,
      calories: cal,
      proteinG: fromLib ? fromLib.proteinG : Number(protein) || 0,
      carbsG: fromLib ? fromLib.carbsG : Number(carbs) || 0,
      fatG: fromLib ? fromLib.fatG : Number(fat) || 0,
      fibreG: fromLib ? fromLib.fibreG : fibre ? Number(fibre) : undefined,
      confidence: fromLib?.confidence ?? confidence,
      calorieRangeMin: rangeMin ? Number(rangeMin) : undefined,
      calorieRangeMax: rangeMax ? Number(rangeMax) : undefined,
      libraryItemId: fromLib?.id,
      enteredLate: date !== toLocalISODate(),
    });
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setFibre('');
    toast('Food logged');
    await onSaved();
    await reload();
  };

  const saveHonesty = async () => {
    await repo.upsertNotes(date, {
      honestyChecklist: honesty,
      loggedEverythingHonestly: honestAnswer,
    });
    toast('Honesty check saved — accurate reporting earns XP');
    await onSaved();
  };

  return (
    <div className="stack">
      <section className="panel stack">
        <h2 style={{ fontSize: '1.05rem' }}>Food & calories</h2>
        <div className="grid-metrics">
          <div className="metric">
            <div className="label">Calories</div>
            <div className="value">{totals.calories}</div>
          </div>
          <div className="metric">
            <div className="label">Protein</div>
            <div className="value">{totals.proteinG} g</div>
          </div>
          <div className="metric">
            <div className="label">Carbs</div>
            <div className="value">{totals.carbsG} g</div>
          </div>
          <div className="metric">
            <div className="label">Fat</div>
            <div className="value">{totals.fatG} g</div>
          </div>
        </div>
        {totals.estimatedCount > 0 && (
          <p className="badge badge-info">
            {totals.estimatedCount} estimated {totals.estimatedCount === 1 ? 'entry' : 'entries'}{' '}
            — macros stay labelled estimated until verified.
          </p>
        )}
        {totals.calorieMismatch && (
          <p className="badge badge-warn">
            Macro-derived calories ({totals.macroDerivedCalories}) differ from declared totals —
            often rounding or incomplete macros. Declared calories drive targets.
          </p>
        )}

        <div className="grid-2">
          <label>
            <span className="label">Food name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className="label">Category</span>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value as MealCategory)}>
              {MEALS.map((m) => (
                <option key={m} value={m}>
                  {m.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Portion</span>
            <input className="input" value={portion} onChange={(e) => setPortion(e.target.value)} />
          </label>
          <label>
            <span className="label">Confidence</span>
            <select
              className="select"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value as NutritionConfidence)}
            >
              <option value="estimated">Estimated</option>
              <option value="verified">Verified</option>
              <option value="range">Range / restaurant</option>
            </select>
          </label>
          <label>
            <span className="label">Calories</span>
            <input className="input" inputMode="decimal" value={calories} onChange={(e) => setCalories(e.target.value)} />
          </label>
          <label>
            <span className="label">Protein (g)</span>
            <input className="input" inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </label>
          <label>
            <span className="label">Carbs (g)</span>
            <input className="input" inputMode="decimal" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </label>
          <label>
            <span className="label">Fat (g)</span>
            <input className="input" inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} />
          </label>
        </div>
        {confidence === 'range' && (
          <div className="grid-2">
            <label>
              <span className="label">Range min kcal</span>
              <input className="input" value={rangeMin} onChange={(e) => setRangeMin(e.target.value)} />
            </label>
            <label>
              <span className="label">Range max kcal</span>
              <input className="input" value={rangeMax} onChange={(e) => setRangeMax(e.target.value)} />
            </label>
          </div>
        )}
        <button type="button" className="btn btn-primary" onClick={() => void add()}>
          Add food entry
        </button>

        <h3 style={{ fontSize: '0.95rem' }}>Food library</h3>
        <div className="quick-grid">
          {library.slice(0, 8).map((item) => (
            <button key={item.id} type="button" className="btn" onClick={() => void add(item)}>
              {item.name}
              <span className="dim" style={{ fontSize: '0.7rem' }}>
                {item.confidence}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel stack">
        <h3 style={{ fontSize: '1rem' }}>Today’s entries</h3>
        {foods.length === 0 && (
          <div className="empty-state" style={{ padding: '24px 8px' }}>
            <h2 style={{ fontSize: '1rem' }}>Nothing logged yet — that’s fine</h2>
            <p>
              Add a meal above or tap a library item (tikka, boti, chapati, whey…). Estimates are
              OK when labelled. Honesty beats a blank perfect-looking day.
            </p>
          </div>
        )}
        {foods.map((f) => (
          <div key={f.id} className="metric" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <strong>{f.name}</strong>
              <div className="dim" style={{ fontSize: '0.8rem' }}>
                {f.category} · {f.calories} kcal · P{f.proteinG} ·{' '}
                <span className="badge badge-info">{f.confidence}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                if (!confirm('Delete this food entry?')) return;
                await repo.deleteFood(f.id);
                toast('Deleted');
                await onSaved();
                await reload();
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </section>

      <section className="panel stack">
        <h3 style={{ fontSize: '1rem' }}>Did I log everything honestly?</h3>
        <p className="dim" style={{ margin: 0, fontSize: '0.85rem' }}>
          Accurate reporting is rewarded even when intake is above target. Never invent precise values.
        </p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${honestAnswer === true ? 'btn-primary' : ''}`}
            onClick={() => setHonestAnswer(true)}
          >
            Yes
          </button>
          <button
            type="button"
            className={`btn ${honestAnswer === false ? 'btn-primary' : ''}`}
            onClick={() => setHonestAnswer(false)}
          >
            Not yet
          </button>
        </div>
        {(
          [
            ['cookingOilGhee', 'Cooking oil / ghee'],
            ['saucesChutneys', 'Sauces & chutneys'],
            ['snacksBites', 'Snacks & bites'],
            ['sugaryDrinks', 'Sugary / caloric drinks'],
            ['restaurantPortions', 'Restaurant portions'],
            ['unplannedMeals', 'Unplanned meals'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="row">
            <input
              type="checkbox"
              checked={honesty[key]}
              onChange={(e) => setHonesty({ ...honesty, [key]: e.target.checked })}
            />
            Checked: {label}
          </label>
        ))}
        <button type="button" className="btn btn-primary" onClick={() => void saveHonesty()}>
          Save honesty check
        </button>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Forgot something? Change the date above and add the missed food to the correct day.
        </p>
      </section>
    </div>
  );
}

function StepsPanel({
  date,
  target,
  current,
  onSaved,
  toast,
}: {
  date: string;
  target: number;
  current: number | null;
  onSaved: () => Promise<void>;
  toast: (m: string) => void;
}) {
  const [steps, setSteps] = useState(String(current ?? ''));
  useEffect(() => setSteps(String(current ?? '')), [current, date]);

  const save = async () => {
    const n = Math.round(Number(steps));
    if (!Number.isFinite(n) || n < 0 || n > 200000) {
      toast('Enter a valid step total');
      return;
    }
    await repo.setStepsForDate(date, n);
    toast('Steps saved (replaces day’s total — no double-count)');
    await onSaved();
  };

  const pct = current != null ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <section className="panel stack">
      <h2 style={{ fontSize: '1.05rem' }}>Steps</h2>
      <p className="dim" style={{ margin: 0 }}>
        Rule: each save <strong>replaces</strong> the day’s total. Enter the absolute count from your
        phone/watch. Manual only — Health sync is future work.
      </p>
      <div className="metric">
        <div className="label">Today</div>
        <div className="value">
          {current ?? '—'} / {target}
        </div>
        <div className="progress-track" style={{ marginTop: 10 }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <label>
        <span className="label">Total steps for this day</span>
        <input className="input" inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} />
      </label>
      <button type="button" className="btn btn-primary" onClick={() => void save()}>
        Save steps
      </button>
      <p className="dim" style={{ fontSize: '0.8rem' }}>
        Missed the target? Log honestly and resume tomorrow — don’t sacrifice sleep to finish steps.
      </p>
    </section>
  );
}

function WaterPanel({
  date,
  target,
  current,
  onSaved,
  toast,
}: {
  date: string;
  target: number;
  current: number;
  onSaved: () => Promise<void>;
  toast: (m: string) => void;
}) {
  const [custom, setCustom] = useState('');
  const [timeline, setTimeline] = useState<Awaited<ReturnType<typeof repo.getWaterByDate>>>([]);
  const reload = async () => setTimeline(await repo.getWaterByDate(date));
  useEffect(() => {
    void reload();
  }, [date]);

  const add = async (ml: number) => {
    if (!Number.isFinite(ml) || ml <= 0 || ml > 5000) {
      toast('Invalid amount');
      return;
    }
    await repo.addWater(date, ml);
    toast(`+${ml} ml`);
    await onSaved();
    await reload();
  };

  return (
    <section className="panel stack">
      <h2 style={{ fontSize: '1.05rem' }}>Water</h2>
      <p className="dim" style={{ margin: 0 }}>
        Personal hydration estimate — not a medical requirement. Sip steadily; never chug for weight
        loss.
      </p>
      <div className="metric">
        <div className="label">Today</div>
        <div className="value">
          {current} / {target} ml
        </div>
      </div>
      <div className="quick-grid">
        {WATER_QUICK_ADDS.map((ml) => (
          <button key={ml} type="button" className="btn" onClick={() => void add(ml)}>
            +{ml} ml
          </button>
        ))}
      </div>
      <div className="row">
        <input
          className="input"
          placeholder="Custom ml"
          inputMode="numeric"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <button type="button" className="btn btn-primary" onClick={() => void add(Number(custom))}>
          Add
        </button>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const undone = await repo.undoLastWater(date);
            toast(undone ? `Undid ${undone.amountMl} ml` : 'Nothing to undo');
            await onSaved();
            await reload();
          }}
        >
          Undo
        </button>
      </div>
      <div className="stack">
        {timeline.map((w) => (
          <div key={w.id} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="mono">
              +{w.amountMl} ml · {new Date(w.createdAt).toLocaleTimeString()}
            </span>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                if (!confirm('Delete this water entry?')) return;
                await repo.deleteWater(w.id);
                await onSaved();
                await reload();
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkoutPanel({
  date,
  onSaved,
  toast,
}: {
  date: string;
  onSaved: () => Promise<void>;
  toast: (m: string) => void;
}) {
  const [type, setType] = useState<WorkoutType>('strength');
  const [mins, setMins] = useState('45');
  const [effort, setEffort] = useState('6');
  const [notes, setNotes] = useState('');
  const [list, setList] = useState<Awaited<ReturnType<typeof repo.getWorkoutsByDate>>>([]);
  const reload = async () => setList(await repo.getWorkoutsByDate(date));
  useEffect(() => {
    void reload();
  }, [date]);

  return (
    <section className="panel stack">
      <h2 style={{ fontSize: '1.05rem' }}>Workout</h2>
      <p className="dim" style={{ margin: 0 }}>
        Exercise calories are never added to food allowance. No earning meals through training.
      </p>
      <label>
        <span className="label">Type</span>
        <select className="select" value={type} onChange={(e) => setType(e.target.value as WorkoutType)}>
          {(['strength', 'swimming', 'walking', 'running', 'cardio', 'rest', 'other'] as WorkoutType[]).map(
            (t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ),
          )}
        </select>
      </label>
      <label>
        <span className="label">Duration (min)</span>
        <input className="input" value={mins} onChange={(e) => setMins(e.target.value)} />
      </label>
      <label>
        <span className="label">Perceived effort (1–10)</span>
        <input className="input" value={effort} onChange={(e) => setEffort(e.target.value)} />
      </label>
      <label>
        <span className="label">Notes / exercises</span>
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button
        type="button"
        className="btn btn-primary"
        onClick={async () => {
          await repo.upsertWorkout({
            date,
            type,
            durationMin: Number(mins) || undefined,
            perceivedEffort: Number(effort) || undefined,
            notes: notes || undefined,
          });
          toast('Workout saved');
          await onSaved();
          await reload();
        }}
      >
        Save workout
      </button>
      {list.map((w) => (
        <div key={w.id} className="metric row" style={{ justifyContent: 'space-between' }}>
          <div>
            <strong>{w.type}</strong> · {w.durationMin ?? '—'} min
          </div>
          <button
            type="button"
            className="btn btn-danger"
            onClick={async () => {
              if (!confirm('Delete workout?')) return;
              await repo.deleteWorkout(w.id);
              await onSaved();
              await reload();
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </section>
  );
}

function SleepPanel({
  date,
  onSaved,
  toast,
}: {
  date: string;
  onSaved: () => Promise<void>;
  toast: (m: string) => void;
}) {
  const [bed, setBed] = useState('23:00');
  const [wake, setWake] = useState('07:00');
  const [quality, setQuality] = useState('3');

  const duration = useMemo(() => {
    const bedIso = `${date}T${bed}:00`;
    const wakeDate = overnightWakeDate(date, bed, wake);
    return sleepDurationHours(bedIso, `${wakeDate}T${wake}:00`) ?? 0;
  }, [bed, wake, date]);

  return (
    <section className="panel stack">
      <h2 style={{ fontSize: '1.05rem' }}>Sleep</h2>
      <p className="dim" style={{ margin: 0 }}>
        Cross-midnight sessions calculated correctly. Duration: {duration} h
      </p>
      <div className="grid-2">
        <label>
          <span className="label">Bedtime</span>
          <input className="input" type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
        </label>
        <label>
          <span className="label">Wake</span>
          <input className="input" type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
        </label>
      </div>
      <label>
        <span className="label">Quality (1–5)</span>
        <input className="input" value={quality} onChange={(e) => setQuality(e.target.value)} />
      </label>
      <button
        type="button"
        className="btn btn-primary"
        onClick={async () => {
          const bedIso = `${date}T${bed}:00`;
          const wakeDate = overnightWakeDate(date, bed, wake);
          await repo.upsertSleep({
            date,
            bedtime: bedIso,
            wakeTime: `${wakeDate}T${wake}:00`,
            quality: Number(quality) as 1 | 2 | 3 | 4 | 5,
          });
          toast('Sleep saved');
          await onSaved();
        }}
      >
        Save sleep
      </button>
    </section>
  );
}

function SmokingPanel({
  date,
  onSaved,
  toast,
}: {
  date: string;
  onSaved: () => Promise<void>;
  toast: (m: string) => void;
}) {
  const [count, setCount] = useState('1');
  const [note, setNote] = useState('');
  const [list, setList] = useState<Awaited<ReturnType<typeof repo.getCigarettesByDate>>>([]);
  const reload = async () => setList(await repo.getCigarettesByDate(date));
  useEffect(() => {
    void reload();
  }, [date]);

  const total = list.reduce((s, c) => s + c.count, 0);

  return (
    <section className="panel stack">
      <h2 style={{ fontSize: '1.05rem' }}>Cigarettes</h2>
      <p className="dim" style={{ margin: 0 }}>
        No number is “safe.” Lapses are data, not shame. Target: zero.
      </p>
      <div className="metric">
        <div className="label">Today</div>
        <div className="value">{list.length ? total : '—'}</div>
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            await repo.logZeroCigarettes(date);
            toast('Logged zero — strong choice');
            await onSaved();
            await reload();
          }}
        >
          Log zero today
        </button>
      </div>
      <label>
        <span className="label">Count</span>
        <input className="input" value={count} onChange={(e) => setCount(e.target.value)} />
      </label>
      <label>
        <span className="label">Craving / trigger note</span>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button
        type="button"
        className="btn"
        onClick={async () => {
          await repo.addCigarette({
            date,
            count: Math.max(1, Math.round(Number(count) || 1)),
            cravingNote: note || undefined,
            substance: 'tobacco',
            timestamp: new Date().toISOString(),
          });
          toast('Logged — plan a healthier response for next time');
          setNote('');
          await onSaved();
          await reload();
        }}
      >
        Log cigarettes
      </button>
      {list.map((c) => (
        <div key={c.id} className="row" style={{ justifyContent: 'space-between' }}>
          <span>
            {c.count} · {c.cravingNote || c.substance}
          </span>
          <button
            type="button"
            className="btn btn-danger"
            onClick={async () => {
              if (!confirm('Delete entry?')) return;
              await repo.deleteCigarette(c.id);
              await onSaved();
              await reload();
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </section>
  );
}

function NotesPanel({
  date,
  onSaved,
  toast,
}: {
  date: string;
  onSaved: () => Promise<void>;
  toast: (m: string) => void;
}) {
  const [form, setForm] = useState({
    mood: '',
    hunger: '',
    energy: '',
    stress: '',
    wentWell: '',
    improveTomorrow: '',
    eveningReview: '',
    nextDayIntention: '',
  });

  useEffect(() => {
    void (async () => {
      const n = await repo.getNotesByDate(date);
      if (!n) return;
      setForm({
        mood: n.mood ?? '',
        hunger: n.hunger ?? '',
        energy: n.energy ?? '',
        stress: n.stress ?? '',
        wentWell: n.wentWell ?? '',
        improveTomorrow: n.improveTomorrow ?? '',
        eveningReview: n.eveningReview ?? '',
        nextDayIntention: n.nextDayIntention ?? '',
      });
    })();
  }, [date]);

  const field = (key: keyof typeof form, label: string) => (
    <label key={key}>
      <span className="label">{label}</span>
      <textarea
        className="textarea"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  return (
    <section className="panel stack">
      <h2 style={{ fontSize: '1.05rem' }}>Daily notes & evening review</h2>
      {field('mood', 'Mood')}
      {field('hunger', 'Hunger')}
      {field('energy', 'Energy')}
      {field('stress', 'Stress')}
      {field('wentWell', 'What went well')}
      {field('improveTomorrow', 'What needs improvement tomorrow')}
      {field('eveningReview', 'Evening review')}
      {field('nextDayIntention', 'Next-day intention')}
      <button
        type="button"
        className="btn btn-primary"
        onClick={async () => {
          await repo.upsertNotes(date, {
            ...form,
            dailyReviewCompleted: true,
          });
          toast('Review saved');
          await onSaved();
        }}
      >
        Save & mark review complete
      </button>
    </section>
  );
}
