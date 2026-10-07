import type { Route } from "../data/types";

export function parseRoute(hash: string): Route {
  const h = hash.replace(/^#\/?/, "").split("?")[0];
  if (h === "ciyu" || h.startsWith("ciyu/")) return "ciyu";
  if (h === "gexu" || h.startsWith("gexu/")) return "gexu";
  if (h === "kejia" || h.startsWith("kejia/")) return "kejia";
  return "hall";
}

export function go(route: Route): void {
  const map: Record<Route, string> = {
    hall: "#/",
    ciyu: "#/ciyu",
    gexu: "#/gexu",
    kejia: "#/kejia",
  };
  window.location.hash = map[route];
}
