import { defectAnalysisSchema, type DefectAnalysis } from './ai/schema';

export type SampleId = 'pothole' | 'crack' | 'croissant';

export type Sample = {
  id: SampleId;
  label: string;
  src: string;
  alt: string;
  credit: string;
  creditUrl: string;
};

/** Real, permissively licensed photographs. Their Hackney locations are fictional. */
export const samples: readonly Sample[] = [
  {
    id: 'pothole',
    label: 'The usual suspect',
    src: '/samples/pothole.jpg',
    alt: 'Missing road surface and exposed loose aggregate beside a raised kerb.',
    credit: 'Mallikarjunasj, CC0',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Potholes_in_Bengaluru_road.jpg',
  },
  {
    id: 'crack',
    label: 'A cracking discovery',
    src: '/samples/crack.jpg',
    alt: 'A network of intersecting cracks across a grey asphalt surface.',
    credit: 'John Harvey, public domain',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Worn_cracked_asphalt_pavement.jpg',
  },
  {
    id: 'croissant',
    label: 'Definitely a pothole?',
    src: '/samples/croissant.jpg',
    alt: 'A golden croissant on a white plate beside a newspaper and a mug.',
    credit: 'Petr Kratochvil, CC0',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Croissant-newspaper-and-tea.jpg',
  },
];

const exampleOutputs: Record<SampleId, DefectAnalysis> = {
  pothole: {
    isRoadSurface: true,
    defectType: 'pothole',
    visibleDamage: true,
    factualDescription: 'An irregular area of missing road surface is visible beside a raised kerb. Loose aggregate is exposed within and around the damaged area.',
    visibleObservations: [
      'The road surface has an irregular broken edge.',
      'Loose stones and exposed aggregate are visible.',
      'The photograph does not establish depth or dimensions.',
    ],
    photoQuality: 'good',
    needsHumanReview: false,
    identifiedObject: 'damaged road surface',
    funnyNickname: 'Lord Potholious',
    humorousDescription: 'Consumer of alloys. Enemy of suspension.',
  },
  crack: {
    isRoadSurface: true,
    defectType: 'surface_crack',
    visibleDamage: true,
    factualDescription: 'A network of intersecting cracks is visible across a grey asphalt surface, dividing parts of the surface into irregular sections.',
    visibleObservations: [
      'Several branching and intersecting cracks are visible.',
      'The image shows local surface deterioration.',
      'No depth or engineering severity can be established from this photograph.',
    ],
    photoQuality: 'good',
    needsHumanReview: false,
    identifiedObject: 'cracked asphalt surface',
    funnyNickname: 'Count Crackula',
    humorousDescription: "Hasn't seen a resurfacing crew since 1847.",
  },
  croissant: {
    isRoadSurface: false,
    defectType: 'not_road',
    visibleDamage: false,
    factualDescription: 'The photograph shows a croissant on a plate, with a mug and newspaper behind it. It does not show a road surface.',
    visibleObservations: ['A croissant is visible on a white plate.', 'No road surface or road defect is visible.'],
    photoQuality: 'good',
    needsHumanReview: false,
    identifiedObject: 'croissant',
    funnyNickname: 'Crumb Lord',
    humorousDescription: 'A threat to clean shirts. Absolutely no threat to your suspension.',
  },
};

/** Predefined example output, never a live AI result. Only bundled samples may use this. */
export function getSampleAnalysis(id: SampleId): DefectAnalysis {
  return defectAnalysisSchema.parse(exampleOutputs[id]);
}

export function isSampleId(value: string): value is SampleId {
  return samples.some((sample) => sample.id === value);
}
