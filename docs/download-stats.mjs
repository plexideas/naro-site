const endpoint = "https://api.github.com/repos/plexideas/naro/releases";

export async function fetchReleases(fetcher = fetch) {
  const releases = [];
  for (let page = 1; ; page++) {
    const response = await fetcher(`${endpoint}?per_page=100&page=${page}`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        throw new Error("GitHub’s request limit was reached. Try again later.");
      }
      throw new Error(`GitHub returned an error (${response.status}). Try again later.`);
    }
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("GitHub returned an unexpected response.");
    releases.push(...batch);
    if (batch.length < 100) return releases;
  }
}

export function summarize(releases) {
  const rows = releases.filter((release) => !release.draft).map((release) => {
    const row = { version: release.tag_name, dmg: 0, zip: 0 };
    for (const asset of release.assets) {
      const format = /^Naro-.+\.(dmg|zip)$/i.exec(asset.name)?.[1].toLowerCase();
      if (!format || asset.state !== "uploaded") continue;
      if (!Number.isSafeInteger(asset.download_count) || asset.download_count < 0) {
        throw new Error("GitHub returned an invalid download count.");
      }
      row[format] += asset.download_count;
    }
    return row;
  });
  return {
    rows,
    dmg: rows.reduce((sum, row) => sum + row.dmg, 0),
    zip: rows.reduce((sum, row) => sum + row.zip, 0),
  };
}
