export type Station = { name: string; crs: string };

// Parse the unmodified upstream CSV, including quoted commas and escaped quotes.
export function parseStations(csv: string): Station[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === "," && !quoted) { row.push(field); field = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && csv[i + 1] === "\n") i++;
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.slice(1).filter(row => row[0] && /^[A-Z]{3}$/.test(row[3] || ""))
    .map(row => ({ name: row[0], crs: row[3] }));
}
export async function loadStations(): Promise<Station[]> {
  const response = await fetch("/rail/stations.csv");
  if (!response.ok) throw new Error("Station directory unavailable");
  return parseStations(await response.text());
}
