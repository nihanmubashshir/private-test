import { ImageResponse } from "next/og";

/** The gold rounded-square brand mark, rendered full-bleed on the neutral-950 ground. */
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090a",
        }}
      >
        <div
          style={{
            width: "62%",
            height: "62%",
            borderRadius: "22%",
            background: "#c9a349",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
