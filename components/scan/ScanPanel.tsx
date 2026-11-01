"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, ChevronRight, ImagePlus, Radio, RefreshCw, Sparkles } from "lucide-react";
import { samples, getSampleAnalysis, type SampleId } from "@/lib/samples";
import { defectAnalysisSchema, type DefectAnalysis } from "@/lib/ai/schema";
import { prepareImage } from "@/lib/image";

export type ScanResult = { analysis: DefectAnalysis; source: "live" | "example"; isDemo: boolean; imageHash: string; preview: string };

export default function ScanPanel({ onResult, initialSample }: { onResult: (result: ScanResult) => void; initialSample?: SampleId }) {
  const [live, setLive] = useState(false);
  const [mode, setMode] = useState<"live" | "example">("example");
  const [busy, setBusy] = useState(false);
  const [activeMode, setActiveMode] = useState<"live" | "example">("example");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<SampleId>(initialSample ?? "pothole");
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const objectUrl = useRef("");
  useEffect(() => {
    let active = true;
    fetch("/api/config").then(response => response.json()).then(data => {
      if (active && data.liveAvailable) { setLive(true); setMode("live"); }
    }).catch(() => {});
    return () => { active = false; controller.current?.abort(); };
  }, []);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  async function scan(file?: File, sampleId?: SampleId) {
    if (busy) return;
    setBusy(true); setError("");
    const runMode = file ? "live" : mode;
    setActiveMode(runMode);
    const abort = new AbortController(); controller.current = abort;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      let source = file;
      if (sampleId) {
        const sample = samples.find(item => item.id === sampleId)!;
        const response = await fetch(sample.src, { signal: abort.signal });
        if (!response.ok) throw new Error("The sample photo could not load. Try again or choose a photo.");
        source = new File([await response.blob()], `${sample.id}.jpg`, { type: "image/jpeg" });
      }
      if (!source) throw new Error("Choose a photograph to scan.");
      const image = await prepareImage(source);
      if (abort.signal.aborted) { URL.revokeObjectURL(image.preview); return; }
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = image.preview; setPreview(image.preview);
      let analysis: DefectAnalysis;
      let resultSource: "live" | "example";
      if (runMode === "example" && sampleId) {
        await new Promise(resolve => setTimeout(resolve, 1250));
        analysis = getSampleAnalysis(sampleId); resultSource = "example";
      } else {
        if (!live) throw new Error("Live AI is not configured yet. Try one of the labelled example scans below.");
        const body = new FormData(); body.append("image", image.file);
        timeout = setTimeout(() => abort.abort(), 45_000);
        const response = await fetch("/api/analyse", { method: "POST", body, signal: abort.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "The scanner is taking a breather. Please retry.");
        analysis = defectAnalysisSchema.parse(data.analysis); resultSource = "live";
      }
      if (!abort.signal.aborted) {
        objectUrl.current = "";
        onResult({ analysis, source: resultSource, isDemo: !!sampleId, imageHash: image.hash, preview: image.preview });
      }
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "Scan timed out. Please retry or use a labelled example scan.");
    } finally { if (timeout) clearTimeout(timeout); setBusy(false); }
  }

  return <section className="scan-panel">
    <p className="eyebrow mint-text"><Radio size={15} /> FIELD SCANNER</p>
    <h2>Found a road<br /><span className="yellow-text">rascal?</span></h2>
    <p className="muted">One photo. One peculiar creature. One useful report.</p>
    {busy ? <div className="scan-stage" role="status" aria-live="polite">
      {preview && <Image src={preview} alt="Your photograph being scanned" width={1200} height={900} unoptimized />}
      <div className="scan-beam" /><div className="radar-ring" /><Camera size={44} />
      <strong>SCANNING ROAD ANOMALY…</strong><span>{activeMode === "live" ? "OpenAI is examining the photograph" : "Playing a predefined example assessment"}</span>
    </div> : <>
      <button className="upload-zone" onClick={() => input.current?.click()}>
        <span className="upload-icon"><ImagePlus size={30} /></span>
        <strong>Take or upload a photo</strong><span>Live OpenAI vision · JPEG, PNG or WEBP · up to 6 MB</span>
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="visually-hidden"
        aria-label="Choose road photograph" onChange={event => { const file = event.target.files?.[0]; if (file) void scan(file); event.target.value = ""; }} />
      <div className="sample-heading"><span>OR TRY A SAMPLE</span><span>Fictional locations</span></div>
      <div className="sample-options">{samples.map(sample => <button key={sample.id} className={`sample-option ${selected === sample.id ? "selected" : ""}`} aria-pressed={selected === sample.id} onClick={() => setSelected(sample.id)}>
        <Image src={sample.src} alt={sample.alt} width={400} height={300} unoptimized /><span>{sample.label}</span>
      </button>)}</div>
      <div className="scan-mode"><label><input type="checkbox" checked={mode === "example"} onChange={event => setMode(event.target.checked || !live ? "example" : "live")} disabled={!live} /> Use predefined output for bundled samples only</label>
        <span>{live ? "Untick to analyse samples with live OpenAI vision." : "Live AI unavailable. Bundled samples use labelled example outputs."}</span></div>
      <button className="button button-yellow full-width" onClick={() => void scan(undefined, selected)}><Sparkles size={19} /> Scan sample <ChevronRight size={21} /></button>
    </>}
    {error && <div className="error-message" role="alert"><strong>Scanner needs a moment.</strong><p>{error}</p><button className="text-button" onClick={() => { setError(""); setMode("example"); }}><RefreshCw size={15} /> Use a sample instead</button></div>}
    <p className="privacy-note">Your own uploads always use live OpenAI vision. Photos are never saved in your PotholeDex.</p>
  </section>;
}
