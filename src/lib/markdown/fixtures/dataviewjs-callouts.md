# Callouts

> [!info] Standard callout
>
> ```dataviewjs
> dv.paragraph("Standard callout output");
> ```

Between the callouts.

> [!example]- Folded callout

> ```dataviewjs
> dv.header(4, "Folded output");
> dv.paragraph("Rendered while folded");
> ```
>
> Ordinary markdown between plugin blocks.
>
> | Kind | Count |
> | --- | --- |
> | Example | 1 |
>
> ```dataview
> LIST file.link
> FROM ""
> ```
>
> - A normal list after Dataview
> - The next block must still be discovered
>
> ```dataviewjs
> dv.paragraph("Second folded output");
> ```

After the callouts.
