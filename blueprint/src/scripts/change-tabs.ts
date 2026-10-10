function initializeTabList(container: HTMLElement) {
  if (container.dataset.tabsInitialized === "true") return;
  container.dataset.tabsInitialized = "true";

  const tabs = Array.from(
    container.querySelectorAll<HTMLButtonElement>("[role=tab]"),
  );
  const panels = new Map(
    Array.from(container.querySelectorAll<HTMLElement>("[role=tabpanel]")).map(
      (panel) => [panel.id, panel],
    ),
  );
  if (tabs.length === 0) return;

  const templates = new Map(
    Array.from(
      container.querySelectorAll<HTMLTemplateElement>(
        "template[data-blueprint-tab-template]",
      ),
    ).map((template) => [
      template.dataset.blueprintTabTemplate ?? "",
      template,
    ]),
  );
  let activePanel = Array.from(panels.values()).find((panel) => !panel.hidden);
  if (!activePanel) return;

  const initialContent = activePanel.querySelector<HTMLElement>(
    ":scope > [data-blueprint-tab-content]",
  );
  if (initialContent && !templates.has(activePanel.id)) {
    const template = document.createElement("template");
    template.dataset.blueprintTabTemplate = activePanel.id;
    template.content.append(initialContent.cloneNode(true));
    container.append(template);
    templates.set(activePanel.id, template);
  }

  const setActive = (tab: HTMLButtonElement, shouldUpdateHash: boolean) => {
    const nextPanel = panels.get(tab.getAttribute("aria-controls") ?? "");
    const currentPanel = activePanel;
    if (nextPanel && currentPanel && nextPanel !== currentPanel) {
      const nextTemplate = templates.get(nextPanel.id);
      const content = nextTemplate?.content.cloneNode(true);
      if (content) nextPanel.replaceChildren(content);
      else nextPanel.replaceChildren();
      currentPanel.replaceChildren();
      activePanel = nextPanel;
    }

    for (const candidate of tabs) {
      const isActive = candidate === tab;
      candidate.setAttribute("aria-selected", String(isActive));
      candidate.tabIndex = isActive ? 0 : -1;
      candidate.dataset.state = isActive ? "active" : "inactive";
      const panel = panels.get(candidate.getAttribute("aria-controls") ?? "");
      if (panel) panel.hidden = !isActive;
    }
    if (shouldUpdateHash) {
      history.replaceState(
        null,
        "",
        `${location.pathname}${location.search}#${tab.dataset.tabAnchor}`,
      );
    }
  };

  const selectHash = () => {
    const matching = tabs.find(
      (tab) => tab.dataset.tabAnchor === location.hash.slice(1),
    );
    if (matching) setActive(matching, false);
  };

  container.addEventListener("click", (event) => {
    const tab = (event.target as Element).closest<HTMLButtonElement>(
      "[role=tab]",
    );
    if (tab && tabs.includes(tab)) setActive(tab, true);
  });
  container.addEventListener("keydown", (event) => {
    const current = (event.target as Element).closest<HTMLButtonElement>(
      "[role=tab]",
    );
    if (!current) return;
    const index = tabs.indexOf(current);
    const nextIndex =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    tabs[nextIndex].focus();
    setActive(tabs[nextIndex], true);
  });
  window.addEventListener("hashchange", selectHash);
  selectHash();
}

function initializePage() {
  document
    .querySelectorAll<HTMLElement>("[data-blueprint-tabs]")
    .forEach(initializeTabList);
}

document.addEventListener("DOMContentLoaded", initializePage);
document.addEventListener("astro:page-load", initializePage);
