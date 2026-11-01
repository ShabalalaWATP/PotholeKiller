"use client";

import { useState, type FormEvent } from "react";
import { Check, Cloud, RefreshCw, Save, ShieldCheck, UserRound } from "lucide-react";
import Creature, { type CreatureFamily } from "@/components/game/Creature";
import type { CollectorController } from "@/lib/client/useCollector";
import { claimForReport, type LocalProfile } from "@/lib/client/community";
import type { playerProgress } from "@/lib/game/progression";
import type { ReportRecord } from "@/lib/reporting/report";
import AuthPanel from "./AuthPanel";

const avatars: { family: CreatureFamily; label: string }[] = [
  { family: "gremlin", label: "Gremlin" }, { family: "crackling", label: "Crackling" },
  { family: "puddle", label: "Puddle imp" }, { family: "beast", label: "Asphalt beast" },
];

function ProfileEditor({ collector, profile, published }: { collector: CollectorController; profile: LocalProfile; published: boolean }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [isPublic, setPublic] = useState(published);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await collector.saveProfile({ displayName: displayName.trim(), avatar, published: isPublic });
  }
  return <form className="collector-profile-form" onSubmit={event => void submit(event)}>
    <fieldset disabled={collector.auth.signedIn && (collector.loading || !collector.auth.snapshotLoaded)}>
      <label className="field-label" htmlFor="collector-nickname">Collector nickname <span>2 to 24 characters</span></label>
      <input id="collector-nickname" value={displayName} onChange={event => setDisplayName(event.target.value)} minLength={2} maxLength={24} autoComplete="nickname" required aria-describedby="collector-name-help" />
      <p id="collector-name-help" className="collector-fine-print">Choose a nickname. Keep your email address and personal details private.</p>
      <p className="field-label">Choose your creature</p>
      <div className="collector-avatar-picker" role="group" aria-label="Choose collector avatar">
        {avatars.map(({ family, label }) => <button type="button" key={family} aria-label={`Use ${label} avatar`} aria-pressed={avatar === family} onClick={() => setAvatar(family)}>
          <Creature family={family} mood="happy" /><span>{label}</span>{avatar === family && <Check className="avatar-check" size={14} />}
        </button>)}
      </div>
      {collector.auth.signedIn && <label className="check-label collector-publish">
        <input type="checkbox" disabled={!collector.auth.snapshotLoaded} checked={collector.auth.snapshotLoaded && isPublic} onChange={event => setPublic(event.target.checked)} />
        <span><strong>Publish my nickname, avatar and community score.</strong><small>Uncheck to keep your profile private. Email addresses and photos never appear on the board.</small></span>
      </label>}
      <button type="submit" className="button button-yellow full-width"><Save size={17} />{collector.auth.signedIn ? collector.loading ? "Saving…" : "Save collector profile" : "Save on this device"}</button>
    </fieldset>
  </form>;
}

export default function ProfilePanel({ collector, player, reports }: {
  collector: CollectorController;
  player: ReturnType<typeof playerProgress>;
  reports: readonly ReportRecord[];
}) {
  const remote = collector.auth.signedIn && collector.auth.snapshotLoaded ? collector.snapshot?.profile : null;
  const profile = remote ?? collector.localProfile;
  const score = remote ?? { captures: player.collected, xp: player.xp, level: player.level, rank: player.rank };
  const eligible = reports.filter(report => claimForReport(report) !== null).length;
  const editorKey = `${collector.auth.sessionVersion}:${collector.auth.snapshotLoaded}:${profile.displayName}:${profile.avatar}:${remote?.published ?? false}`;

  return <section className="collector-panel">
    <p className="eyebrow mint-text"><UserRound size={16} /> YOUR COLLECTOR CARD</p>
    <h2>A face for the<br /><span className="yellow-text">fight against potholes.</span></h2>
    <div className="collector-layout">
      <div className="collector-card-column">
        <div className="collector-card">
          <span className="collector-card-number">POTHOLEKILLER · COLLECTOR</span>
          <div className="collector-avatar-stage"><span /><Creature family={profile.avatar} power={Math.min(10, score.level * 2 - 1)} mood="happy" title={`${profile.displayName}'s collector avatar`} /></div>
          <p className="collector-rank">LEVEL {score.level} · {score.rank}</p>
          <h3>{profile.displayName}</h3>
          <div className="collector-card-scope"><ShieldCheck size={13} />{remote ? remote.published ? "PUBLIC COMMUNITY PROFILE" : "PRIVATE COMMUNITY PROFILE" : "SAVED ON THIS DEVICE"}</div>
          <dl className="collector-stats"><div><dt>Captures</dt><dd>{score.captures}</dd></div><div><dt>Total XP</dt><dd>{score.xp}</dd></div><div><dt>Level</dt><dd>{score.level}</dd></div></dl>
        </div>
        <p className="collector-fine-print">{remote ? "Community score counts eligible real captures recorded by the server. Your local PotholeDex can also include samples." : "Your device profile includes local play and sample captures. A community score starts with new real scans while signed in."}</p>
        {collector.auth.signedIn && <div className="collector-sync">
          <div className="collector-section-title"><Cloud size={17} /><h3>Community score</h3></div>
          <p>{collector.pendingClaims > 0 ? `${collector.pendingClaims} capture update${collector.pendingClaims === 1 ? " is" : "s are"} waiting for a retry.` : "Real captures count once. Demo and offline samples stay local."}</p>
          <button type="button" className="text-button" disabled={collector.loading || eligible === 0} onClick={() => void collector.syncReports(reports)}><RefreshCw size={15} />Retry eligible captures</button>
          <small>Scan receipts expire after 30 minutes. Earlier local captures cannot be backfilled.</small>
        </div>}
      </div>
      <div className="collector-editor-column">
        {collector.error && <p className="error-message" role="alert">{collector.error}</p>}
        {collector.message && <p className="collector-status" role="status">{collector.message}</p>}
        {collector.auth.signedIn && !collector.auth.snapshotLoaded && <p className="collector-status" role="status">Loading your current collector profile before enabling community settings. <button type="button" className="text-button" disabled={collector.loading} onClick={() => void collector.refresh()}>Retry profile connection</button></p>}
        <ProfileEditor key={editorKey} collector={collector} profile={profile} published={remote?.published ?? false} />
        <AuthPanel collector={collector} />
      </div>
    </div>
  </section>;
}
