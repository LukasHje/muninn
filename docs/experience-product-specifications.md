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

1. finds bullet lists inside the configured feature sections
2. recognizes supported product concepts
3. derives short, comparable display values
4. sorts by priority
5. renders only the top 4

If fewer exist, it renders fewer.

It must never fill gaps with unrelated metadata.

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
