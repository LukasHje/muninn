# Lazy callout continuation

> [!danger]- Lifecycle status
>```dataviewjs
const systems = dv.pages().where(page => page.status);
dv.header(3, "Critical systems");
dv.paragraph(">*Generated callout-like markdown*");
dv.span(`Found ${systems.length} systems`);
dv.el("br");
>```

Markdown between callouts.

> [!info]- Expanded lifecycle status
>```dataviewjs
dv.header(3, "Other systems");
dv.paragraph("---");
>```

Markdown after both callouts.
