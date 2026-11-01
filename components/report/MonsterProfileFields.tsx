"use client";

import MonsterPower from "@/components/game/MonsterPower";
import { MonsterProfileSchema, type MonsterProfile } from "@/lib/game/power";

export type ReportTypeChoice = "as_assessed" | "cracking" | "small" | "medium" | "large";
export default function MonsterProfileFields({ profile, onChange, isDemo, reportType, onTypeChange }: {
  profile: MonsterProfile; onChange: (profile: MonsterProfile) => void; isDemo: boolean;
  reportType: ReportTypeChoice; onTypeChange: (choice: ReportTypeChoice) => void;
}) {
  const now = new Date().toISOString();
  const validatedProfile = MonsterProfileSchema.safeParse(profile);
  const invalidDate = !validatedProfile.success || (!!profile.firstObservedOn && profile.firstObservedOn > now.slice(0, 10));
  return <fieldset className="monster-profile-fields"><legend>Build your monster</legend>
    <p className="tiny muted">Bigger patches and older sightings power up the creature. Use what you already know from a safe place.</p>
    <div className="power-fields"><label className="field-label" htmlFor="extent">Pothole type <span>(your visual estimate)</span>
      <select id="extent" value={reportType} onChange={event => onTypeChange(event.target.value as ReportTypeChoice)}>
        <option value="as_assessed">Use the photo assessment</option><option value="cracking">Cracking</option><option value="small">Small pothole</option><option value="medium">Medium pothole</option><option value="large">Large pothole</option>
      </select></label>
      <label className="field-label" htmlFor="first-noticed">First noticed <span>(optional)</span>
        <input id="first-noticed" type="date" max={now.slice(0, 10)} value={profile.firstObservedOn ?? ""} onChange={event => onChange({ ...profile, firstObservedOn: event.target.value || null })} />
      </label></div>
    {validatedProfile.success && !invalidDate && <MonsterPower profile={validatedProfile.data} asOf={now} isDemo={isDemo} />}
    {invalidDate && <p className="error-message" role="alert">Choose a valid first-noticed date on or before today.</p>}
    <p className="tiny muted">{isDemo ? "This history is fictional. " : "This is your observation, not a verified reporting history. "}Game power is not a road-safety assessment. XP is awarded once and stays fixed.</p>
  </fieldset>;
}
