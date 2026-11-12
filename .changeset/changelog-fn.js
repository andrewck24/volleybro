async function getReleaseLine(changeset) {
  return changeset.summary.trim();
}

async function getDependencyReleaseLine() {
  return "";
}

export { getReleaseLine, getDependencyReleaseLine };
