"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Camera, ChevronRight, CircleHelp, Cone, Footprints, MapPin, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import Atlas from "@/components/map/Atlas";
import Dialog from "@/components/ui/Dialog";
import ScanPanel, { type ScanResult } from "@/components/scan/ScanPanel";
import Encounter from "@/components/scan/Encounter";
import ReportPanel from "@/components/report/ReportPanel";
import Reward from "@/components/report/Reward";
import PotholeDex from "./PotholeDex";
import FieldGuide from "./FieldGuide";
import Creature from "./Creature";
import useProgress from "@/lib/client/useProgress";
import { playerProgress } from "@/lib/game/progression";
import { defaultMonsterProfile, monsterPower, type MonsterProfile } from "@/lib/game/power";
import { demoMonsters, demoMonsterProfile } from "@/lib/game/demo-monsters";
import { isCapturable } from "@/lib/ai/schema";
import type { ReportRecord, ReportStatus } from "@/lib/reporting/report";
import type { SampleId } from "@/lib/samples";
import useCollector from "@/lib/client/useCollector";
import ProfilePanel from "@/components/profile/ProfilePanel";
import LeaderboardPanel from "@/components/profile/LeaderboardPanel";
import useDemoWorld from "@/lib/client/useDemoWorld";
import useRoadIssues from "@/lib/client/useRoadIssues";
import { RoadIssuePanel, DemoLeaderboardPanel, ChooseRoadPointPanel } from "@/components/roads";
import type { RoadIssue } from "@/lib/roads/schema";
import type { LocationCandidate } from "@/lib/location/schema";
import type { ReportLocation } from "@/lib/reporting/report";

type Screen = "pin" | "scan" | "encounter" | "report" | "reward" | "dex" | "help" | "profile" | "leaderboard" | "road" | null;

export default function Game() {
  const progress = useProgress();
  const collector = useCollector();
  const demoWorld = useDemoWorld();
  const [mapScope, setMapScope] = useState<"demo" | "community">("demo");
  const [leagueScope, setLeagueScope] = useState<"demo" | "community">("demo");
  const roads = useRoadIssues(mapScope === "community");
  const player = playerProgress(progress.state);
  const [screen, setScreen] = useState<Screen>(null);
  const [sample, setSample] = useState<SampleId>();
  const [result, setResult] = useState<ScanResult>();
  const [monsterProfile, setMonsterProfile] = useState<MonsterProfile>(defaultMonsterProfile);
  const [recordId, setRecordId] = useState("");
  const [award, setAward] = useState(0);
  const [saveError, setSaveError] = useState<string>();
  const [selectedRoadId, setSelectedRoadId] = useState("");
  const [reportTarget, setReportTarget] = useState<RoadIssue>();
  const [draftPlace, setDraftPlace] = useState<LocationCandidate>();
  const [sharedPins, setSharedPins] = useState<Record<string, boolean>>({});
  const [reportBonuses, setReportBonuses] = useState<Record<string, { xp: number; ordinal: number }>>({});
  const record = progress.state.captures.find(item => item.id === recordId);
  const selectedRoad = mapScope === "demo" ? demoWorld.issues.find(issue => issue.id === selectedRoadId) : roads.issues.find(issue => issue.id === selectedRoadId);
  const mapIssues = mapScope === "demo" ? demoWorld.issues.map(issue => ({ ...issue, isDemo: true })) : roads.issues.map(issue => ({ ...issue, isDemo: false }));
  const openCount = mapIssues.filter(issue => issue.status === "open").length;
  const remote = collector.auth.signedIn && collector.auth.snapshotLoaded ? collector.snapshot?.profile : null;
  const hud = remote ? { xp: remote.xp, level: remote.level, rank: remote.rank, nextLevelXp: remote.level === 5 ? null : remote.level * 120, progress: remote.level === 5 ? 100 : remote.xp % 120 / 120 * 100 } : player;
  useEffect(() => () => { if (result?.preview) URL.revokeObjectURL(result.preview); }, [result]);
  function hunt(id?: SampleId, profile?: MonsterProfile, target?: RoadIssue, place?: LocationCandidate) {
    setSample(id); setReportTarget(target); setDraftPlace(place); setMonsterProfile(profile ?? defaultMonsterProfile()); setResult(undefined); setScreen(id ? "scan" : "pin");
  }
  function startAtPin(location: ReportLocation) {
    hunt(undefined, undefined, undefined, { id: `pin-${location.lat}-${location.lng}`, label: "Selected road point", location, postcode: null, country: null, accuracy: "pin", council: null, warnings: [] });
  }
  async function shareCapture(value: ReportRecord) {
    const claimed = await collector.claimReport(value);
    if (claimed && value.publishToMap && !value.isDemo) {
      try {
        const published = await roads.publish(value, value.communityIssueId);
        setSharedPins(previous => ({ ...previous, [value.id]: true }));
        setReportBonuses(previous => ({ ...previous, [value.id]: { xp: published.reportBonusXp, ordinal: published.reporterOrdinal } }));
        await collector.refresh();
      }
      catch { /* The saved report exposes the road-service error and a retry action. */ }
    }
    return claimed;
  }
  function openRoad(id: string) { setSelectedRoadId(id); setScreen("road"); }
  function reportRoad() {
    if (!selectedRoad) return;
    if (mapScope === "demo") hunt(selectedRoad.type === "cracking" ? "crack" : "pothole", selectedRoad.monsterProfile);
    else hunt(undefined, selectedRoad.monsterProfile, roads.issues.find(issue => issue.id === selectedRoad.id));
  }
  function analysed(value: ScanResult) {
    setResult(value);
    const example = value.isDemo && demoMonsters.find(marker => marker.sample === value.sampleId);
    const profile = value.isDemo && value.sampleId === sample && monsterProfile.firstObservedOn ? monsterProfile
      : example ? demoMonsterProfile(example) : reportTarget ? { ...reportTarget.monsterProfile, firstObservedOn: reportTarget.monsterProfile.firstObservedOn ?? reportTarget.createdAtISO.slice(0, 10) } : defaultMonsterProfile();
    setMonsterProfile(value.analysis.defectType === "surface_crack" ? { ...profile, extent: "unknown" } : profile);
    const existing = progress.state.captures.find(item => item.imageHash === value.imageHash);
    if (existing && isCapturable(value.analysis)) {
      if (value.receiptId && !existing.isDemo) {
        const attached = progress.attachReceipt(existing.id, value.receiptId);
        setSaveError(attached.saveError);
        void shareCapture(attached.report);
      }
      openReport(existing); return;
    }
    if (!isCapturable(value.analysis)) setSaveError(progress.reject());
    setScreen("encounter");
  }
  function capture(value: ReportRecord) {
    const captured = progress.capture(value);
    void shareCapture(value);
    setSaveError(captured.saveError); setRecordId(value.id); setAward(captured.awardedXp); setScreen("reward");
  }
  function openReport(value: ReportRecord) { setRecordId(value.id); setAward(0); setScreen("reward"); }
  function status(value: ReportStatus) { setSaveError(progress.setStatus(recordId, value)); }
  function close() { setScreen(null); setResult(undefined); }
  return <div className="game-shell">
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="PotholeKiller home"><span className="brand-cone"><Cone size={27} strokeWidth={2.5} /></span><span>POTHOLE<span className="yellow-text">KILLER</span><small>THE STREETS HAVE MET THEIR MATCH.</small></span></Link>
      <nav className="header-nav" aria-label="Game navigation"><button className="nav-active" onClick={close}><MapPin size={17} /> The hunt</button><button onClick={() => setScreen("dex")}><BookOpen size={17} /> PotholeDex <span className="nav-count">{player.collected}</span></button><button onClick={() => setScreen("leaderboard")}><Trophy size={17} /> Leaderboard</button></nav>
      <button type="button" className="player-hud collector-hud" onClick={() => setScreen("profile")} aria-label="Open collector profile"><span className="player-level">{hud.level}</span><span className="collector-hud-info"><strong>{remote?.displayName ?? collector.localProfile.displayName}</strong><span>{hud.xp} XP <span className="hud-divider">/</span> {hud.nextLevelXp ?? "MAX LEVEL"}</span><span className="xp-track" role="progressbar" aria-label="Progress to next level" aria-valuenow={hud.progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${hud.progress}%` }} /></span></span></button>
      <button className="help-button icon-button" aria-label="How to play" onClick={() => setScreen("help")}><CircleHelp size={22} /></button>
    </header>
    <main id="main-content">
      <div className="intro-row"><div><p className="eyebrow"><span className="status-dot" /> UK ROAD HUNT <span className="intro-separator">/</span> HACKNEY DEMO MAP</p><h1>Small holes.<br className="mobile-break" /> <span>Big personalities.</span></h1></div><p>Hunt potholes. Earn XP.<br /><strong>Save your streets.</strong> <ArrowDown size={20} /></p></div>
      <div className="world-switch"><div role="group" aria-label="Map reports"><button type="button" aria-pressed={mapScope === "demo"} onClick={() => setMapScope("demo")}>Demo neighbourhood <span>{demoWorld.counters.potholeCount}</span></button><button type="button" aria-pressed={mapScope === "community"} onClick={() => setMapScope("community")}>Community map</button></div><p>{mapScope === "demo" ? `${demoWorld.counters.reportCount} fictional reports · ${demoWorld.counters.userCount} mock collectors · ${demoWorld.counters.clearedCount} cleared` : "Road pins shared by collectors"}</p></div>
      <section className="hunt-workspace" aria-label="Hunt map and scanner">
        <div className="map-frame"><div className="map-top-label"><MapPin size={16} /><strong>{openCount} {mapScope === "demo" ? "MOCK" : "OPEN"} POTHOLES</strong><span>Older sightings. Stronger monsters.</span></div><Atlas key={mapScope} realWorld={mapScope === "community"} issues={mapIssues} onOpenIssue={openRoad} onNewIssue={startAtPin} onHunt={(id, profile) => hunt(id, profile)} /><div className="map-caption"><span className="status-dot" /> {mapScope === "demo" ? "FICTIONAL REPORTS · ILLUSTRATIVE PHOTOS" : "COMMUNITY ROAD REPORTS"} <span>Tap a monster, or a road in Streets view</span></div></div>
        <aside className="hunt-poster"><div className="poster-top"><span className="eyebrow">A PUBLIC SERVICE.<br />WITH TEETH.</span><span className="poster-number">001</span></div>
          <div className="poster-art"><div className="poster-orbit" /><Creature family="beast" /><span className="poster-spark spark-a">✦</span><span className="poster-spark spark-b">+</span><div className="monster-sticker">WANTED<br /><strong>FOR CRIMES<br />AGAINST TYRES</strong></div></div>
          <div className="poster-copy"><p>YOUR NEXT ENCOUNTER</p><h2>Meet your local<br /><span>road rascal.</span></h2><p>Pin the damage. Add your photo.<br />Meet the monster. Make your report.</p></div>
          <button className="button button-yellow hunt-button" onClick={() => hunt()}><Camera size={23} /> HUNT A POTHOLE <ArrowRight size={22} /></button>
          <button className="demo-button" onClick={() => hunt("pothole")}><Sparkles size={15} /> Try the 60-second demo <ChevronRight size={16} /></button>
        </aside>
      </section>
      {mapScope === "demo" ? <p className="world-disclosure">Demo neighbourhood: real roads and illustrative licensed photos, with invented reports, collectors and repair histories. No reports are sent to a council.</p> : roads.error ? <p className="error-message" role="alert">{roads.error}</p> : roads.loading ? <p className="world-disclosure" role="status">Loading community road reports…</p> : openCount === 0 ? <p className="world-disclosure">No open community pins yet. Sign in, scan your own photo and choose to share the road pin.</p> : null}
      <section className="collection-strip" aria-label="Collection preview"><div className="collection-intro"><BookOpen size={25} /><div><span className="eyebrow">YOUR POTHOLEDEX</span><strong>{player.collected ? `${player.collected} local legend${player.collected === 1 ? "" : "s"} collected.` : "Gotta report ’em all."}</strong></div></div>
        <div className="collection-previews">{progress.state.captures.slice(-3).map(item => <button key={item.id} className="mini-card" onClick={() => openReport(item)}><Creature family={item.creature.family} power={monsterPower(item.monsterProfile, item.preparedAt).score} /><span>{item.creature.name}</span></button>)}
          {!player.collected && ["gremlin", "crackling", "puddle"].map((family, index) => <div className="locked-creature" key={family}><span>?</span><small>UNDISCOVERED {String(index + 1).padStart(2, "0")}</small></div>)}
        </div><button className="collection-open" onClick={() => setScreen("dex")}>Open collection <ArrowUpRight size={19} /></button>
      </section>
      <div className="how-it-works"><span><MapPin size={15} /> PIN IT</span><i /><span><Camera size={15} /> SNAP IT</span><i /><span><ShieldCheck size={15} /> REPORT IT</span><i /><span><Trophy size={15} /> COLLECT IT</span></div>
      <div className="collector-quick-links"><button type="button" onClick={() => setScreen("profile")}>My collector profile <ChevronRight size={14} /></button><button type="button" onClick={() => setScreen("leaderboard")}><Trophy size={14} /> Collector leaderboard</button></div>
    </main>
    <footer className="site-footer"><p><Footprints size={16} /> Stay safe. Never enter the road or stop somewhere dangerous to photograph a pothole.</p><span>MADE FOR BETTER STREETS. AND SLIGHTLY WORSE PUNS.</span></footer>
    {screen && <Dialog title={{ pin: "Choose the road point", scan: "Scan a photograph", encounter: "Creature encounter", report: "Review your report", reward: "Capture and report", dex: "Your PotholeDex", help: "How to play", profile: "Your collector profile", leaderboard: "Collector leaderboard", road: "Pothole report" }[screen]} wide={["pin", "report", "reward", "dex", "profile", "leaderboard", "road"].includes(screen)} onClose={close}>
      {screen === "pin" && <ChooseRoadPointPanel initialPlace={draftPlace} initialIssue={reportTarget} onContinue={place => { setDraftPlace(place); setScreen("scan"); }} onCancel={close} />}
      {screen === "scan" && <ScanPanel initialSample={sample} onResult={analysed} />}
      {screen === "encounter" && result && <Encounter result={result} monsterProfile={monsterProfile} onContinue={() => setScreen("report")} onRetry={() => hunt()} />}
      {screen === "report" && result && <ReportPanel result={result} initialProfile={monsterProfile} initialPlace={draftPlace} initialIssue={reportTarget} initialReporterName={remote?.displayName ?? collector.localProfile.displayName} collectorSignedIn={collector.auth.signedIn} onPrepared={capture} onBack={() => setScreen("encounter")} />}
      {screen === "reward" && record && <><Reward key={record.id} report={record} awardedXp={award} onHunt={close} onStatus={status} saveError={saveError}
        communityNotice={record.isDemo ? undefined : !record.scanReceiptId ? "Saved on this device. Sign in and scan this photo again to obtain a community scoring receipt." : collector.pendingClaims > 0 ? "Your local capture is saved. Open your profile to retry the community score update." : undefined}
        onShare={() => shareCapture(record)} shared={sharedPins[record.id]} reportBonus={reportBonuses[record.id]} shareError={roads.error} />
        {!record.isDemo && <button type="button" className="text-button collector-board-link" onClick={() => setScreen("profile")}><Trophy size={17} /> Open my collector profile <ArrowRight size={17} /></button>}</>}
      {screen === "dex" && <PotholeDex state={progress.state} onOpen={openReport} onHunt={() => hunt()} />}
      {screen === "profile" && <><ProfilePanel collector={collector} player={player} reports={progress.state.captures} /><button type="button" className="text-button collector-board-link" onClick={() => setScreen("leaderboard")}><Trophy size={17} /> View collector leaderboard <ArrowRight size={17} /></button></>}
      {screen === "leaderboard" && <><div className="league-switch" role="group" aria-label="Leaderboard data"><button type="button" aria-pressed={leagueScope === "demo"} onClick={() => setLeagueScope("demo")}>Mock collectors · 20</button><button type="button" aria-pressed={leagueScope === "community"} onClick={() => setLeagueScope("community")}>Community collectors</button></div>{leagueScope === "demo" ? <DemoLeaderboardPanel world={demoWorld} onOpenIssue={id => { setMapScope("demo"); openRoad(id); }} /> : <LeaderboardPanel collector={collector} onOpenProfile={() => setScreen("profile")} />}</>}
      {screen === "road" && selectedRoad && <RoadIssuePanel key={selectedRoad.id} issue={selectedRoad} demoWorld={mapScope === "demo" ? demoWorld : undefined} collectorSignedIn={collector.auth.signedIn} onReport={reportRoad}
        onConfirmFixed={mapScope === "community" ? async () => { const response = await roads.confirmFixed(selectedRoad.id); await collector.refresh(); return response; } : undefined} error={mapScope === "community" ? roads.error ?? undefined : undefined} />}
      {screen === "help" && <FieldGuide onHunt={() => hunt()} />}
    </Dialog>}
  </div>;
}
