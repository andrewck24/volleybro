import base from "./commitlint.config.js";

const titleConfig = {
  ...base,
  rules: {
    ...base.rules,
    "body-empty": [0],
    "change-branch-trailer": [0],
    "header-max-length": [0],
  },
};

export default titleConfig;
