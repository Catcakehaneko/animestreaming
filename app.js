// Base embed URL for MegaPlay player
const MEGAPLAY_BASE = "https://megaplay.buzz/stream/mal";

let currentMalId = null;
let currentEpNum = 1;

/**
 * Fetch data safely using AniList GraphQL API (Fast, No Rate Limits, Full CORS)
 */
async function fetchAniList(query, variables = {}) {
    try {
        const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({ query, variables })
        });

        if (!res.ok) throw new Error(`AniList returned status ${res.status}`);
        const data = await res.json();
        return data.data;
    } catch (err) {
        console.error("AniList Fetch Error:", err);
        return null;
    }
}

/**
 * Load Home Catalog
 */
async function loadHome() {
    const container = document.getElementById("mainContainer");
    if (!container) return;

    container.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Trending Anime Catalog</h2>
        <div id="grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div class="col-span-full text-center py-20 text-slate-400">Loading catalog from AniList...</div>
        </div>
    `;

    const query = `
    query {
      Page(page: 1, perPage: 20) {
        media(type: ANIME, sort: TRENDING_DESC) {
          id
          idMal
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          episodes
        }
      }
    }`;

    const data = await fetchAniList(query);
    const grid = document.getElementById("grid");

    if (!data || !data.Page || !data.Page.media) {
        grid.innerHTML = `
            <div class="col-span-full bg-slate-900 border border-red-500/30 p-8 rounded-lg text-center">
                <p class="text-red-400 font-semibold mb-2">Failed to load catalog.</p>
                <p class="text-sm text-slate-400 mb-4">Please check your internet connection or ad-blocker settings.</p>
                <button onclick="loadHome()" class="bg-red-600 px-4 py-2 rounded text-sm font-semibold hover:bg-red-500">Retry</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = data.Page.media.map(anime => {
        const title = anime.title.english || anime.title.romaji || "Unknown Title";
        const cover = anime.coverImage.large;
        const malId = anime.idMal;

        return `
            <div onclick="loadAnimeDetails(${malId}, '${title.replace(/'/g, "\\'")}', ${anime.episodes || 12})" class="bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition border border-slate-800 hover:border-red-500 flex flex-col">
                <img src="${cover}" alt="${title}" class="w-full h-64 object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
                <div class="p-3 flex-1 flex flex-col justify-between">
                    <h3 class="font-semibold text-sm line-clamp-2 text-slate-100">${title}</h3>
                    <span class="text-xs text-slate-400 mt-2 block">${anime.episodes ? anime.episodes + ' Episodes' : 'Ongoing'}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Load Player View & Episodes Sidebar
 */
function loadAnimeDetails(malId, title, totalEp) {
    if (!malId) {
        alert("This title does not have a valid MAL ID mapping on MegaPlay.");
        return;
    }

    currentMalId = malId;
    currentEpNum = 1;
    const epCount = totalEp || 12;

    const container = document.getElementById("mainContainer");
    container.innerHTML = `
        <button onclick="loadHome()" class="mb-4 text-sm bg-slate-800 px-3 py-1.5 rounded hover:bg-slate-700 border border-slate-700 transition">&larr; Back to Catalog</button>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Video Frame -->
            <div class="lg:col-span-2">
                <div class="aspect-video bg-black rounded-lg overflow-hidden shadow-lg border border-slate-800">
                    <iframe id="playerFrame" src="${MEGAPLAY_BASE}/${malId}/1/sub" class="w-full h-full border-0" allowfullscreen></iframe>
                </div>
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-2">
                    <h2 class="text-lg font-bold" id="currentEpTitle">${title} - Episode 1</h2>
                    <select id="serverSelect" onchange="updatePlayerFrame()" class="bg-slate-800 text-xs px-3 py-1.5 rounded border border-slate-700 focus:outline-none">
                        <option value="sub">MegaPlay (SUB)</option>
                        <option value="dub">MegaPlay (DUB)</option>
                    </select>
                </div>
            </div>

            <!-- Episode Sidebar -->
            <div class="bg-slate-900 p-4 rounded-lg h-[480px] flex flex-col border border-slate-800">
                <h3 class="font-semibold mb-3 border-b border-slate-800 pb-2 text-sm text-slate-300">Episodes (${epCount})</h3>
                <div class="overflow-y-auto flex-1 space-y-1.5 pr-1">
                    ${Array.from({ length: epCount }, (_, i) => i + 1).map(num => `
                        <button onclick="playEpisode(${num}, '${title.replace(/'/g, "\\'")}')" class="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm truncate border border-transparent hover:border-slate-600 transition">
                            Episode ${num}
                        </button>
                    `).join('')}
                </div>
            </div>

        </div>
    `;
}

/**
 * Handle Episode Selection
 */
function playEpisode(epNum, title) {
    currentEpNum = epNum;
    const titleEl = document.getElementById("currentEpTitle");
    if (titleEl) titleEl.innerText = `${title} - Episode ${epNum}`;
    updatePlayerFrame();
}

/**
 * Update MegaPlay Iframe Source
 */
function updatePlayerFrame() {
    if (!currentMalId) return;
    const mode = document.getElementById("serverSelect")?.value || "sub";
    const iframe = document.getElementById("playerFrame");
    if (iframe) {
        iframe.src = `${MEGAPLAY_BASE}/${currentMalId}/${currentEpNum}/${mode}`;
    }
}

/**
 * Search Functionality
 */
async function handleSearch() {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (!query) return;

    const container = document.getElementById("mainContainer");
    container.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Search Results for "${query}"</h2>
        <div id="grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div class="col-span-full text-center py-20 text-slate-400">Searching catalog...</div>
        </div>
    `;

    const searchQuery = `
    query ($search: String) {
      Page(page: 1, perPage: 20) {
        media(search: $search, type: ANIME) {
          id
          idMal
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          episodes
        }
      }
    }`;

    const data = await fetchAniList(searchQuery, { search: query });
    const grid = document.getElementById("grid");

    if (!data || !data.Page || !data.Page.media || data.Page.media.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-slate-400 text-center py-10">No anime found matching "${query}".</p>`;
        return;
    }

    grid.innerHTML = data.Page.media.map(anime => {
        const title = anime.title.english || anime.title.romaji || "Unknown Title";
        const cover = anime.coverImage.large;
        const malId = anime.idMal;

        return `
            <div onclick="loadAnimeDetails(${malId}, '${title.replace(/'/g, "\\'")}', ${anime.episodes || 12})" class="bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition border border-slate-800">
                <img src="${cover}" alt="${title}" class="w-full h-64 object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
                <div class="p-3">
                    <h3 class="font-semibold text-sm truncate">${title}</h3>
                </div>
            </div>
        `;
    }).join('');
}

// Boot application
loadHome();
