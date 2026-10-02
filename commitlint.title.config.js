import base from "./commitlint.config.js";

const titleConfig = {
  ...base,
  rules: {
    ...base.rules,
    "body-empty": [0],
    "blueprint-change-trailer": [0],
  },
};

export default titleConfig;
