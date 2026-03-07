import { useMemo, useState } from "react";
import type { LabelCategory, PredefinedLabel } from "../types/label";

const CATEGORY_LABELS: Record<LabelCategory, string> = {
  fasteners: "Fasteners",
  inserts: "Inserts",
};

interface PredefinedSelectorProps {
  labels: PredefinedLabel[];
  onGenerate: (selected: PredefinedLabel[]) => Promise<void>;
}

export function PredefinedSelector({ labels, onGenerate }: PredefinedSelectorProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<LabelCategory, PredefinedLabel[]>();
    for (const label of labels) {
      const group = map.get(label.category) ?? [];
      group.push(label);
      map.set(label.category, group);
    }
    return map;
  }, [labels]);

  const selectedItems = useMemo(
    () => labels.filter((item) => selected[item.id ?? ""]),
    [labels, selected]
  );

  const toggle = (id: string) => {
    setSelected((current) => ({ ...current, [id]: !current[id] }));
  };

  const runGenerate = async () => {
    if (selectedItems.length === 0) return;
    setLoading(true);
    try {
      await onGenerate(selectedItems);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h2>Predefined labels</h2>
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category}>
          <h3>{CATEGORY_LABELS[category]}</h3>
          <div className="list">
            {items.map((label) => (
              <label key={label.id} className="list-item">
                <input type="checkbox" checked={Boolean(selected[label.id ?? ""])} onChange={() => toggle(label.id ?? "")} />
                <span>{label.title}</span>
                <span className="size-badge">{label.size}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button disabled={loading || selectedItems.length === 0} onClick={runGenerate}>
        {loading
          ? "Generating..."
          : selectedItems.length <= 1
            ? "Download STL"
            : "Download ZIP"}
      </button>
    </section>
  );
}
