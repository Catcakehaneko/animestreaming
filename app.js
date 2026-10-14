// List of API mirrors to try in sequence
const API_ENDPOINTS = [
    "https://anikototvapi.vercel.app/api",               // Primary AniKoto API Vercel Mirror
    "https://api.jikan.moe/v4",                          // Jikan (MAL Backup for metadata)
    "https://corsproxy.io/?https://anikotoapi.site"      // CORS-proxied Anikoto Mirror
];

const MEGAPLAY_BASE = "https://megaplay.buzz/stream/s-2";
let currentEmbedId = "";

/**
 * Helper function to safely fetch JSON from fallback sources
 */
async function fetchWithFallback(path) {
    // 1. Try AniKoto Vercel API
    try {
        const response = await fetch(`${API_ENDPOINTS[0]}${path}`);
        if (response.ok) return await response.json();
    } catch (e) {
        console.warn("Primary API mirror failed, trying secondary CORS proxy...", e);
    }

    // 2. Try CORS Proxy on secondary mirror
    try {
        const response = await fetch(`${API_ENDPOINTS[2]}${path}`);
        if (response.ok) return await response.json();
    } catch (e) {
        console.warn("Secondary API proxy failed...", e);
    }

    throw new Error("All API endpoints unreachable");
}

/**
 * Load Recent / Trending Catalog
 */
async function loadHome() {
    const container = document.getElementById("mainContainer");
    container.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Recent & Trending Anime</h2>
        <div id="grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"></div>
    `;
    
    try {
        // Fetch trending/recent anime
        const data = await fetchWithFallback("");
        const grid = document.getElementById("grid");
        
        // Normalize response payload across mirrors
        const animeList = data.trending || data.spotlight || data.data || [];

        if (animeList.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-slate-400">No catalog data available right now.</p>`;
            return;
        }

        grid.innerHTML = animeList.map(anime => {
            const title = anime.name || anime.title || "Unknown Title";
            const poster = anime.poster || anime.image || anime.images?.jpg?.image_url || "";
            const id = anime.id || anime.mal_id;

            return `
                <div onclick="loadAnimeDetails('${id}')" class="bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition border border-slate-800 hover:border-red-500">
                    <img src="${poster}" alt="${title}" class="w-full h-64 object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
                    <div class="p-3">
                        <h3 class="font-semibold text-sm truncate">${title}</h3>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        container.innerHTML = `
            <div class="bg-slate-900 border border-red-500/30 p-6 rounded-lg text-center my-10 max-w-md mx-auto">
                <h3 class="text-red-500 font-bold text-lg mb-2">Unable to Load Catalog</h3>
                <p class="text-sm text-slate-400 mb-4">Public API mirrors are rate limited or blocked by your browser's CORS policy.</p>
                <button onclick="loadHome()" class="bg-red-600 px-4 py-2 rounded text-sm font-semibold hover:bg-red-500">Retry Request</button>
            </div>
        `;
    }
}

/**
 * Load Specific Anime Details and Episodes
 */
async function loadAnimeDetails(id) {
    const container = document.getElementById("mainContainer");
    container.innerHTML = `<p class="text-center py-20 text-slate-400">Loading series details and episodes...</p>`;

    try {
        const data = await fetchWithFallback(`/anime/${id}`);
        const anime = data.data || data;
        
        const episodesRes = await fetchWithFallback(`/episodes/${id}`);
        const episodes = episodesRes.episodes || episodesRes.data || [];
        
        const firstEp = episodes[0];
        currentEmbedId = firstEp ? (firstEp.episode_embed_id || firstEp.episodeId || firstEp.id) : id;

        container.innerHTML = `
            <button onclick="loadHome()" class="mb-4 text-sm bg-slate-800 px-3 py-1 rounded hover:bg-slate-700">&larr; Back to Catalog</button>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2">
                    <div class="aspect-video bg-black rounded-lg overflow-hidden shadow-lg border border-slate-800">
                        <iframe id="playerFrame" src="${MEGAPLAY_BASE}/${currentEmbedId}/sub" class="w-full h-full border-0" allowfullscreen></iframe>
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <h2 class="text-xl font-bold" id="currentEpTitle">${firstEp ? `Episode ${firstEp.number \vert{}\vert{} 1}:${firstEp.title || ''}` : (anime.name || 'Anime Stream')}</h2>
                        <select id="serverSelect" onchange="changeServer()" class="bg-slate-800 text-xs px-3 py-1.5 rounded border border-slate-700">
                            <option value="megaplay-sub">MegaPlay (SUB)</option>
                            <option value="megaplay-dub">MegaPlay (DUB)</option>
                        </select>
                    </div>
                </div>
                <div class="bg-slate-900 p-4 rounded-lg h-[500px] flex flex-col border border-slate-800">
                    <h3 class="font-semibold mb-3 border-b border-slate-800 pb-2">Episodes (${episodes.length})</h3>
                    <div class="overflow-y-auto flex-1 space-y-1 pr-2">
                        ${episodes.map(ep => {
                            const epId = ep.episode_embed_id || ep.episodeId || ep.id;
                            const epNum = ep.number || ep.episode || 1;
                            const epTitle = ep.title ? `Ep ${epNum}:${ep.title}` : `Episode ${epNum}`;
                            return `
                                <button onclick="playEpisode('${epId}', '${epTitle.replace(/'/g, "\\'")}')" class="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm truncate">
                                    ${epTitle}
                                </button>
                            `;
                        }).join('') || '<p class="text-slate-500 text-sm">No episodes found.</p>'}
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<p class="text-red-500 text-center py-20">Could not fetch series episodes.</p>`;
    }
}

/**
 * Handle Episode Change
 */
function playEpisode(embedId, title) {
    currentEmbedId = embedId;
    document.getElementById("currentEpTitle").innerText = title;
    updatePlayerFrame();
}

/**
 * Handle Server/Audio Mode Switching
 */
function changeServer() {
    updatePlayerFrame();
}

function updatePlayerFrame() {
    if (!currentEmbedId) return;
    const mode = document.getElementById("serverSelect")?.value || "megaplay-sub";
    const iframe = document.getElementById("playerFrame");

    if (mode === "megaplay-dub") {
        iframe.src = `https://megaplay.buzz/stream/s-2/${currentEmbedId}/dub`;
    } else {
        iframe.src = `${MEGAPLAY_BASE}/${currentEmbedId}/sub`;
    }
}

/**
 * Handle Search Queries
 */
async function handleSearch() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return;
    
    const container = document.getElementById("mainContainer");
    container.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Search Results for "${query}"</h2>
        <div id="grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"></div>
    `;
    
    try {
        const data = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}`);
        const results = data.animes || data.data || [];
        const grid = document.getElementById("grid");

        if (results.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-slate-400">No anime matching "${query}" were found.</p>`;
            return;
        }

        grid.innerHTML = results.map(anime => `
            <div onclick="loadAnimeDetails('${anime.id || anime.mal_id}')" class="bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition border border-slate-800">
                <img src="${anime.poster || anime.image || ''}" alt="${anime.name || anime.title}" class="w-full h-64 object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
                <div class="p-3">
                    <h3 class="font-semibold text-sm truncate">${anime.name || anime.title}</h3>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<p class="text-red-500">Search query failed. Check connection or try another term.</p>`;
    }
}

// Initializer
loadHome();
