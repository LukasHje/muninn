# Multiple blocks

Before the first block.

```dataviewjs
dv.header(3, "First block");
dv.paragraph("First paragraph");
```

Markdown between the blocks.

- A normal list
- Still normal markdown

```dataviewjs
dv.span("Second ");
dv.span("block");
dv.el("br");
dv.paragraph("After inline output");
```

Markdown after the final block.
