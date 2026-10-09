import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ogImage, siteName, siteUrl } from "@/lib/site";

// Rendered to out/og.png at build time. Not the opengraph-image file
// convention: a static export writes that without an extension, and the
// server would not know to send it as image/png.
export const dynamic = "force-static";

// Noto Sans JP subset to the characters of this image (the default font has
// no Japanese glyphs). After changing the text, regenerate both files from
// https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400&text=... (and @700);
// without a browser User-Agent, Google Fonts serves TrueType, which ImageResponse needs.
const fontDirectory = join(process.cwd(), "src/app/fonts");
const regular = await readFile(join(fontDirectory, "og-noto-sans-jp-400.ttf"));
const bold = await readFile(join(fontDirectory, "og-noto-sans-jp-700.ttf"));

const ways = ["現在地から", "駅名・住所から", "日時を指定して"];

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background: "#0f766e",
          color: "#ffffff",
          fontFamily: "Noto Sans JP",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 22,
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", width: 56, height: 16, borderRadius: 4, background: "#0f766e" }} />
              <div style={{ position: "absolute", width: 16, height: 56, borderRadius: 4, background: "#0f766e" }} />
            </div>
            <div style={{ marginLeft: 32, fontSize: 76, fontWeight: 700 }}>{siteName}</div>
          </div>
          <div style={{ marginTop: 48, fontSize: 36 }}>近くで、いま開いている病院・診療所・歯科・薬局を探せます</div>
          <div style={{ display: "flex", marginTop: 36 }}>
            {ways.map((way) => (
              <div
                key={way}
                style={{
                  marginRight: 20,
                  padding: "10px 28px",
                  borderRadius: 999,
                  background: "rgba(255, 255, 255, 0.16)",
                  border: "2px solid rgba(255, 255, 255, 0.5)",
                  fontSize: 30,
                  fontWeight: 700,
                }}
              >
                {way}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "rgba(255, 255, 255, 0.8)" }}>
          <div>診療時間は厚生労働省「医療情報ネット」の公開情報です</div>
          <div>{new URL(siteUrl).host}</div>
        </div>
      </div>
    ),
    {
      width: ogImage.width,
      height: ogImage.height,
      fonts: [
        { name: "Noto Sans JP", data: regular, weight: 400, style: "normal" },
        { name: "Noto Sans JP", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
