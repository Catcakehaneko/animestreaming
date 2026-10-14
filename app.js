// Base embed URL for MegaPlay
const MEGAPLAY_BASE = "https://megaplay.buzz/stream/mal";

let currentMalId = null;
let currentEpNum = 1;

/**
 * Universal safe fetcher with failover logic
 */
async function fetchAnimeData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (err) {
        console.warn("Primary API fetch failed, attempting fallback...", err);
        return null;
    }
}

/**
 * Render Home Catalog
 */
async function loadHome() {
    const container = document.getElementById("mainContainer");
    if (!container) return;

    container.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Popular Anime Catalog</h2>
        <div id="grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div class="col-span-full text-center py-10 text-slate-400">Loading anime catalog...</div>
        </div>
    `;

    // Attempt primary fetch via Jikan (MyAnimeList)
    let data = await fetchAnimeData("https://api.jikan.moe/v4/top/anime?limit=24");
    
    // Fallback if rate limited
    if (!data || !data.data) {
        await new Promise(r => setTimeout(r, 1000)); // Brief delay before retrying
        data = await fetchAnimeData("https://api.jikan.moe/v4/seasons/now?limit=24");
    }

    const grid = document.getElementById("grid");
    if (!data || !data.data || data.data.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-slate-900 border border-slate-800 p-8 rounded-lg text-center">
                <p class="text-red-400 font-semibold mb-2">Unable to connect to metadata servers.</p>
                <p class="text-sm text-slate-400 mb-4">Public API mirrors are temporarily rate-limited. Please wait a moment and try again.</p>
                <button onclick="loadHome()" class="bg-red-600 px-4 py-2 rounded text-sm font-semibold hover:bg-red-500 transition">Reload Catalog</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = data.data.map(anime => {
        const title = anime.title || anime.title_english || "Unknown Title";
        const image = anime.images?.jpg?.image_url || "https://via.placeholder.com/300x400?text=No+Cover";
        const malId = anime.mal_id;

        return `
            <div onclick="loadAnimeDetails(${malId})" class="bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition border border-slate-800 hover:border-red-500 flex flex-col">
                <img src="${image}" alt="${title}" class="w-full h-64 object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
                <div class="p-3 flex-1 flex flex-col justify-between">
                    <h3 class="font-semibold text-sm line-clamp-2 text-slate-100">${title}</h3>
                    <span class="text-xs text-slate-400 mt-2 block">${anime.episodes ? anime.episodes + ' Ep' : 'Ongoing'}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Load Specific Anime Details and Player Frame
 */
async function loadAnimeDetails(malId) {
    currentMalId = malId;
    currentEpNum = 1;

    const container = document.getElementById("mainContainer");
    container.innerHTML = `<div class="text-center py-20 text-slate-400">Loading series info & episodes...</div>`;

    const data = await fetchAnimeData(`https://api.jikan.moe/v4/anime/${malId}`);
    
    if (!data || !data.data) {
        container.innerHTML = `
            <div class="text-center py-20">
                <p class="text-red-400 mb-4">Could not load series details from metadata provider.</p>
                <button onclick="loadHome()" class="bg-slate-800 px-4 py-2 rounded text-sm hover:bg-slate-700">&larr; Return to Home</button>
            </div>
        `;
        return;
    }

    const anime = data.data;
    const totalEp = anime.episodes || 24;
    const title = anime.title || anime.title_english;

    container.innerHTML = `
        <button onclick="loadHome()" class="mb-4 text-sm bg-slate-800 px-3 py-1.5 rounded hover:bg-slate-700 border border-slate-700 transition">&larr; Back to Catalog</button>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Player Section -->
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

            <!-- Episodes List -->
            <div class="bg-slate-900 p-4 rounded-lg h-[480px] flex flex-col border border-slate-800">
                <h3 class="font-semibold mb-3 border-b border-slate-800 pb-2 text-sm text-slate-300">Episodes (${totalEp})</h3>
                <div class="overflow-y-auto flex-1 space-y-1.5 pr-1">
                    ${Array.from({ length: totalEp }, (_, i) => i + 1).map(num => `
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
 * Switch Episode
 */
function playEpisode(epNum, title) {
    currentEpNum = epNum;
    const titleEl = document.getElementById("currentEpTitle");
    if (titleEl) titleEl.innerText = `${title} - Episode ${epNum}`;
    updatePlayerFrame();
}

/**
 * Update Player Iframe Stream Source
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
            <div class="col-span-full text-center py-10 text-slate-400">Searching anime catalog...</div>
        </div>
    `;

    const data = await fetchAnimeData(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=20`);
    const grid = document.getElementById("grid");

    if (!data || !data.data || data.data.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-slate-400 text-center py-10">No results found matching "${query}".</p>`;
        return;
    }

    grid.innerHTML = data.data.map(anime => {
        const title = anime.title || anime.title_english;
        const image = anime.images?.jpg?.image_url || "https://via.placeholder.com/300x400?text=No+Cover";
        return `
            <div onclick="loadAnimeDetails(${anime.mal_id})" class="bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition border border-slate-800">
                <img src="${image}" alt="${title}" class="w-full h-64 object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
                <div class="p-3">
                    <h3 class="font-semibold text-sm truncate">${title}</h3>
                </div>
            </div>
        `;
    }).join('');
}

// Initial Boot
loadHome();
