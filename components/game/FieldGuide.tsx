import { ArrowRight } from "lucide-react";

export default function FieldGuide({ onHunt }: { onHunt: () => void }) {
  return <section className="help-panel">
    <p className="eyebrow mint-text">FIELD GUIDE</p>
    <h2>Good hunting.<br /><span className="yellow-text">Better streets.</span></h2>
    <ol>
      <li><b>Pin it.</b> Search a UK address or postcode, or select a point on the Streets map. Confirm the exact defect pin.</li>
      <li><b>Snap it.</b> Upload a photo taken from a safe place. OpenAI vision checks for visible road damage. Example outputs are labelled.</li>
      <li><b>Review it.</b> Choose cracking, small, medium or large. Review the auto-written description, suggested council route and your name.</li>
      <li><b>Report it.</b> Prepare an email or copy the draft into the council’s official form. Each reporter gets their own named draft. You control sending.</li>
      <li><b>Collect it.</b> Earn 60–110 capture XP once per photo. A shared pothole gives +60 community XP to its first reporter, +20 to reporters 2–5, then +5 to later reporters. One reporting bonus per person per issue.</li>
      <li><b>Watch it grow.</b> Older unresolved sightings grow stronger monsters. When the first-noticed date is unknown, the game uses time on the map. Original capture awards stay fixed.</li>
      <li><b>Confirm a repair.</b> Each collector adds one point, a verified council account adds three. Five points clear the pin and award each original reporter their capture XP and reporting bonus again, once.</li>
    </ol>
    <p className="notice">Game power and community confirmations are not engineering inspections. Preparing a draft does not send a report. Demo locations, users and histories are fictional and cannot be emailed to a council.</p>
    <p className="tiny muted">Your full draft stays in this browser. Shared pins contain only the road location and street label. Uploaded photos go to OpenAI for live analysis. Address searches go to location providers. Your location is requested only when you choose it. Street tiles come from OpenStreetMap.</p>
    <button type="button" className="button button-yellow full-width" onClick={onHunt}>Let’s hunt <ArrowRight size={18} /></button>
  </section>;
}
