# Muninn Domain Language

This document defines the terminology used throughout Muninn.

Keeping these concepts consistent makes the codebase easier to reason about and prevents architectural drift.

---

## Vault

The user's Markdown knowledge base.

Muninn never owns the Vault.

The Vault is the source of truth.

---

## Note

A single Markdown document.

A Note is the atomic unit of knowledge.

---

## Library

The generic browser.

Purpose:

- search
- filtering
- sorting
- discovery across the entire Vault

The Library makes no assumptions about note types.

Think:

"I know what I'm looking for."

---

## Experience

A curated browsing experience built by Muninn.

Experiences are application features, not user data.

Examples:

- Gear
- Books
- Recipes
- Travel

Experiences are opinionated interfaces optimized for a particular knowledge domain.

Think:

"I want to explore."

---

## Inspector

The Inspector is part of the Experience framework.

It displays contextual information about the currently selected Note while browsing an Experience.

The Inspector is intentionally lightweight.

Its purpose is to support browsing by presenting:

- summary
- key metadata
- quick actions
- selected sections of the Note

The Inspector is not intended to replace the full Note View.

Selecting **Open Note** transitions to Muninn's normal Note View, which remains the authoritative reading experience.

Think:

"I want to inspect this item before deciding whether to open the full note."

### Scope

The Inspector only exists inside Experiences.

The generic Library and Note View do not depend on the Inspector.

Experiences may choose whether or not to provide an Inspector, but when present it should remain a generic component reusable across all Experiences.

---

## Note View

The full reading experience.

Displays the complete Markdown document using Muninn's rendering pipeline.

The Note View is always the authoritative representation of a Note.

Think:

"I want to read everything."

---

## Domains

Domains describe Notes.

Examples:

type: gear

type: vehicle

type: recipe

Domains come from user content.

Muninn never restricts them.

---

## Experience Registry

The registry describing which Experiences Muninn currently supports.

It does not describe user data.

It describes application capabilities.

---

## Mental model

Library = Find

Experience = Explore

Inspector = Inspect

Note = Read

---

## Design principle

If a new feature introduces a concept that overlaps an existing term, prefer extending the existing concept rather than inventing a new one.

Muninn should maintain a small, well-defined vocabulary.