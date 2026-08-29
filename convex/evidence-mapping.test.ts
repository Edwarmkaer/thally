import { describe, expect, test } from "vitest";
import { toEvidenceRows } from "./evidence";

describe("toEvidenceRows", () => {
  test("toma url y título de metadata, y deriva la fuente del hostname", () => {
    const rows = toEvidenceRows(
      [
        {
          metadata: {
            url: "https://www.gob.pe/institucion/inei/noticias/1399446",
            title: "INEI: población del Perú",
          },
          markdown: "El Perú totalizó 34 millones 157 mil habitantes.",
        },
      ],
      3,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("gob.pe");
    expect(rows[0].title).toBe("INEI: población del Perú");
    expect(rows[0].excerpt).toContain("34 millones");
  });

  test("descarta items sin url y respeta el límite", () => {
    const rows = toEvidenceRows(
      [
        { markdown: "sin url" },
        { metadata: { url: "https://a.com" } },
        { metadata: { url: "https://b.com" } },
      ],
      1,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].url).toBe("https://a.com");
    // sin título usable, cae en la url
    expect(rows[0].title).toBe("https://a.com");
  });

  test("no explota con una respuesta que no es lista", () => {
    expect(toEvidenceRows({ error: "boom" }, 3)).toEqual([]);
  });
});
