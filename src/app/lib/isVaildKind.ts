// app/lib/isValidKind.ts
export type ProgramKind = "movie" | "tvshow";

export function isValidKind(kind: string | undefined): kind is ProgramKind {
  return kind === "movie" || kind === "tvshow";
}
