import { createCn } from "cn/config";

// Registers our custom text-size and spacing tokens (01-design-system.md §4.1b, §9.3)
// so class merging classifies them correctly instead of silently dropping one
// side of a conflict, e.g. cn("text-body-sm", "text-neutral-50").
export const cn = createCn({
  extend: {
    theme: {
      spacing: ["tap"],
    },
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "body-sm", "control", "otp"] }],
    },
  },
});
