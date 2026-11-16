import { useEffect } from "react";

export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    onDone();
  }, [onDone]);

  return null;
}
