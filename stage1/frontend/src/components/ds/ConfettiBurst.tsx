import dotYellow from "../../assets/confetti-dot-yellow.svg";
import trianglePink from "../../assets/confetti-triangle-pink.svg";
import triangleBlue from "../../assets/confetti-triangle-blue.svg";
import sparkle from "../../assets/sparkle.svg";

const ASSETS: Record<string, string> = {
  "confetti-dot-yellow.svg": dotYellow,
  "confetti-triangle-pink.svg": trianglePink,
  "confetti-triangle-blue.svg": triangleBlue,
  "sparkle.svg": sparkle,
};

export interface ConfettiPiece {
  src: string;
  w: number;
  top: string;
  left: string;
}

// Decorative confetti scattered behind a hero/celebration area. Parent must be
// position:relative. Purely decorative — pointer-events off, aria-hidden.
export function ConfettiBurst({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pieces.map((p, i) => {
        const url = ASSETS[p.src];
        if (!url) return null;
        return (
          <img
            key={i}
            src={url}
            alt=""
            style={{ position: "absolute", top: p.top, left: p.left, width: p.w, height: "auto" }}
          />
        );
      })}
    </div>
  );
}
