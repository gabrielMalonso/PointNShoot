import { describe, expect, it } from "vitest";
import { buildElementContext } from "../../src/shared/metadata";

describe("buildElementContext", () => {
  it("extracts selectors, accessible name, sibling stats and redacted text", () => {
    document.body.innerHTML = `
      <main>
        <button class="chip">Cancelar</button>
        <button class="chip primary" data-testid="profile-save" aria-label="Salvar alteracoes">Salvar ana@example.com</button>
        <button class="chip">Excluir</button>
      </main>
    `;
    const button = document.querySelector(".primary") as HTMLElement;
    button.getBoundingClientRect = () =>
      ({
        x: 20,
        y: 30,
        width: 120,
        height: 40,
        top: 30,
        left: 20,
        right: 140,
        bottom: 70,
        toJSON: () => ({}),
      }) as DOMRect;

    const context = buildElementContext(button, {
      url: "https://example.com/edit?token=secret&tab=profile",
      title: "Teste",
    });

    expect(context.shortSelector).toBe('button[data-testid="profile-save"]');
    expect(context.cssPath).toBe('button[data-testid="profile-save"]');
    expect(context.role).toBe("button");
    expect(context.accessibleName).toBe("Salvar alteracoes");
    expect(context.visibleText).toContain("[email]");
    expect(context.url).toContain("token=%5Bredigido%5D");
    expect(context.similarSiblingCount).toBe(1);
    expect(context.boundingRect).toEqual({ x: 20, y: 30, width: 120, height: 40 });
  });
});
