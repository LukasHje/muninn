# Rendering Philosophy

## Markdown First

Markdown is the source of truth.

Users should write notes for themselves—not for Muninn.

## Progressive Enhancement

Muninn should recognize common structures and enhance them when possible.

Enhancements are optional and should never become requirements.

## Convention over Configuration

Muninn prefers common Markdown conventions over custom schemas.

Recognizable headings such as:

- Specifications
- Use case
- Review
- Links

may automatically receive richer rendering.

## Metadata belongs in Frontmatter

Identity belongs in frontmatter.

Examples:

- type
- category
- status
- thumbnail
- cover

Narrative belongs in Markdown.

## Discovery Is Declarative

Experiences discover notes through registered selectors. Frontmatter is one supported source, not a requirement for every Experience; path-based discovery is also supported.

Selectors decide membership only. They must not alter Markdown rendering or presentation.
