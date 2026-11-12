/** Small web components for the browser tests: open and closed shadow trees, a scroller and a `display: contents` host. */

const style = `<style>
  button { font: inherit; padding: 8px 14px; margin: 4px; }
  #box { height: 120px; overflow: auto; border: 1px solid #888; width: 220px; }
  #box div { padding: 10px 6px; }
</style>`;

const define = (name: string, build: (root: ShadowRoot) => void, mode: ShadowRootMode = "open"): void => {
  customElements.define(
    name,
    class extends HTMLElement {
      connectedCallback(): void {
        if (this.shadowRoot) return;
        build(this.attachShadow({ mode }));
      }
    },
  );
};

define("x-card", (root) => {
  root.innerHTML = `${style}<button data-tour="save">Save</button><button data-tour="hidden" style="display:none">Hidden</button>`;
});

define("x-scroller", (root) => {
  const rows = Array.from({ length: 14 }, (_, i) =>
    i === 6 ? `<div><button data-tour="deep">Row seven</button></div>` : `<div>Row ${i + 1}</div>`,
  ).join("");
  root.innerHTML = `${style}<div id="box">${rows}</div>`;
});

define("x-wrap", (root) => {
  root.innerHTML = `${style}<button data-tour="wrapped">Wrapped</button>`;
});

define(
  "x-closed",
  (root) => {
    root.innerHTML = `${style}<button data-tour="shut">Shut</button>`;
  },
  "closed",
);

define("x-launcher", (root) => {
  root.innerHTML = `${style}<button id="launch">Start the tour</button>`;
  root.getElementById("launch")?.addEventListener("click", () => void window.__start("save"));
});
