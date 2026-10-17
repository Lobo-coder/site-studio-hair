import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/** Imagem que aparece quando o link é compartilhado (WhatsApp, Instagram…). */
export const alt = "Studio Hair Premium · Agende online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(path.join(process.cwd(), "public", "logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 70,
          background: "radial-gradient(ellipse at top right, #3a2c14 0%, #17130e 55%, #0d0b08 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={430} height={491} alt="" />
        <div style={{ display: "flex", flexDirection: "column", color: "#ffffff" }}>
          <div style={{ fontSize: 58, lineHeight: 1.1 }}>Agende seu</div>
          <div style={{ fontSize: 58, lineHeight: 1.1 }}>horário online</div>
          <div style={{ marginTop: 24, fontSize: 28, color: "#d4af5f" }}>Manaíra · João Pessoa</div>
        </div>
      </div>
    ),
    size,
  );
}
