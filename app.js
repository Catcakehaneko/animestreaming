const ANIKOTO_API = "https://corsproxy.io/?https://anikotoapi.site";
const MEGAPLAY_BASE = "https://megaplay.buzz/stream/s-2";
let currentEmbedId = "";

/**
 * Load Recent Anime Catalog
 */
async function loadHome() {
    const container = document.getElementById("mainContainer");
    container.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">HiAnime Library - Recent Releases</h2>
        <div id="grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"></div>
    `;
    
    try {
        const res = await fetch(`${ANIKOTO_API}/recent-anime`);
        const data = await res.json();
        const grid = document.getElementById("grid");
        
        // Extract array from response payload
        const animeList = data.data || data.results || data.animes || (Array.isArray(data) ? data : []);

        if (animeList.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-slate-400">No catalog data returned from API.</p>`;
            return;
        }

        grid.innerHTML = animeList.map(anime => {
            const id = anime.id;
            const title = anime.title || anime.name || "Unknown Title";
            const poster = anime.poster || anime.image || "";

            return `
                <div onclick="loadAnimeDetails('${id}')" class="bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition border border-slate-800 hover:border-red-500">
                    <img src="${poster}" alt="${title}" class="w-full h-64 object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                    <div class="p-3">
                        <h3 class="font-semibold text-sm truncate">${title}</h3>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <div class="bg-slate-900 border border-red-500/30 p-6 rounded-lg text-center my-10 max-w-md mx-auto">
                <h3 class="text-red-500 font-bold text-lg mb-2">Connection Blocked or Failed</h3>
                <p class="text-sm text-slate-400 mb-4">The browser blocked the request or the API mirror limit was reached.</p>
                <button onclick="loadHome()" class="bg-red-600 px-4 py-2 rounded text-sm font-semibold hover:bg-red-500">Retry Catalog</button>
            </div>
        `;
    }
}

/**
 * Load Series Metadata and Episode List
 */
async function loadAnimeDetails(id) {
    const container = document.getElementById("mainContainer");
    container.innerHTML = `<p class="text-center py-20 text-slate-400">Loading episodes from library...</p>`;

    try {
        const res = await fetch(`${ANIKOTO_API}/series/${id}`);
        const data = await res.json();
        const anime = data.data || data;
        const episodes = anime.episodes || [];
        
        const firstEp = episodes[0];
        currentEmbedId = firstEp ? (firstEp.episode_embed_id || firstEp.embed_url) : "";

        container.innerHTML = `
            <button onclick="loadHome()" class="mb-4 text-sm bg-slate-800 px-3 py-1 rounded hover:bg-slate-700">&larr; Back to Catalog</button>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2">
                    <div class="aspect-video bg-black rounded-lg overflow-hidden shadow-lg border border-slate-800">
                        <iframe id="playerFrame" src="${currentEmbedId ? `${MEGAPLAY_BASE}/${currentEmbedId}/sub` : ''}" class="w-full h-full border-0" allowfullscreen></iframe>
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <h2 class="text-xl font-bold" id="currentEpTitle">${firstEp ? `Episode ${firstEp.number}:${firstEp.title || ''}` : anime.title}</h2>
                        <select id="serverSelect" onchange="updatePlayerFrame()" class="bg-slate-800 text-xs px-3 py-1.5 rounded border border-slate-700">
                            <option value="sub">MegaPlay (SUB)</option>
                            <option value="dub">MegaPlay (DUB)</option>
                        </select>
                    </div>
                </div>
                <div class="bg-slate-900 p-4 rounded-lg h-[500px] flex flex-col border border-slate-800">
                    <h3 class="font-semibold mb-3 border-b border-slate-800 pb-2">Episodes (${episodes.length})</h3>
                    <div class="overflow-y-auto flex-1 space-y-1 pr-2">
                        ${episodes.map(ep => {
                            const embedId = ep.episode_embed_id || ep.embed_url;
                            const epTitle = `Ep ${ep.number}:${ep.title || 'Episode ' + ep.number}`;
                            return `
                                <button onclick="playEpisode('${embedId}', '${epTitle.replace(/'/g, "\\'")}')" class="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm truncate">
                                    ${epTitle}
                                </button>
                            `;
                        }).join('') || '<p class="text-slate-500 text-sm">No episodes available.</p>'}
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<p class="text-red-500 text-center py-20">Could not fetch series data.</p>`;
    }
}

function playEpisode(embedId, title) {
    currentEmbedId = embedId;
    document.getElementById("currentEpTitle").innerText = title;
    updatePlayerFrame();
}

function updatePlayerFrame() {
    if (!currentEmbedId) return;
    const mode = document.getElementById("serverSelect")?.value || "sub";
    document.getElementById("playerFrame").src = `${MEGAPLAY_BASE}/${currentEmbedId}/${mode}`;
}

async function handleSearch() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return;
    
    const container = document.getElementById("mainContainer");
    container.innerHTML = `<h2 class="text-2xl font-bold mb-4">Search Results for "${query}"</h2><div id="grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"></div>`;
    
    try {
        const res = await fetch(`${ANIKOTO_API}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const results = data.data || data.results || [];
        const grid = document.getElementById("grid");

        if (results.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-slate-400">No matching anime found.</p>`;
            return;
        }

        grid.innerHTML = results.map(anime => `
            <div onclick="loadAnimeDetails('${anime.id}')" class="bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition border border-slate-800">
                <img src="${anime.poster || anime.image || ''}" alt="${anime.title}" class="w-full h-64 object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                <div class="p-3">
                    <h3 class="font-semibold text-sm truncate">${anime.title || anime.name}</h3>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<p class="text-red-500">Search failed.</p>`;
    }
}

// Boot app
loadHome();
