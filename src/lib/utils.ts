import { createCn } from "cn/config";

/**
 * Class merging (clsx + tailwind-merge rules). The Apple text styles in globals.css (@theme
 * --text-*) are registered as font sizes: unknown `text-*` names would otherwise be taken for
 * colours, and merging `text-headline text-white` would silently drop one of them.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["large-title", "title1", "title2", "title3", "headline", "body", "callout", "subhead", "footnote", "caption"] }],
    },
  },
});
