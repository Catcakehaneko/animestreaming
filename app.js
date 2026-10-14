const MEGAPLAY_BASE = "https://megaplay.buzz/stream/mal";
let currentMalId = null;
let currentEpNum = 1;

/**
 * Load Top / Popular Anime (via Jikan API)
 */
async function loadHome() {
    const container = document.getElementById("mainContainer");
    container.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Top Anime Library</h2>
        <div id="grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"></div>
    `;
    
    try {
        const res = await fetch("https://api.jikan.moe/v4/top/anime?limit=25");
        if (!res.ok) throw new Error("API Limit reached");
        
        const data = await res.json();
        const grid = document.getElementById("grid");
        const animeList = data.data || [];

        if (animeList.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-slate-400">No catalog data available right now.</p>`;
            return;
        }

        grid.innerHTML = animeList.map(anime => `
            <div onclick="loadAnimeDetails(${anime.mal_id})" class="bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition border border-slate-800 hover:border-red-500">
                <img src="${anime.images.jpg.image_url}" alt="${anime.title}" class="w-full h-64 object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                <div class="p-3">
                    <h3 class="font-semibold text-sm truncate">${anime.title}</h3>
                    <p class="text-xs text-slate-400 mt-1">${anime.episodes ? anime.episodes + ' Episodes' : 'Ongoing'}</p>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <div class="bg-slate-900 border border-red-500/30 p-6 rounded-lg text-center my-10 max-w-md mx-auto">
                <h3 class="text-red-500 font-bold text-lg mb-2">Request Limit Exceeded</h3>
                <p class="text-sm text-slate-400 mb-4">The public MAL API rate limited the request. Please wait 3 seconds and retry.</p>
                <button onclick="loadHome()" class="bg-red-600 px-4 py-2 rounded text-sm font-semibold hover:bg-red-500">Retry Catalog</button>
            </div>
        `;
    }
}

/**
 * Load Series Info & Episode Selection
 */
async function loadAnimeDetails(malId) {
    currentMalId = malId;
    currentEpNum = 1;
    
    const container = document.getElementById("mainContainer");
    container.innerHTML = `<p class="text-center py-20 text-slate-400">Loading series info...</p>`;

    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
        const data = await res.json();
        const anime = data.data;
        const totalEp = anime.episodes || 24;

        container.innerHTML = `
            <button onclick="loadHome()" class="mb-4 text-sm bg-slate-800 px-3 py-1 rounded hover:bg-slate-700">&larr; Back to Catalog</button>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Video Player Area -->
                <div class="lg:col-span-2">
                    <div class="aspect-video bg-black rounded-lg overflow-hidden shadow-lg border border-slate-800">
                        <iframe id="playerFrame" src="${MEGAPLAY_BASE}/${malId}/1/sub" class="w-full h-full border-0" allowfullscreen></iframe>
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <h2 class="text-xl font-bold" id="currentEpTitle">${anime.title} - Episode 1</h2>
                        <select id="serverSelect" onchange="updatePlayerFrame()" class="bg-slate-800 text-xs px-3 py-1.5 rounded border border-slate-700">
                            <option value="sub">MegaPlay (SUB)</option>
                            <option value="dub">MegaPlay (DUB)</option>
                        </select>
                    </div>
                </div>

                <!-- Episode Sidebar List -->
                <div class="bg-slate-900 p-4 rounded-lg h-[500px] flex flex-col border border-slate-800">
                    <h3 class="font-semibold mb-3 border-b border-slate-800 pb-2">Episodes (${totalEp})</h3>
                    <div class="overflow-y-auto flex-1 space-y-1 pr-2">
                        ${Array.from({ length: totalEp }, (_, i) => i + 1).map(num => `
                            <button onclick="playEpisode(${num}, '${anime.title.replace(/'/g, "\\'")}')" class="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm truncate">
                                Episode ${num}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<p class="text-red-500 text-center py-20">Failed to load series metadata.</p>`;
    }
}

/**
 * Handle Episode Change
 */
function playEpisode(epNum, title) {
    currentEpNum = epNum;
    document.getElementById("currentEpTitle").innerText = `${title} - Episode ${epNum}`;
    updatePlayerFrame();
}

/**
 * Update MegaPlay Player URL
 */
function updatePlayerFrame() {
    if (!currentMalId) return;
    const mode = document.getElementById("serverSelect")?.value || "sub";
    document.getElementById("playerFrame").src = `${MEGAPLAY_BASE}/${currentMalId}/${currentEpNum}/${mode}`;
}

/**
 * Search Anime Catalog
 */
async function handleSearch() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return;
    
    const container = document.getElementById("mainContainer");
    container.innerHTML = `<h2 class="text-2xl font-bold mb-4">Search Results for "${query}"</h2><div id="grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"></div>`;
    
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=20`);
        const data = await res.json();
        const results = data.data || [];
        const grid = document.getElementById("grid");

        if (results.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-slate-400">No results found for "${query}".</p>`;
            return;
        }

        grid.innerHTML = results.map(anime => `
            <div onclick="loadAnimeDetails(${anime.mal_id})" class="bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition border border-slate-800">
                <img src="${anime.images.jpg.image_url}" alt="${anime.title}" class="w-full h-64 object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                <div class="p-3">
                    <h3 class="font-semibold text-sm truncate">${anime.title}</h3>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<p class="text-red-500">Search query failed.</p>`;
    }
}

// Boot application
loadHome();
