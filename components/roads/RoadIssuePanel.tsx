"use client";

import { useId, useState } from "react";
import { ArrowRight, Check, CheckCircle2, MapPin, Plus, ShieldCheck, Users, Wrench } from "lucide-react";
import Creature, { type CreatureFamily } from "@/components/game/Creature";
import MonsterPower from "@/components/game/MonsterPower";
import type { DemoWorldController } from "@/lib/client/useDemoWorld";
import { monsterPower } from "@/lib/game/power";
import type { RoadIssue } from "@/lib/roads/schema";

export type RoadPanelIssue = RoadIssue | DemoWorldController["issues"][number];
export type RoadIssuePanelProps = {
  issue: RoadPanelIssue;
  demoWorld?: DemoWorldController;
  collectorSignedIn: boolean;
  onConfirmFixed?: () => Promise<unknown>;
  onReport?: () => void;
  error?: string;
};
const families: Record<RoadPanelIssue["type"], CreatureFamily> = {
  cracking: "crackling", small: "gremlin", medium: "puddle", large: "beast",
};
const typeLabels = { cracking: "Road surface cracking", small: "Small pothole creature", medium: "Medium pothole creature", large: "Large pothole creature" };

export function RoadIssuePanel({ issue, demoWorld, collectorSignedIn, onConfirmFixed, onReport, error }: RoadIssuePanelProps) {
  const selectorId = useId();
  const [voter, setVoter] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ issueId: string; text: string; failed?: boolean } | null>(null);
  const isDemo = issue.id.startsWith("demo-");
  const fixed = issue.status === "community_fixed";
  const points = issue.confirmationPoints;
  const selectedUser = demoWorld?.users.find(user => user.id === voter) ?? demoWorld?.users[0];
  const asOf = new Date().toISOString();
  const visualProfile = { ...issue.monsterProfile, firstObservedOn: issue.monsterProfile.firstObservedOn ?? issue.createdAtISO.slice(0, 10) };
  const power = monsterPower(visualProfile, asOf);
  const reportedDays = Math.max(0, Math.floor((Date.parse(`${asOf.slice(0, 10)}T00:00:00Z`) - Date.parse(`${issue.createdAtISO.slice(0, 10)}T00:00:00Z`)) / 86_400_000));
  const reportedDate = new Date(issue.createdAtISO).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const photo = "photoUrl" in issue ? issue.photoUrl : undefined;
  const reportCount = "reporterIds" in issue ? issue.reporterIds.length : issue.reportCount;
  const ownFeedback = feedback?.issueId === issue.id ? feedback : null;
  const missing = Math.max(0, 5 - points);

  async function confirm() {
    if (pending || fixed) return;
    setPending(true); setFeedback(null);
    try {
      if (isDemo) {
        if (!demoWorld || !selectedUser) return;
        const result = demoWorld.vote(issue.id, selectedUser.id);
        setFeedback({ issueId: issue.id, text: result.saveError ? `${result.message} ${result.saveError}` : result.message });
      } else if (onConfirmFixed) {
        const result = await onConfirmFixed();
        const data = result && typeof result === "object" ? result as { duplicate?: boolean; issue?: RoadIssue; rewardAwarded?: boolean } : undefined;
        const text = data?.duplicate ? "You have already confirmed this road issue. Each person can confirm once."
          : data?.issue?.status === "community_fixed" ? "The community threshold has been reached. This issue is cleared from the active map."
            : "Your repair confirmation has been recorded.";
        setFeedback({ issueId: issue.id, text: text + (data?.rewardAwarded ? " Original reporters received their once-only repair bonus." : "") });
      }
    } catch (cause) {
      setFeedback({ issueId: issue.id, text: cause instanceof Error ? cause.message : "The confirmation could not be saved. Please retry.", failed: true });
    } finally { setPending(false); }
  }

  function addMockReport() {
    if (pending || fixed || !isDemo || !demoWorld || !selectedUser) return;
    setFeedback(null);
    try {
      const result = demoWorld.report(issue.id, selectedUser.id);
      setFeedback({ issueId: issue.id, text: result.saveError ? `${result.message} ${result.saveError}` : result.message });
    } catch (cause) {
      setFeedback({ issueId: issue.id, text: cause instanceof Error ? cause.message : "This mock report could not be added.", failed: true });
    }
  }

  return <section className={`road-issue-panel ${fixed ? "road-issue-cleared" : ""}`} aria-busy={pending}>
    <p className={`eyebrow ${isDemo ? "yellow-text" : "mint-text"}`}><MapPin size={15} />{isDemo ? "MOCK REPORT · FICTIONAL ROAD ISSUE" : "COMMUNITY ROAD ISSUE"}</p>
    <h2>{issue.label}</h2>
    <p className="road-issue-coordinates">{issue.location.lat.toFixed(5)}, {issue.location.lng.toFixed(5)}{isDemo ? " · illustrative location" : " · collector-confirmed pin"}</p>
    <div className="road-issue-visual">
      {photo ? <figure className="road-issue-photo">
        {/* Public, attributed illustrative photos are supplied by the mock fixture. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="Illustrative road damage photograph, unrelated to this fictional location" loading="lazy" />
        <figcaption>Illustrative photograph{("photoCredit" in issue && issue.photoCredit) ? ` · ${issue.photoCredit}` : ""}
          {"photoSourceUrl" in issue && issue.photoSourceUrl && <a href={issue.photoSourceUrl} target="_blank" rel="noopener noreferrer">Photo source</a>}
        </figcaption>
      </figure> : <div className="road-issue-art"><Creature family={families[issue.type]} power={power.score} mood={fixed ? "happy" : "grumpy"} /><span>Original creature art</span></div>}
      {photo && <div className="road-issue-creature"><Creature family={families[issue.type]} power={power.score} mood={fixed ? "happy" : "grumpy"} /></div>}
      <span className={`road-issue-status ${fixed ? "is-fixed" : ""}`}>{fixed ? <CheckCircle2 size={13} /> : <Wrench size={13} />}{fixed ? "Community marked fixed" : "Open road issue"}</span>
    </div>
    <div className="road-issue-facts"><span>{typeLabels[issue.type]}</span><span><Users size={14} />{reportCount} report{reportCount === 1 ? "" : "s"}</span></div>
    <MonsterPower profile={visualProfile} asOf={asOf} isDemo={isDemo} />
    <p className="road-age-note">{isDemo ? "Mock first report" : "First reported"}: {reportedDate}, {reportedDays} {reportedDays === 1 ? "day" : "days"} ago. {issue.monsterProfile.firstObservedOn ? `First noticed: ${issue.monsterProfile.firstObservedOn}, ${isDemo ? "fictional" : "self-reported"}.` : "No first-noticed date supplied."} Creature growth uses time since {issue.monsterProfile.firstObservedOn ? "the first-noticed date" : "the platform report"}, not a verified physical age. Capture awards stay fixed.</p>
    <p className="road-report-bonus"><span>Early-report bonus</span><strong>+60 XP</strong> first reporter · <strong>+20 XP</strong> reporters 2–5 · <strong>+5 XP</strong> thereafter. Each person can report this issue once.</p>

    <div className="road-confirmation">
      <div className="road-confirmation-heading"><h3>Community confirmations</h3><strong>{points}<span>/5 points</span></strong></div>
      <div className="road-confirmation-progress" role="progressbar" aria-label="Repair confirmation points" aria-valuemin={0} aria-valuemax={5} aria-valuenow={Math.min(5, points)}>
        {[1, 2, 3, 4, 5].map(point => <span key={point} className={point <= points ? "is-confirmed" : ""}>{point <= points && <Check size={13} />}</span>)}
      </div>
      <p>{fixed ? "Cleared from the active map after community confirmations." : `${issue.confirmationCount} ${issue.confirmationCount === 1 ? "person has" : "people have"} confirmed. ${missing} more ${missing === 1 ? "point" : "points"} needed to clear this pin.`}</p>
      <p className="road-confirmation-rule"><ShieldCheck size={14} /><span>One confirmation per person. Ordinary collectors add 1 point; verified council accounts add 3. A council confirmation still needs two more points.</span></p>
    </div>

    {!fixed && isDemo && demoWorld && <div className="road-demo-controls">
      <label htmlFor={selectorId}>Choose a fictional collector</label>
      <select id={selectorId} value={selectedUser?.id ?? ""} onChange={event => { setVoter(event.target.value); setFeedback(null); }} disabled={pending}>
        {demoWorld.users.map(user => <option key={user.id} value={user.id}>{user.displayName} · {user.councilVerified ? "mock council, 3 points" : "mock collector, 1 point"}</option>)}
      </select>
      <button type="button" className="button button-outline full-width" onClick={addMockReport} disabled={pending || !selectedUser}><Plus size={17} />Simulate adding my report</button>
      <button type="button" className="button button-yellow full-width" onClick={() => void confirm()} disabled={pending || !selectedUser}><Wrench size={17} />{pending ? "Saving confirmation…" : "Simulate repair confirmation"}</button>
      <p>Simulation only. Fictional voters never create accounts or update the real community board.</p>
    </div>}
    {!fixed && !isDemo && (collectorSignedIn ? <button type="button" className="button button-yellow full-width" onClick={() => void confirm()} disabled={pending || !onConfirmFixed}><CheckCircle2 size={17} />{pending ? "Saving confirmation…" : "Confirm this pothole is fixed"}</button>
      : <p className="notice">Sign in with your collector account to confirm that you have seen this road issue repaired.</p>)}
    {ownFeedback && <p className={ownFeedback.failed ? "error-message" : "road-action-message"} role={ownFeedback.failed ? "alert" : "status"}>{ownFeedback.text}</p>}
    {error && !ownFeedback?.failed && <p className="error-message" role="alert">{error}</p>}
    <p className="road-repair-bonus"><span>Repair bonus</span>At five points, each original reporter gets their capture XP and early-report bonus again, once only. Their original award is doubled.</p>
    {onReport && !fixed && <button type="button" className="text-button road-link-report" onClick={onReport}>{isDemo ? "Try a photo scan" : "Add my report to this community pothole"}<ArrowRight size={15} /></button>}
    <p className="road-issue-footnote">{isDemo ? "This location, report history and repair status are fictional. Do not send them to a council. " : ""}Community confirmation is an observation, not an engineering inspection or an official council repair record. Creature power is a game score.</p>
  </section>;
}

export default RoadIssuePanel;
