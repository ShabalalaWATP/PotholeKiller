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

type Screen = "scan" | "encounter" | "report" | "reward" | "dex" | "help" | "profile" | "leaderboard" | null;

export default function Game() {
  const progress = useProgress();
  const collector = useCollector();
  const player = playerProgress(progress.state);
  const [screen, setScreen] = useState<Screen>(null);
  const [sample, setSample] = useState<SampleId>();
  const [result, setResult] = useState<ScanResult>();
  const [monsterProfile, setMonsterProfile] = useState<MonsterProfile>(defaultMonsterProfile);
  const [recordId, setRecordId] = useState("");
  const [award, setAward] = useState(0);
  const [saveError, setSaveError] = useState<string>();
  const record = progress.state.captures.find(item => item.id === recordId);
  useEffect(() => () => { if (result?.preview) URL.revokeObjectURL(result.preview); }, [result]);
  function hunt(id?: SampleId, profile?: MonsterProfile) { setSample(id); setMonsterProfile(profile ?? defaultMonsterProfile()); setResult(undefined); setScreen("scan"); }
  function analysed(value: ScanResult) {
    setResult(value);
    const example = value.isDemo && demoMonsters.find(marker => marker.sample === value.sampleId);
    const profile = value.isDemo && value.sampleId === sample && monsterProfile.firstObservedOn ? monsterProfile
      : example ? demoMonsterProfile(example) : defaultMonsterProfile();
    setMonsterProfile(value.analysis.defectType === "surface_crack" ? { ...profile, extent: "unknown" } : profile);
    const existing = progress.state.captures.find(item => item.imageHash === value.imageHash);
    if (existing && isCapturable(value.analysis)) {
      if (value.receiptId && !existing.isDemo) {
        const attached = progress.attachReceipt(existing.id, value.receiptId);
        setSaveError(attached.saveError);
        void collector.claimReport(attached.report);
      }
      openReport(existing); return;
    }
    if (!isCapturable(value.analysis)) setSaveError(progress.reject());
    setScreen("encounter");
  }
  function capture(value: ReportRecord) {
    const captured = progress.capture(value);
    void collector.claimReport(value);
    setSaveError(captured.saveError); setRecordId(value.id); setAward(captured.awardedXp); setScreen("reward");
  }
  function openReport(value: ReportRecord) { setRecordId(value.id); setAward(0); setScreen("reward"); }
  function status(value: ReportStatus) { setSaveError(progress.setStatus(recordId, value)); }
  function close() { setScreen(null); setResult(undefined); }
  return <div className="game-shell">
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="PotholeKiller home"><span className="brand-cone"><Cone size={27} strokeWidth={2.5} /></span><span>POTHOLE<span className="yellow-text">KILLER</span><small>THE STREETS HAVE MET THEIR MATCH.</small></span></Link>
      <nav className="header-nav" aria-label="Game navigation"><button className="nav-active" onClick={close}><MapPin size={17} /> The hunt</button><button onClick={() => setScreen("dex")}><BookOpen size={17} /> PotholeDex <span className="nav-count">{player.collected}</span></button><button onClick={() => setScreen("leaderboard")}><Trophy size={17} /> Leaderboard</button></nav>
      <button type="button" className="player-hud collector-hud" onClick={() => setScreen("profile")} aria-label="Open collector profile"><span className="player-level">{player.level}</span><span className="collector-hud-info"><strong>{collector.auth.signedIn && collector.snapshot?.authenticated ? collector.snapshot.profile?.displayName ?? collector.localProfile.displayName : collector.localProfile.displayName}</strong><span>{player.xp} XP <span className="hud-divider">/</span> {player.nextLevelXp ?? "MAX LEVEL"}</span><span className="xp-track" role="progressbar" aria-label="Progress to next level" aria-valuenow={player.progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${player.progress}%` }} /></span></span></button>
      <button className="help-button icon-button" aria-label="How to play" onClick={() => setScreen("help")}><CircleHelp size={22} /></button>
    </header>
    <main id="main-content">
      <div className="intro-row"><div><p className="eyebrow"><span className="status-dot" /> UK ROAD HUNT <span className="intro-separator">/</span> HACKNEY DEMO MAP</p><h1>Small holes.<br className="mobile-break" /> <span>Big personalities.</span></h1></div><p>Hunt potholes. Earn XP.<br /><strong>Save your streets.</strong> <ArrowDown size={20} /></p></div>
      <section className="hunt-workspace" aria-label="Hunt map and scanner">
        <div className="map-frame"><div className="map-top-label"><MapPin size={16} /><strong>YOUR PATCH</strong><span>Older sightings. Stronger monsters.</span></div><Atlas onHunt={(id, profile) => hunt(id, profile)} /><div className="map-caption"><span className="status-dot" /> FICTIONAL DEMO LOCATIONS <span>Drag to explore · tap a monster to try a sample</span></div></div>
        <aside className="hunt-poster"><div className="poster-top"><span className="eyebrow">A PUBLIC SERVICE.<br />WITH TEETH.</span><span className="poster-number">001</span></div>
          <div className="poster-art"><div className="poster-orbit" /><Creature family="beast" /><span className="poster-spark spark-a">✦</span><span className="poster-spark spark-b">+</span><div className="monster-sticker">WANTED<br /><strong>FOR CRIMES<br />AGAINST TYRES</strong></div></div>
          <div className="poster-copy"><p>YOUR NEXT ENCOUNTER</p><h2>Meet your local<br /><span>road rascal.</span></h2><p>Snap the damage. Discover the monster.<br />Make a report that makes a difference.</p></div>
          <button className="button button-yellow hunt-button" onClick={() => hunt()}><Camera size={23} /> HUNT A POTHOLE <ArrowRight size={22} /></button>
          <button className="demo-button" onClick={() => hunt("pothole")}><Sparkles size={15} /> Try the 60-second demo <ChevronRight size={16} /></button>
        </aside>
      </section>
      <section className="collection-strip" aria-label="Collection preview"><div className="collection-intro"><BookOpen size={25} /><div><span className="eyebrow">YOUR POTHOLEDEX</span><strong>{player.collected ? `${player.collected} local legend${player.collected === 1 ? "" : "s"} collected.` : "Gotta report ’em all."}</strong></div></div>
        <div className="collection-previews">{progress.state.captures.slice(-3).map(item => <button key={item.id} className="mini-card" onClick={() => openReport(item)}><Creature family={item.creature.family} power={monsterPower(item.monsterProfile, item.preparedAt).score} /><span>{item.creature.name}</span></button>)}
          {!player.collected && ["gremlin", "crackling", "puddle"].map((family, index) => <div className="locked-creature" key={family}><span>?</span><small>UNDISCOVERED {String(index + 1).padStart(2, "0")}</small></div>)}
        </div><button className="collection-open" onClick={() => setScreen("dex")}>Open collection <ArrowUpRight size={19} /></button>
      </section>
      <div className="how-it-works"><span><Camera size={15} /> SNAP IT</span><i /><span><Sparkles size={15} /> MEET IT</span><i /><span><ShieldCheck size={15} /> REPORT IT</span><i /><span><Trophy size={15} /> COLLECT IT</span></div>
      <div className="collector-quick-links"><button type="button" onClick={() => setScreen("profile")}>My collector profile <ChevronRight size={14} /></button><button type="button" onClick={() => setScreen("leaderboard")}><Trophy size={14} /> Collector leaderboard</button></div>
    </main>
    <footer className="site-footer"><p><Footprints size={16} /> Stay safe. Never enter the road or stop somewhere dangerous to photograph a pothole.</p><span>MADE FOR BETTER STREETS. AND SLIGHTLY WORSE PUNS.</span></footer>
    {screen && <Dialog title={{ scan: "Scan a photograph", encounter: "Creature encounter", report: "Review your report", reward: "Capture and report", dex: "Your PotholeDex", help: "How to play", profile: "Your collector profile", leaderboard: "Collector leaderboard" }[screen]} wide={["report", "reward", "dex", "profile", "leaderboard"].includes(screen)} onClose={close}>
      {screen === "scan" && <ScanPanel initialSample={sample} onResult={analysed} />}
      {screen === "encounter" && result && <Encounter result={result} monsterProfile={monsterProfile} onContinue={() => setScreen("report")} onRetry={() => hunt()} />}
      {screen === "report" && result && <ReportPanel result={result} initialProfile={monsterProfile} onPrepared={capture} onBack={() => setScreen("encounter")} />}
      {screen === "reward" && record && <><Reward key={record.id} report={record} awardedXp={award} onHunt={close} onStatus={status} saveError={saveError}
        communityNotice={record.isDemo ? undefined : !record.scanReceiptId ? "Saved on this device. Sign in and scan this photo again to obtain a community scoring receipt." : collector.pendingClaims > 0 ? "Your local capture is saved. Open your profile to retry the community score update." : undefined} />
        {!record.isDemo && <button type="button" className="text-button collector-board-link" onClick={() => setScreen("profile")}><Trophy size={17} /> Open my collector profile <ArrowRight size={17} /></button>}</>}
      {screen === "dex" && <PotholeDex state={progress.state} onOpen={openReport} onHunt={() => hunt()} />}
      {screen === "profile" && <><ProfilePanel collector={collector} player={player} reports={progress.state.captures} /><button type="button" className="text-button collector-board-link" onClick={() => setScreen("leaderboard")}><Trophy size={17} /> View collector leaderboard <ArrowRight size={17} /></button></>}
      {screen === "leaderboard" && <LeaderboardPanel collector={collector} onOpenProfile={() => setScreen("profile")} />}
      {screen === "help" && <section className="help-panel"><p className="eyebrow mint-text">FIELD GUIDE</p><h2>Good hunting.<br /><span className="yellow-text">Better streets.</span></h2><ol><li><b>Snap it.</b> Upload an existing photo from a safe place, or choose a sample.</li><li><b>Meet it.</b> Live OpenAI vision checks for visible road damage when configured. Example outputs are labelled.</li><li><b>Find it.</b> Search a UK address or postcode to fill the pin and reporting route. Choose Game map, Streets or Night streets.</li><li><b>Report it.</b> Review the auto-written description, choose cracking or pothole size, and confirm the exact road pin. Published email contacts are addressed automatically; other authorities use their official reporting routes.</li><li><b>Power it up.</b> Larger visible patches add up to 20 XP. First-noticed dates add 10 XP after a week, 20 after a month or 30 after 90 days.</li><li><b>Collect it.</b> Earn 60–110 XP once per photo. Existing awards stay fixed. Reopen reports in your PotholeDex.</li></ol><p className="notice">Game power is not a road-safety assessment. Capturing documents a defect. It doesn’t fix a road or send a report. Demo locations and histories are fictional and cannot be emailed to a council.</p><p className="tiny muted">Progress is stored in this browser, without photos. Uploaded photos go to OpenAI for live analysis. Address searches go to location providers. Your location is requested only when you choose it. Street tiles come from OpenStreetMap.</p><button className="button button-yellow full-width" onClick={() => hunt()}>Let’s hunt <ArrowRight size={18} /></button></section>}
    </Dialog>}
  </div>;
}
