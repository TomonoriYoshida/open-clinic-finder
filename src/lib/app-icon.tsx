import { ImageResponse } from "next/og";

/**
 * The home-screen icon: a white cross on teal, filling the square so it also
 * works as a maskable icon (the cross stays inside the safe zone).
 */
export function appIcon(size: number): ImageResponse {
  const bar = Math.round(size * 0.14);
  const length = Math.round(size * 0.5);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f766e",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", width: length, height: bar, background: "#ffffff", borderRadius: bar / 4 }} />
        <div style={{ position: "absolute", width: bar, height: length, background: "#ffffff", borderRadius: bar / 4 }} />
      </div>
    ),
    { width: size, height: size },
  );
}
