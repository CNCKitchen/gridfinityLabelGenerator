import { useMemo, useState } from "react";
import type { LabelCategory, PredefinedLabel } from "../types/label";

const CATEGORY_LABELS: Record<LabelCategory, string> = {
  fasteners: "Fasteners",
  inserts: "Inserts",
};

type CheckState = "all" | "none" | "some";

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      ref={(el) => { if (el) el.indeterminate = indeterminate; }}
      checked={checked}
      onChange={onChange}
    />
  );
}

interface PredefinedSelectorProps {
  labels: PredefinedLabel[];
  onGenerate: (selected: PredefinedLabel[]) => Promise<void>;
}

export function PredefinedSelector({ labels, onGenerate }: PredefinedSelectorProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [useWrenchSize, setUseWrenchSize] = useState(false);
  const [useImageLine2, setUseImageLine2] = useState(false);

  const anyHasWrenchSize = useMemo(() => labels.some((l) => l.wrenchSize), [labels]);
  const anyHasLine2Svg = useMemo(() => labels.some((l) => l.line2Svg), [labels]);

  // Build 2-level grouping: category → size → items
  const grouped = useMemo(() => {
    const map = new Map<LabelCategory, Map<string, PredefinedLabel[]>>();
    for (const label of labels) {
      if (!map.has(label.category)) map.set(label.category, new Map());
      const sizeMap = map.get(label.category)!;
      if (!sizeMap.has(label.size)) sizeMap.set(label.size, []);
      sizeMap.get(label.size)!.push(label);
    }
    return map;
  }, [labels]);

  const selectedItems = useMemo(
    () => labels.filter((item) => selected[item.id ?? ""]),
    [labels, selected]
  );

  function getCheckState(ids: string[]): CheckState {
    const count = ids.filter((id) => selected[id]).length;
    if (count === ids.length) return "all";
    if (count === 0) return "none";
    return "some";
  }

  function idsForCategory(category: LabelCategory): string[] {
    const sizeMap = grouped.get(category);
    if (!sizeMap) return [];
    return Array.from(sizeMap.values()).flat().map((i) => i.id ?? "");
  }

  function idsForSize(category: LabelCategory, size: string): string[] {
    return (grouped.get(category)?.get(size) ?? []).map((i) => i.id ?? "");
  }

  function setIds(ids: string[], value: boolean) {
    setSelected((cur) => {
      const next = { ...cur };
      for (const id of ids) next[id] = value;
      return next;
    });
  }

  function toggleCategory(category: LabelCategory) {
    const ids = idsForCategory(category);
    setIds(ids, getCheckState(ids) !== "all");
  }

  function toggleSize(category: LabelCategory, size: string) {
    const ids = idsForSize(category, size);
    setIds(ids, getCheckState(ids) !== "all");
  }

  function toggleItem(id: string) {
    setSelected((cur) => ({ ...cur, [id]: !cur[id] }));
  }

  function toggleExpanded(key: string) {
    setExpanded((cur) => ({ ...cur, [key]: !cur[key] }));
  }

  const runGenerate = async () => {
    if (selectedItems.length === 0) return;
    setLoading(true);
    try {
      const labelsToGenerate = selectedItems.map((item) => {
        let label: PredefinedLabel = item;
        if (useWrenchSize && item.wrenchSize) {
          label = { ...label, iconText: item.wrenchSize, iconSvg: "" };
        }
        if (!useImageLine2) {
          label = { ...label, line2Svg: undefined };
        }
        return label;
      });
      await onGenerate(labelsToGenerate);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h2>Predefined labels</h2>
      <div className="tree">
        {Array.from(grouped.entries()).map(([category, sizeMap]) => {
          const catIds = idsForCategory(category);
          const catState = getCheckState(catIds);
          const catExpanded = expanded[category] ?? false;

          return (
            <div key={category} className="tree-group">
              {/* Category row */}
              <div className="tree-node tree-level-0">
                <button
                  className={`tree-toggle${catExpanded ? " expanded" : ""}`}
                  onClick={() => toggleExpanded(category)}
                  aria-label={catExpanded ? "Collapse" : "Expand"}
                >▶</button>
                <IndeterminateCheckbox
                  checked={catState === "all"}
                  indeterminate={catState === "some"}
                  onChange={() => toggleCategory(category)}
                />
                <span className="tree-label">{CATEGORY_LABELS[category]}</span>
                <span className="tree-count">{catIds.length}</span>
              </div>

              {catExpanded && (
                <div className="tree-children">
                  {Array.from(sizeMap.entries()).map(([size, items]) => {
                    const sizeKey = `${category}::${size}`;
                    const sizeIds = items.map((i) => i.id ?? "");
                    const sizeState = getCheckState(sizeIds);
                    const sizeExpanded = expanded[sizeKey] ?? false;

                    return (
                      <div key={sizeKey}>
                        {/* Size row */}
                        <div className="tree-node tree-level-1">
                          <button
                            className={`tree-toggle${sizeExpanded ? " expanded" : ""}`}
                            onClick={() => toggleExpanded(sizeKey)}
                            aria-label={sizeExpanded ? "Collapse" : "Expand"}
                          >▶</button>
                          <IndeterminateCheckbox
                            checked={sizeState === "all"}
                            indeterminate={sizeState === "some"}
                            onChange={() => toggleSize(category, size)}
                          />
                          <span className="tree-label">{size}</span>
                          <span className="tree-count">{items.length}</span>
                        </div>

                        {sizeExpanded && (
                          <div className="tree-children">
                            {items.map((label) => (
                              <div key={label.id} className="tree-node tree-level-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selected[label.id ?? ""])}
                                  onChange={() => toggleItem(label.id ?? "")}
                                />
                                <span className="tree-label">{label.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {anyHasWrenchSize && (
        <label className="list-item">
          <input
            type="checkbox"
            checked={useWrenchSize}
            onChange={() => setUseWrenchSize((v) => !v)}
          />
          <span>Use wrench size as icon</span>
        </label>
      )}
      {anyHasLine2Svg && (
        <label className="list-item">
          <input
            type="checkbox"
            checked={useImageLine2}
            onChange={() => setUseImageLine2((v) => !v)}
          />
          <span>Use image for line 2</span>
        </label>
      )}
      <button disabled={loading || selectedItems.length === 0} onClick={runGenerate}>
        {loading
          ? "Generating..."
          : selectedItems.length === 0
            ? "Download STL"
            : selectedItems.length === 1
              ? "Download STL"
              : `Download ZIP (${selectedItems.length})`}
      </button>
    </section>
  );
}
