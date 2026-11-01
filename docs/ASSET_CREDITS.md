# Asset credits

Sources and licences were checked on 1 November 2026. The three bundled images are real photographs, not generated evidence. None establishes a pothole location in Hackney. All locations used with these sample images are fictional demonstration locations.

| Local file | Photograph and creator | Licence | Changes |
| --- | --- | --- | --- |
| `public/samples/pothole.jpg` | [Potholes in Bengaluru road](https://commons.wikimedia.org/wiki/File:Potholes_in_Bengaluru_road.jpg), Mallikarjunasj | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Resized to 964 × 1280, JPEG recompression, embedded metadata removed. |
| `public/samples/crack.jpg` | [Worn cracked asphalt pavement](https://commons.wikimedia.org/wiki/File:Worn_cracked_asphalt_pavement.jpg), John Harvey | Released into the public domain by its author, as recorded on the linked Commons file page. | Resized to 1280 × 960, JPEG recompression, embedded metadata removed. |
| `public/samples/croissant.jpg` | [Croissant-newspaper-and-tea](https://commons.wikimedia.org/wiki/File:Croissant-newspaper-and-tea.jpg), Petr Kratochvil | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Resized/recompressed to 1280 × 853, embedded metadata removed. |

The croissant photograph originated at [Public Domain Pictures](https://www.publicdomainpictures.net/view-image.php?image=15461&picture=croissant-newspaper-and-te). The cracked asphalt photograph originated at [Public Domain Image](https://www.public-domain-image.com/public-domain-images-pictures-free-stock-photos/textures-and-patterns-public-domain-images-pictures/worn-cracked-asphalt-pavement.jpg). These source links are retained as requested by the original providers.

The predefined sample assessments in `lib/samples.ts` were written for demonstration. They must be displayed as example output, never presented as a model response.

## Original game artwork

`components/game/Creature.tsx`, `public/creatures/*.svg` and `public/map/hackney-pilot.svg` were created specifically for PotholeKiller during this build. No existing game characters, logos, music or proprietary interface assets were used.

The map illustration is an original schematic with fictional street geometry, not an OpenStreetMap export and not suitable for locating a real defect. Use the geographic location picker and confirm exact coordinates for real reports. The application must label the illustration as schematic.

The four creature families share original drawing templates: Crater Gremlin, Crackling, Puddle Imp and Asphalt Beast. Colour, class and rarity are cosmetic game attributes, never engineering assessments.

## Geographic map

The separate geographic map uses [Leaflet](https://leafletjs.com/) and [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors' data. Keep attribution visible and follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). The bundled schematic contains no cached map tiles.

## Bundled library notices

The self-hosted Space Grotesk font, Lucide icons and Leaflet map library include their distribution notices in [public/licenses](../public/licenses/): [font licence](../public/licenses/space-grotesk.txt), [icon licence](../public/licenses/lucide.txt) and [Leaflet licence](../public/licenses/leaflet.txt). These notices do not assign a licence to the original application code.
