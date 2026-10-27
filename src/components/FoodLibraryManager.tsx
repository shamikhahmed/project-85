import { useState } from 'react';
import type { MealCategory, NutritionConfidence } from '../domain/types';
import * as repo from '../data/repository';
import { useAppStore } from '../store/useAppStore';

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

const emptyForm = () => ({
  name: '',
  defaultPortion: '1 serving',
  calories: '',
  proteinG: '',
  carbsG: '',
  fatG: '',
  fibreG: '',
  confidence: 'estimated' as NutritionConfidence,
  category: 'dinner' as MealCategory,
});

export function FoodLibraryManager() {
  const library = useAppStore((s) => s.foodLibrary);
  const refreshDay = useAppStore((s) => s.refreshDay);
  const setToast = useAppStore((s) => s.setToast);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const reload = async () => {
    await refreshDay();
  };

  const save = async () => {
    const calories = Number(form.calories);
    const proteinG = Number(form.proteinG) || 0;
    const carbsG = Number(form.carbsG) || 0;
    const fatG = Number(form.fatG) || 0;
    const fibreParsed = form.fibreG.trim() === '' ? undefined : Number(form.fibreG);
    if (!form.name.trim() || !Number.isFinite(calories) || calories < 0) {
      setToast('Name and valid calories required');
      return;
    }
    if (fibreParsed != null && !Number.isFinite(fibreParsed)) {
      setToast('Fibre must be a valid number');
      return;
    }
    const payload = {
      name: form.name.trim(),
      defaultPortion: form.defaultPortion || undefined,
      calories,
      proteinG,
      carbsG,
      fatG,
      fibreG: fibreParsed,
      confidence: form.confidence,
      category: form.category,
    };
    try {
      if (editingId) {
        await repo.updateFoodLibraryItem(editingId, payload);
        setToast('Library meal updated');
      } else {
        await repo.saveFoodToLibrary(payload);
        setToast('Library meal added');
      }
      setForm(emptyForm());
      setEditingId(null);
      await reload();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const filtered = library.filter((i) =>
    i.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  return (
    <section className="panel stack">
      <div className="section-head">
        <div>
          <h2 style={{ fontSize: '1.05rem' }}>Food library</h2>
          <p className="muted" style={{ margin: 0 }}>
            Create, edit, duplicate. Logging a meal never changes the template.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <label>
          <span className="label">Name</span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Chicken tikka (estimated)"
          />
        </label>
        <label>
          <span className="label">Category</span>
          <select
            className="select"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as MealCategory })}
          >
            {MEALS.map((m) => (
              <option key={m} value={m}>
                {m.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Portion</span>
          <input
            className="input"
            value={form.defaultPortion}
            onChange={(e) => setForm({ ...form, defaultPortion: e.target.value })}
          />
        </label>
        <label>
          <span className="label">Confidence</span>
          <select
            className="select"
            value={form.confidence}
            onChange={(e) =>
              setForm({ ...form, confidence: e.target.value as NutritionConfidence })
            }
          >
            <option value="estimated">Estimated</option>
            <option value="verified">Verified / package</option>
            <option value="range">Range / restaurant</option>
          </select>
        </label>
        <label>
          <span className="label">Calories</span>
          <input
            className="input"
            inputMode="decimal"
            value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value })}
          />
        </label>
        <label>
          <span className="label">Protein (g)</span>
          <input
            className="input"
            inputMode="decimal"
            value={form.proteinG}
            onChange={(e) => setForm({ ...form, proteinG: e.target.value })}
          />
        </label>
        <label>
          <span className="label">Carbs (g)</span>
          <input
            className="input"
            inputMode="decimal"
            value={form.carbsG}
            onChange={(e) => setForm({ ...form, carbsG: e.target.value })}
          />
        </label>
        <label>
          <span className="label">Fat (g)</span>
          <input
            className="input"
            inputMode="decimal"
            value={form.fatG}
            onChange={(e) => setForm({ ...form, fatG: e.target.value })}
          />
        </label>
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={() => void save()}>
          {editingId ? 'Update meal' : 'Add to library'}
        </button>
        {editingId && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm());
            }}
          >
            Cancel edit
          </button>
        )}
      </div>
      <p className="dim" style={{ fontSize: '0.8rem', margin: 0 }}>
        Restaurant macros stay estimated — never invent exact values.
      </p>

      <label>
        <span className="label">Filter library</span>
        <input
          className="input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search…"
        />
      </label>

      <div className="stack" style={{ gap: 8, maxHeight: 360, overflow: 'auto' }}>
        {filtered.map((item) => (
          <div
            key={item.id}
            className="metric"
            style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ wordBreak: 'break-word' }}>{item.name}</strong>
              <div className="dim" style={{ fontSize: '0.8rem' }}>
                {item.defaultPortion ?? '—'} · {item.calories} kcal · P{item.proteinG} ·{' '}
                <span className="badge badge-info">{item.confidence}</span>
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setEditingId(item.id);
                  setForm({
                    name: item.name,
                    defaultPortion: item.defaultPortion ?? '',
                    calories: String(item.calories),
                    proteinG: String(item.proteinG),
                    carbsG: String(item.carbsG),
                    fatG: String(item.fatG),
                    fibreG: item.fibreG != null ? String(item.fibreG) : '',
                    confidence: item.confidence,
                    category: item.category,
                  });
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  await repo.duplicateFoodLibraryItem(item.id);
                  setToast('Duplicated');
                  await reload();
                }}
              >
                Dup
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  if (!confirm(`Delete “${item.name}” from the library?`)) return;
                  await repo.deleteFoodLibraryItem(item.id);
                  setToast('Removed from library');
                  await reload();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
