import base from "./commitlint.config.js";

// A pull request title is a commit header on its own: it has no body and
// carries no trailers.
const titleConfig = {
  ...base,
  rules: {
    ...base.rules,
    "body-empty": [0],
    "blueprint-change-trailer": [0],
  },
};

export default titleConfig;
