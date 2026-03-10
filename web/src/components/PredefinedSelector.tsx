import { useEffect, useMemo, useRef, useState } from "react";
import type { LabelCategory, PredefinedLabel } from "../types/label";
import txSvg from "../assets/torx.svg?raw";
import trpLowHeadSvg from "../assets/TRP_lowHeadScrew.svg?raw";

// Fixed M3x10 Screw used as the live preview fixture for the predefined panel
const M3_PREVIEW_BASE: PredefinedLabel = {
  id: "preview-m3x10",
  title: "M3x10 Screw",
  line1: "M3x10",
  line2: "Screw",
  iconSvg: txSvg,
  iconViewBox: "541 127 112 112",
  line2Svg: trpLowHeadSvg,
  line2ViewBox: "28 1042 93 32",
  category: "fasteners",
  size: "M3",
  icon: "tx",
  wrenchSize: "TX10",
};

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
  onPreviewChange?: (label: PredefinedLabel) => void;
  isActive?: boolean;
  onActivate?: () => void;
}

export function PredefinedSelector({ labels, onGenerate, onPreviewChange, isActive, onActivate }: PredefinedSelectorProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [useWrenchSize, setUseWrenchSize] = useState(false);
  const [useImageLine2, setUseImageLine2] = useState(false);

  // Fire preview with M3 fixture only when the user actually changes a checkbox option
  // (skip the initial mount so the custom-form preview wins on page load)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!onPreviewChange) return;
    let preview: PredefinedLabel = { ...M3_PREVIEW_BASE };
    if (useWrenchSize && preview.wrenchSize) {
      preview = { ...preview, iconText: preview.wrenchSize, iconSvg: "" };
    }
    if (!useImageLine2) {
      preview = { ...preview, line2Svg: undefined };
    }
    onPreviewChange(preview);
  }, [useWrenchSize, useImageLine2, onPreviewChange]);

  const anyHasWrenchSize = useMemo(() => labels.some((l) => l.wrenchSize), [labels]);
  const anyHasLine2Svg = useMemo(() => labels.some((l) => l.line2Svg), [labels]);

  // Build 2-level grouping: category → size/group → items
  // For inserts, collapse M2/M3/etc. into "Metric Inserts" / "Imperial Inserts"
  function getSizeKey(label: PredefinedLabel): string {
    if (label.category === "inserts") {
      return label.size.startsWith("M") ? "Metric Inserts" : "Imperial Inserts";
    }
    return label.size;
  }

  const grouped = useMemo(() => {
    const map = new Map<LabelCategory, Map<string, PredefinedLabel[]>>();
    for (const label of labels) {
      if (!map.has(label.category)) map.set(label.category, new Map());
      const sizeMap = map.get(label.category)!;
      const key = getSizeKey(label);
      if (!sizeMap.has(key)) sizeMap.set(key, []);
      sizeMap.get(key)!.push(label);
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

  const handleFocusEnter = (e: React.FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (!onPreviewChange) return;
      let preview: PredefinedLabel = { ...M3_PREVIEW_BASE };
      if (useWrenchSize && preview.wrenchSize) {
        preview = { ...preview, iconText: preview.wrenchSize, iconSvg: "" };
      }
      if (!useImageLine2) {
        preview = { ...preview, line2Svg: undefined };
      }
      onPreviewChange(preview);
    }
  };

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
    <section className={`panel${isActive ? " panel-active" : ""}`} onFocus={handleFocusEnter} onPointerDown={() => onActivate?.()}>
      <h2><a href="https://geni.us/CNCStoreLabelGen" target="_blank" rel="noopener noreferrer" className="store-link">CNCKitchen.STORE Labels</a></h2>
      <p className="panel-subtitle">Pre-defined labels for CNC Kitchen Fasteners &amp; Inserts</p>
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
      <span className="options-heading">Export Settings</span>
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
