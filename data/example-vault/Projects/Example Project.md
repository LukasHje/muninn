---
title: Example Project
type: project
tags:
  - project
  - demo
status: Active
updated: 2026-07-01
cover: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80"
---

This note is here so the dashboard, note browser and Dataview Lite have a small project dataset to work with.

![Workspace inspiration](https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80)

```dataview
table file.link as "Projects", status as "Status", file.mtime as "Updated"
from "Projects"
sort file.name asc
```

## Next

- Link to [[Books/Example Book]]
- Link to [[Travel/Santorini]]
