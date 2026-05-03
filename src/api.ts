export interface GitHubFile {
  name: string;
  path: string;
  download_url: string;
  type: string;
}

const OWNER = "d453hj743";
const REPO = "lyrics";
const BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

export async function fetchLyricsList(): Promise<GitHubFile[]> {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error("Failed to fetch lyrics list");
  const data: GitHubFile[] = await response.json();
  
  // Filter for markdown files and exclude README.md
  return data.filter(
    (file) => file.name.endsWith(".md") && file.name.toLowerCase() !== "readme.md"
  );
}

export async function fetchLyricsContent(downloadUrl: string): Promise<string> {
  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error("Failed to fetch lyrics content");
  return await response.text();
}
