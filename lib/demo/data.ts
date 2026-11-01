import type { CreatureFamily } from "@/components/game/Creature";
import type { MonsterProfile } from "@/lib/game/power";

/** Entirely fictitious demo people. These are not Identity accounts or council staff. */
export type DemoUser = { id: string; displayName: string; avatar: CreatureFamily; councilVerified: boolean };
export type DemoIssueType = "cracking" | "small" | "medium" | "large";
export type DemoIssue = {
  id: string;
  label: string;
  location: { lat: number; lng: number };
  type: DemoIssueType;
  monsterProfile: MonsterProfile;
  createdAtISO: string;
  photoUrl: string;
  photoCredit: string;
  photoSourceUrl: string;
  reporterIds: string[];
  status: "open" | "community_fixed";
};
export type DemoRoadIssue = DemoIssue;

const names = ["Crater Kate", "Tarmac Tom", "Count Crackula", "Bump Detective", "Pedal Penny", "Roadside Ruby", "Asphalt Ali", "Minty Miles", "Cone Commander", "Kerbside Kai", "Captain Clutch", "Patchwork Pip", "Puddle Scout", "Tyre Whisperer", "Crack Tracker", "Hackney Hopper", "Surface Surfer", "Crater Cadet Jo", "Demo Inspector Ash", "Demo Inspector Rowan"];
const avatars: CreatureFamily[] = ["gremlin", "crackling", "puddle", "beast"];
export const demoUsers: DemoUser[] = names.map((displayName, index) => ({
  id: `demo-user-${String(index + 1).padStart(3, "0")}`,
  displayName,
  avatar: avatars[index % avatars.length],
  councilVerified: index >= 18,
}));


/** Geometry sampled once from named OSM road centrelines; no actual defect is asserted. */
const roadLocations: [string, [number, number][]][] = [
  ["Mare Street",[[51.535714,-0.057201],[51.538401,-0.057129],[51.54106,-0.055203],[51.543595,-0.055333],[51.546222,-0.055079]]],
  ["Graham Road",[[51.546148,-0.068236],[51.545903,-0.065285],[51.545985,-0.062358],[51.546475,-0.059489],[51.546609,-0.056518]]],
  ["Dalston Lane",[[51.546249,-0.073148],[51.546608,-0.069476],[51.548309,-0.066242],[51.548869,-0.061451],[51.54951,-0.05678]]],
  ["Amhurst Road",[[51.556225,-0.071953],[51.554176,-0.067958],[51.55126,-0.065309],[51.549608,-0.060766],[51.54783,-0.056462]]],
  ["Richmond Road",[[51.542857,-0.074763],[51.543021,-0.070474],[51.543178,-0.066183],[51.543421,-0.061709],[51.543383,-0.057445]]],
  ["Well Street",[[51.539928,-0.055466],[51.5403,-0.052402],[51.541073,-0.049463],[51.542697,-0.048701],[51.544197,-0.046858]]],
  ["Morning Lane",[[51.546024,-0.054544],[51.5465,-0.053047],[51.547122,-0.050638],[51.546798,-0.048119],[51.545806,-0.046416]]],
  ["Cassland Road",[[51.542078,-0.047405],[51.542469,-0.045745],[51.543166,-0.042842],[51.543846,-0.03964],[51.544592,-0.036489]]],
  ["Queensbridge Road",[[51.532581,-0.069814],[51.535696,-0.070173],[51.538818,-0.070243],[51.541937,-0.069968],[51.54506,-0.069812]]],
  ["Kingsland Road",[[51.531471,-0.077042],[51.534912,-0.076946],[51.538074,-0.076744],[51.541685,-0.076373],[51.544382,-0.076022]]],
  ["Balls Pond Road",[[51.546554,-0.086219],[51.546583,-0.083781],[51.546456,-0.081357],[51.54624,-0.078594],[51.546073,-0.076836]]],
  ["Grove Road",[[51.530731,-0.040076],[51.532067,-0.040887],[51.533284,-0.041403],[51.534763,-0.042324],[51.53605,-0.042936]]],
];
const demoPhotos = [
  ["/demo-photos/pothole-bengaluru.jpg","Mallikarjunasj · CC0 1.0","https://commons.wikimedia.org/wiki/File:Potholes_in_Bengaluru_road.jpg"],
  ["/demo-photos/cracking-harvey.jpg","John Harvey · Public domain","https://commons.wikimedia.org/wiki/File:Worn_cracked_asphalt_pavement.jpg"],
  ["/demo-photos/pothole-monaghan.jpg","Computerfan0 · CC0 1.0","https://commons.wikimedia.org/wiki/File:Pothole_on_local_Road_in_County_Monaghan.jpg"],
  ["/demo-photos/pothole-kyiv.jpg","Roman Riabenko (Роман Рябенко) · CC0 1.0","https://commons.wikimedia.org/wiki/File:A_pothole_in_Dilova_Street_in_Kyiv.jpg"],
  ["/demo-photos/pothole-booker.jpg","Thomas Booker (CoderThomasB) · CC BY-SA 4.0","https://commons.wikimedia.org/wiki/File:A_photo_of_a_pothole_2021-07-11.jpg"],
  ["/demo-photos/pothole-lafayette.jpg","Oregon Department of Transportation · CC BY 2.0","https://commons.wikimedia.org/wiki/File:Pothole_on_99W_near_Lafayette_(15574757989).jpg"],
];

const issueTypes: DemoIssueType[] = ["cracking", "small", "medium", "large"];
const potholePhotoIndexes = [0, 2, 3, 4, 5];

/** Sixty invented physical issues and seventy-five invented reports, never council submissions. */
export const demoIssues: DemoIssue[] = roadLocations.flatMap(([road, locations], roadIndex) =>
  locations.map(([lat, lng], spotIndex) => {
    const index = roadIndex * 5 + spotIndex;
    const type = issueTypes[index % issueTypes.length];
    const ageDays = index === 59 ? 180 : 2 + (index * 37) % 179;
    const firstObservedOn = new Date(Date.UTC(2026, 10, 1) - ageDays * 86_400_000).toISOString().slice(0, 10);
    const photo = demoPhotos[type === "cracking" ? 1 : potholePhotoIndexes[index % potholePhotoIndexes.length]];
    return {
      id: `demo-issue-${String(index + 1).padStart(3, "0")}`,
      label: `${road} · ${type === "cracking" ? "cracking" : "pothole"} demo ${spotIndex + 1}`,
      location: { lat, lng },
      type,
      monsterProfile: { extent: type === "cracking" ? "unknown" : type, firstObservedOn },
      createdAtISO: `2026-11-01T10:${String(index).padStart(2, "0")}:00.000Z`,
      photoUrl: photo[0],
      photoCredit: photo[1],
      photoSourceUrl: photo[2],
      reporterIds: [demoUsers[index % demoUsers.length].id, ...(index < 15 ? [demoUsers[(index + 7) % demoUsers.length].id] : [])],
      status: "open",
    };
  }),
);

