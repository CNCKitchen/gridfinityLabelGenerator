import { useEffect, useState } from "react";
import { LabelForm } from "./components/LabelForm";
import { PredefinedSelector } from "./components/PredefinedSelector";
import { downloadBatch, downloadSingle, fetchPredefined } from "./services/api";
import { saveBlob } from "./services/download";
import type { LabelInput, PredefinedLabel } from "./types/label";
import { BUILD_ID, BUILD_TIME_ISO } from "./buildInfo";

function slugifyTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "label";
}

export function App() {
  const buildTime = new Date(BUILD_TIME_ISO).toLocaleString();
  const [labels, setLabels] = useState<PredefinedLabel[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLabels(await fetchPredefined());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load predefined labels");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const defaultSvg = labels[0]?.iconSvg ?? "";

  const handleCustom = async (input: LabelInput) => {
    setError("");
    const blob = await downloadSingle(input);
    saveBlob(blob, `${slugifyTitle(input.title)}.stl`);
  };

  const handleBatch = async (selected: PredefinedLabel[]) => {
    setError("");
    const result = await downloadBatch(selected);
    if (result.isZip) {
      saveBlob(result.blob, "labels-batch.zip");
      return;
    }

    const single = selected[0];
    saveBlob(result.blob, `${slugifyTitle(single.title)}.stl`);
  };

  return (
    <main className="app">
      <header>
        <h1>Gridfinity Label Generator</h1>
        <p>Embossed text height: 0.4 mm • Usable area: 34.5 × 10.5 mm</p>
        <p>Build: {BUILD_ID} • {buildTime}</p>
      </header>

      {loading ? <p>Loading predefined labels...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="layout">
        <LabelForm defaultSvg={defaultSvg} onGenerate={handleCustom} />
        <PredefinedSelector labels={labels} onGenerate={handleBatch} />
      </div>
    </main>
  );
}
