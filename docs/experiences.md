# Experiences

Status: Proposed Architecture

---

## Overview

Muninn organizes knowledge around one unified note model.

Every note is still "just a note".

The difference is how users browse and experience collections of notes.

This introduces the concept of **Experiences**.

An Experience is a curated Muninn browsing surface.

It may be focused on one note domain, but it is not the same thing as a note category.

It does **not** replace the generic Library Browser.

Instead it provides a richer and more enjoyable way to explore a domain.

Examples:

- Recipes
- Books
- Technology
- Projects
- Journal
- Training
- Travel

Each experience should feel like its own small application while sharing the exact same underlying note model.

---

# Three Navigation Layers

Muninn contains three different navigation experiences.

## 1. Experience

Purpose:

Discover and browse an experience.

Examples:

Recipes

↓

Featured recipes

↓

Popular ingredients

↓

Recent recipes

↓

Browse all recipes

Books

↓

Authors

↓

Reading status

↓

Series

↓

Browse library

Technology

↓

Projects

↓

Recently updated

↓

Hardware

↓

Software

↓

Browse technology notes

Experiences are inspirational and exploratory.

---

## 2. Library Browser

Purpose:

Search.

Filter.

Sort.

Browse every note.

The Library Browser remains the primary interface for finding notes.

Every Experience should expose a clear entry point into the Library Browser.

Example:

Browse all recipes →

which opens:

/notes?category=recipes

---

## 3. Note Layout

Purpose:

Read a single note.

Examples:

Recipe note

Book note

Travel note

Daily note

Technology note

Layouts affect one note only.

Experiences affect an entire collection.

---

# Architecture

Conceptually:

Vault

↓

Experience Definition

↓

Experience View

↓

Library Browser

↓

Note Layout

These responsibilities should remain separate.

---

# Experience Definition

Every experience should be defined in a central registry.

Example:

```ts
ExperienceDefinition {

    key

    sidebar

    experience

    library

    noteLayouts

}
```

An Experience Definition owns:

- sidebar navigation
- icon
- colors
- hero image
- title
- description
- landing page
- library link
- widgets
- sections

No experience-specific information should be scattered throughout the application.

---

# Experience View

An Experience is composed from reusable building blocks.

Examples:

Category Hero

Featured Notes

Recent Notes

Popular Tags

Metadata Groups

Timeline

Statistics

Browse Library

Widgets

An Experience should compose these blocks rather than becoming a custom application.

---

# Widgets

Widgets are optional.

Examples:

Recipes

- Random Recipe
- Shopping List
- Pantry
- Cooking Timer

Books

- Currently Reading
- Reading Goal
- Reading Progress

Technology

- Active Projects
- Hardware Inventory
- Recently Modified

Travel

- Countries Visited
- Upcoming Trips
- Interactive Map

Journal

- Current Streak
- Calendar
- This Month

Widgets should remain independent reusable components.

---

# Hero Identity

Every experience owns its own visual identity.

Examples

Recipes

- food photography

Books

- library

Travel

- landscapes

Technology

- servers
- networking
- engineering

Projects

- workshop
- planning

Journal

- notebook
- writing desk

Training

- gym
- outdoors

Hero images are part of category identity.

They should never be random placeholders.

---

# Shared Components

Experiences should be built from reusable components.

Examples

ExperienceHero

Section

FeaturedNotes

RecentNotes

PopularTags

MetadataGrid

Timeline

Statistics

BrowseLibraryCard

Future experiences should mostly be composition rather than implementation.

---

# Routing

Preferred URLs:

/recipes

/books

/travel

/projects

/technology

/journal

Internally these should all resolve through the same Experience system.

Avoid creating separate implementations for each route.

---

# Design Principles

Every experience should feel unique.

Every experience should reuse the same architecture.

Users should immediately recognize the subject matter.

The application should remain cohesive.

The Library Browser should never be replaced.

Everything remains markdown-first.

---

# Future Examples

Recipes

Food magazine.

Books

Private encyclopedia.

Technology

Engineering dashboard.

Travel

Adventure journal.

Journal

Timeline.

Projects

Workspace.

Training

Fitness tracker.

The experience changes.

The notes do not.

---

# Long-term Goal

Muninn should not merely display notes.

It should create experiences around knowledge domains.

Users should feel that they are entering

Recipes

rather than

a folder called Recipes.
