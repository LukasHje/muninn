# Experience Product Specifications

Product Cards should not render arbitrary note metadata.

They should render curated **Product Features** extracted from note content.

## Distinction

### Product Specifications

Examples:

- battery
- runtime
- waterproof rating
- capacity
- lumens
- fuel type
- drivetrain
- engine

Characteristics:

- short
- visual
- easy to compare
- usually icon-driven

These belong on Product Cards.

### Metadata

Examples:

- category
- manufacturer
- aliases
- gallery
- created
- updated
- reviewed
- tags
- status

These describe the note or its lifecycle.

They belong in the Inspector, not on the Product Card.

Default Generic Note Cards may show a summary and contextual tags, but they do not promote unknown metadata into specifications.

## Architecture

Product features are extracted through a dedicated extraction layer.

Each Experience defines:

- `featureSections`

Examples:

- `Key features`
- `Features`
- `Highlights`
- `Specifications`
- `Technical highlights`

The Product Feature Extractor then:

1. finds bullet lists and Markdown table rows inside the configured feature sections
2. recognizes supported product concepts
3. derives short, comparable display values
4. sorts by priority
5. renders only the top 4

If fewer exist, it renders fewer.

It must never fill gaps with unrelated metadata.

Recognized firearm specifications include caliber, barrel length and weight. Full metric cartridge names are retained, for example `7.62x51`; when the same rifle entry provides both `7.62x51` and `.308`, the more compact `.308` display value is preferred. Barrel length reuses the existing length icon used for knife blade length. Approximation markers on measurements, such as `~3.9 kg`, are preserved because they carry useful precision information.

Product names that communicate a supported concept should normalize to its comparable display value. For example, Carhartt `Rain Defender`, `water resistant`, `vattenresistent` and `vattenavvisande` all produce the `Water resistant` feature with the droplets icon. This remains concept recognition rather than manufacturer-specific Card logic.

Waterproof and water-resistant concepts use the water-drop icon, while weatherproof concepts use the combined sun-and-cloud icon. Large battery capacities are compacted only when needed for the Card, using thousands with at most one decimal (for example `26500 mAh` becomes `26,5k mAh`). Replaceable battery phrases include compact and natural-language counts such as `4x AA` and `4 stycken AA batterier`.

Optics and tool dimensions normalize diameter to the diameter icon, labeled focal-length ranges to the aperture icon, and explicit optical zoom factors to the binoculars icon. Color-reference products expose their documented patch count with the swatch-book icon. GPS waypoints require waypoint, route, or track-logging language; a generic word such as audio `tracks` must not imply navigation support.

Explicit FM-radio capability uses the audio-lines icon. When a feature documents both AM and FM, the compact value remains `AM/FM`; FM-only wording renders as `FM radio`.

Gear may consume explicit limitations when they communicate a comparable capability absence, such as `No Bluetooth`. Cassette playback uses the cassette-tape icon. CD, DVD, Blu-ray, and generic optical-disc playback share the optical-disc icon while preserving the documented medium as the compact value.

Battery capacity, count, and type are separate comparable concepts. Capacity values such as `10000 mAh`, `5.0 Ah`, and `154 Wh` use the battery icon. Explicit counts such as `4x AA` and `2x CR2` also use the battery icon. Chemistry, a cell format without a count, rechargeability, or a documented tool platform such as `Li-ion`, `AA`, `CR2`, and Milwaukee `M18` use the car-battery icon. Platform recognition requires battery, platform, system, or equivalent context so unrelated dimensions such as an `M18×1` thread are not misclassified.

Supported capabilities may also preserve an explicit absence when that absence is useful for comparison. Bluetooth wording in a configured feature section normalizes to `Bluetooth` (including a supplied version) and uses the Bluetooth icon. Explicit negations such as `no Bluetooth`, `without Bluetooth`, `saknar Bluetooth` and `Bluetooth is not supported` normalize to `No Bluetooth` and use the Bluetooth-off icon. Negation matching must run before generic capability recognition.

Explicit `wireless` and Swedish `trådlös` wording normalizes to the `Wireless` capability and uses the Wi-Fi icon. Wireless is independent from Bluetooth: a product may expose either or both features when both concepts are explicitly documented.

## Ownership

### Experience

Chooses:

- card family
- feature source section names

### Product Card

Consumes:

- extracted product features

It does not interpret arbitrary frontmatter or parse markdown itself.

### Product Feature Extractor

Owns:

- heading matching
- bullet extraction
- feature recognition
- value compaction
- priority sorting

### Inspector

Displays:

- full metadata
- note details
- expanded feature context

## Reuse

This system is intended to be reusable across future product-oriented Experiences such as:

- Gear
- Technology
- Workshop
- Vehicles

Each Experience can provide different source headings while reusing the same Product Card and extraction architecture.

An Experience using `generic-note` does not run Product Feature Extraction. Feature extraction is selected by the Card Family, not by the browser or selector.
