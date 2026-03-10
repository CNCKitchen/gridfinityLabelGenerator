import { useEffect, useState } from "react";
import { LabelForm } from "./components/LabelForm";
import { LabelPreview } from "./components/LabelPreview";
import { PredefinedSelector } from "./components/PredefinedSelector";
import { downloadBatch, downloadSingle, fetchPredefined } from "./services/api";
import { saveBlob } from "./services/download";
import type { LabelInput, PredefinedLabel } from "./types/label";

function slugifyTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "label";
}

function buildBatchZipFileName(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}_batchExport.zip`;
}

export function App() {
  const [labels, setLabels] = useState<PredefinedLabel[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewLabel, setPreviewLabel] = useState<LabelInput | null>(null);

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

  const handleCustom = async (input: LabelInput) => {
    setError("");
    const blob = await downloadSingle(input);
    saveBlob(blob, `${slugifyTitle(input.title)}.stl`);
  };

  const handleBatch = async (selected: PredefinedLabel[]) => {
    setError("");
    const result = await downloadBatch(selected);
    if (result.isZip) {
      saveBlob(result.blob, buildBatchZipFileName());
      return;
    }

    const single = selected[0];
    saveBlob(result.blob, `${slugifyTitle(single.title)}.stl`);
  };

  return (
    <main className="app">
      <a href="https://geni.us/CNCStoreLabelGen" target="_blank" rel="noopener noreferrer">
        <img src={`${import.meta.env.BASE_URL}header.jpg`} alt="CNC Kitchen" className="header-banner" />
      </a>
      <header>
        <h1>Gridfinity Label Generator</h1>
      </header>

      <div className="info-box">
        <p>
          Labels are designed for{" "}
          <a href="https://www.printables.com/model/592545-gridfinity-bin-with-printable-label-by-pred-parame" target="_blank" rel="noopener noreferrer">
            these Gridfinity bins
          </a>
          . Print at <strong>0.2 mm layer height</strong> with a{" "}
          <strong>color change after layer 2</strong> for best contrast.{" "}
          The <strong>Arachne wall generator</strong> is recommended for sharper detail.
        </p>
        <p>
          Includes pre-defined labels for all <strong>CNC Kitchen fasteners &amp; inserts</strong>.
        </p>
        <p className="info-beta">
          ⚠️ This is a <strong>beta</strong> — found a bug or want a new feature?{" "}
          Open an issue on{" "}
          <a href="https://github.com/CNCKitchen/gridfinityLabelGenerator/issues" target="_blank" rel="noopener noreferrer">GitHub</a>{" "}
          or comment on{" "}
          <a href="https://www.printables.com/@CNCKitchen/models" target="_blank" rel="noopener noreferrer">Printables</a>.
        </p>
      </div>

      {loading ? <p>Loading predefined labels...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="panel preview-panel">
        <LabelPreview label={previewLabel} />
      </section>

      <div className="layout">
        <LabelForm onGenerate={handleCustom} onPreviewChange={setPreviewLabel} />
        <PredefinedSelector labels={labels} onGenerate={handleBatch} onPreviewChange={setPreviewLabel} />
      </div>
    </main>
  );
}
