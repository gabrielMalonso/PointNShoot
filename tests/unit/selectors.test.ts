import { describe, expect, it } from "vitest";
import { getCssPath, getNthOfTypePath, getShortSelector } from "../../src/shared/selectors";

describe("selector helpers", () => {
  it("builds a compact selector from tag id and classes", () => {
    document.body.innerHTML = `<button id="save-now" class="primary cta large">Salvar</button>`;
    const button = document.querySelector("button");

    expect(button).toBeTruthy();
    expect(getShortSelector(button!)).toBe("button#save-now.primary.cta.large");
  });

  it("builds structural paths when no id is available", () => {
    document.body.innerHTML = `
      <main>
        <section class="cards">
          <article class="card"></article>
          <article class="card selected"><h2>Titulo</h2></article>
        </section>
      </main>
    `;
    const heading = document.querySelector("h2");

    expect(heading).toBeTruthy();
    expect(getCssPath(heading!)).toContain("article.card.selected:nth-of-type(2) > h2:nth-of-type(1)");
    expect(getNthOfTypePath(heading!)).toContain("article:nth-of-type(2) > h2:nth-of-type(1)");
  });

  it("prefers stable product attributes over generated classes", () => {
    document.body.innerHTML = `
      <main>
        <section data-component="AgendaToolbar">
          <button data-testid="agenda-view-week" class="h-9 rounded-md px-4">Semana</button>
          <span class="text-[1.65rem] font-semibold leading-none">25</span>
        </section>
      </main>
    `;
    const button = document.querySelector("button");
    const span = document.querySelector("span");

    expect(button).toBeTruthy();
    expect(span).toBeTruthy();
    expect(getShortSelector(button!)).toBe('button[data-testid="agenda-view-week"]');
    expect(getShortSelector(span!)).toBe('section[data-component="AgendaToolbar"]');
    expect(getCssPath(span!)).toContain('section[data-component="AgendaToolbar"] > span');
  });
});
