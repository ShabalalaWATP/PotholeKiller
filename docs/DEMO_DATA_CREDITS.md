# Fictional community demonstration data

The data in `lib/demo/data.ts` is a labelled fictional scenario: 60 invented physical issues, 75 invented report relationships and 20 invented users. Fifteen issues have two reporters; the remaining 45 have one. Two fictitious users have a demonstration inspector flag. They are not real council officers, verified council identities or Netlify Identity accounts.

Every issue starts open. Any subsequent repair votes and community-fixed state belong to the local demonstration only. No entry asserts that a real defect exists, that a report was sent to a council, or that a road was repaired. Demonstration scores must remain separate from the authenticated community service.

All report preparation dates are fixed to 1 November 2026. First-noticed dates are invented and vary from 2 to 180 days earlier. The photographs are reused illustratively across these entries. **None of the photographs depicts the assigned London map location.** Apparent extent and creature attributes are part of the fictional scenario, not measurements of the source photograph.

## Photograph provenance and licences

Photographs were discovered with web search and downloaded from their primary Wikimedia Commons sources after checking author and licence details. Search-engine listings are discovery aids, not reuse licences. No unlicensed image was copied from Google Images or another search cache.

All six distributed JPEGs were resized proportionally, recompressed and stripped of embedded metadata. No photographic content was generated. The modified CC BY-SA photograph remains available under its stated CC BY-SA licence. Keep the author/licence credit and source link visible alongside each illustrative photo.

| Local asset | Author | Source | Licence | Distributed dimensions |
| --- | --- | --- | --- | --- |
| `public/demo-photos/pothole-bengaluru.jpg` | Mallikarjunasj | [Potholes in Bengaluru road](https://commons.wikimedia.org/wiki/File:Potholes_in_Bengaluru_road.jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 572 × 760 |
| `public/demo-photos/cracking-harvey.jpg` | John Harvey | [Worn cracked asphalt pavement](https://commons.wikimedia.org/wiki/File:Worn_cracked_asphalt_pavement.jpg) | Released into the public domain by its author, as recorded on the source page. | 1000 × 750 |
| `public/demo-photos/pothole-monaghan.jpg` | Computerfan0 | [Pothole on local Road in County Monaghan](https://commons.wikimedia.org/wiki/File:Pothole_on_local_Road_in_County_Monaghan.jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 369 × 760 |
| `public/demo-photos/pothole-kyiv.jpg` | Роман Рябенко (Roman Riabenko) | [A pothole in Dilova Street in Kyiv](https://commons.wikimedia.org/wiki/File:A_pothole_in_Dilova_Street_in_Kyiv.jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 960 × 540 |
| `public/demo-photos/pothole-booker.jpg` | Thomas Booker (CoderThomasB) | [A photo of a pothole 2021-07-11](https://commons.wikimedia.org/wiki/File:A_photo_of_a_pothole_2021-07-11.jpg) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | 1000 × 563 |
| `public/demo-photos/pothole-lafayette.jpg` | Oregon Department of Transportation | [Pothole on 99W near Lafayette](https://commons.wikimedia.org/wiki/File:Pothole_on_99W_near_Lafayette_(15574757989).jpg), originally [OregonDOT on Flickr](https://www.flickr.com/photos/28364885@N02/15574757989/) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | 1000 × 750 |

The John Harvey photograph originated at [Public Domain Image](https://www.public-domain-image.com/public-domain-images-pictures-free-stock-photos/textures-and-patterns-public-domain-images-pictures/worn-cracked-asphalt-pavement.jpg). The Bengaluru and John Harvey photographs were already bundled for the initial scanner examples and are reused here with the same provenance.

## Map placement

The map points are derived from [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), whose database is available under the [Open Database Licence 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Maintain visible OpenStreetMap attribution on geographic maps.

One bounded road-geometry query was fetched from the public [Overpass API](https://overpass-api.de/api/interpreter). The returned OSM data timestamp was **2026-11-01T15:41:50Z**. No address-by-address geocoding, tile prefetching or offline tile archive was used.

```overpass
[out:json][timeout:25];
way[highway][name~"^(Mare Street|Graham Road|Dalston Lane|Amhurst Road|Richmond Road|Well Street|Morning Lane|Cassland Road|Queensbridge Road|Kingsland Road|Balls Pond Road|Grove Road)$"]
  (51.530,-0.1025,51.563,-0.0155);
out geom;
```

Five points per named road were interpolated along its returned road-centreline segments. Footways, cycleways, proposed ways and building footprints were excluded. Points are rounded to six decimal places and lie inside the requested bounding box. These are strategic **fictional issue positions on real road geometry**, not observations of road condition or evidence of highway ownership.

| Road cluster | OSM ways containing the sampled points |
| --- | --- |
| Mare Street | 670492926, 48714754, 591931948, 624303056, 37852888 |
| Graham Road | 206110578, 206110579, 206110361 |
| Dalston Lane | 109704302, 403510506, 1491358761, 1536390460, 195024128 |
| Amhurst Road | 4312372, 1136541691, 1339962806, 1392144492, 1415471514 |
| Richmond Road | 6277967, 1106905513, 5929476, 839389873, 374052915 |
| Well Street | 226403377, 560871207, 1068558776, 261603315, 683619865 |
| Morning Lane | 235240100, 649785511, 583287993, 276554775 |
| Cassland Road | 606854786, 582711357, 582711352, 19993027 |
| Queensbridge Road | 649646585, 868094944, 819987764, 402278492, 403510518 |
| Kingsland Road | 195363390, 195361754, 403397511, 839400070, 1191329265 |
| Balls Pond Road | 233066424, 197197289, 1222948636, 653181886, 230547773 |
| Grove Road | 1049158233, 40334292, 614138205, 688989358, 1374421597 |

## Validation performed

The fixture/asset check confirmed 20 users, 60 unique issue IDs, 75 valid reporter relationships, exactly two fictional inspector flags, 15 issues of each of the four types, initial open status, date ordering, requested coordinate bounds and existence of every referenced image. All six files decoded as JPEG, contained no EXIF metadata and were below 200KB. A contact sheet of all six photographs was rendered and visually inspected.

No new Identity accounts were created, no emails were sent, and no real council reporting or authenticated scoring data was seeded.
