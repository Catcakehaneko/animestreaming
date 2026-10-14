const ANIKOTO_API = "https://anikotoapi.site";
const MEGAPLAY_EP_BASE = "https://megaplay.buzz/stream/s-2";
const MEGAPLAY_MAL_BASE = "https://megaplay.buzz/stream/mal";

let activeState = {
    currentSeries: null,
    currentEpisode: null,
    audioMode: 'sub', // 'sub' or 'dub'
    activeServer: 'megaplay-catalog'
};

// Initial Load
document.addEventListener("DOMContentLoaded", () => {
    loadHome();
});

async function loadHome() {
    const container = document.getElementById("mainContainer");
    container.innerHTML = `<div class="flex justify-center items-center py-32"><div class="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent"></div></div>`;

    try {
        const res = await fetch(`${ANIKOTO_API}/recent-anime`);
        const data = await res.json();

        container.innerHTML = `
            <div class="space-y-8">
                <section>
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                            <span class="w-2 h-5 bg-brand-500 rounded-full"></span> Recent Releases
                        </h2>
                    </div>
                    <div id="animeGrid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        ${renderAnimeCards(data)}
                    </div>
                </section>
            </div>
        `;
    } catch (err) {
        showError("Failed to fetch recent catalog from API mirror.");
    }
}

async function loadRecent() {
    loadHome();
}

function renderAnimeCards(list) {
    if (!list || list.length === 0) {
        return `<p class="col-span-full text-slate-400">No anime found.</p>`;
    }

    return list.map(item => `
        <div onclick="loadAnimeDetails('${item.id}')" class="group relative bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden cursor-pointer hover:border-brand-500/50 transition duration-200 flex flex-col">
            <div class="aspect-[3/4] w-full overflow-hidden relative bg-slate-800">
                <img src="${item.poster}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy">
                ${item.episodes ? `<span class="absolute top-2 right-2 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-slate-300">EP ${item.episodes.sub || item.episodes.dub || '?'}</span>` : ''}
            </div>
            <div class="p-3 flex-1 flex flex-col justify-between">
                <h3 class="font-semibold text-xs text-slate-200 line-clamp-2 group-hover:text-brand-500 transition">${escapeHtml(item.title)}</h3>
            </div>
        </div>
    `).join('');
}

async function handleSearch() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return;

    const container = document.getElementById("mainContainer");
    container.innerHTML = `<div class="flex justify-center items-center py-32"><div class="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent"></div></div>`;

    try {
        const res = await fetch(`${ANIKOTO_API}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        container.innerHTML = `
            <section class="space-y-4">
                <h2 class="text-xl font-bold tracking-tight text-slate-100">Search Results for "${escapeHtml(query)}"</h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    ${renderAnimeCards(data.results || data)}
                </div>
            </section>
        `;
    } catch (e) {
        showError("Unable to execute search request.");
    }
}

async function loadAnimeDetails(seriesId) {
    const container = document.getElementById("mainContainer");
    container.innerHTML = `<div class="flex justify-center items-center py-32"><div class="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent"></div></div>`;

    try {
        const res = await fetch(`${ANIKOTO_API}/series/${seriesId}`);
        const anime = await res.json();
        
        activeState.currentSeries = anime;
        const episodes = anime.episodes || [];
        const firstEp = episodes[0] || null;

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Top Navigation/Back Button -->
                <button onclick="loadHome()" class="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 transition">
                    &larr; Back to Catalog
                </button>

                <!-- Streaming Player Layout -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    <!-- Main Video Player Section -->
                    <div class="lg:col-span-2 space-y-4">
                        <div class="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative border border-slate-800">
                            <iframe id="playerFrame" class="w-full h-full border-0" allowfullscreen></iframe>
                        </div>

                        <!-- Player Controls Bar -->
                        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h1 id="currentEpTitle" class="font-bold text-slate-100 text-base lg:text-lg">Loading...</h1>
                                <p class="text-xs text-slate-400 mt-0.5">${escapeHtml(anime.title)}</p>
                            </div>

                            <div class="flex items-center gap-3">
                                <!-- Audio Track Selector -->
                                <div class="bg-slate-800 p-1 rounded-lg flex text-xs font-semibold">
                                    <button id="btnSub" onclick="setAudioMode('sub')" class="px-3 py-1 rounded-md text-slate-300 transition">SUB</button>
                                    <button id="btnDub" onclick="setAudioMode('dub')" class="px-3 py-1 rounded-md text-slate-300 transition">DUB</button>
                                </div>

                                <!-- Server Switcher Dropdown -->
                                <select id="serverSelect" onchange="switchServer()" class="bg-slate-800 text-xs text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg focus:outline-none">
                                    <option value="megaplay-catalog">MegaPlay (Catalog ID)</option>
                                    <option value="megaplay-mal">MegaPlay (MAL ID)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Episode Playlist Sidebar -->
                    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[520px]">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="font-bold text-sm text-slate-200">Episodes</h3>
                            <span class="text-xs text-slate-400">${episodes.length} Available</span>
                        </div>
                        <div class="overflow-y-auto flex-1 space-y-1.5 custom-scrollbar pr-1" id="episodeListContainer">
                            ${episodes.map(ep => `
                                <button onclick="selectEpisode('${ep.episode_embed_id}', '${ep.number}', '${escapeHtml(ep.title)}') shadow-sm" 
                                    id="ep-btn-${ep.episode_embed_id}" 
                                    class="ep-item w-full text-left px-3 py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-medium">
                                    <span class="truncate pr-2">Ep ${ep.number}: ${escapeHtml(ep.title)}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (firstEp) {
            selectEpisode(firstEp.episode_embed_id, firstEp.number, firstEp.title);
        }

    } catch (e) {
        showError("Unable to load anime episode data.");
    }
}

function selectEpisode(embedId, epNum, epTitle) {
    activeState.currentEpisode = { embedId, epNum, epTitle };
    document.getElementById("currentEpTitle").innerText = `Episode ${epNum}: ${epTitle}`;

    // Update active highlight class
    document.querySelectorAll(".ep-item").forEach(el => el.classList.remove("bg-brand-500", "text-white", "font-bold"));
    const activeBtn = document.getElementById(`ep-btn-${embedId}`);
    if (activeBtn) {
        activeBtn.classList.add("bg-brand-500", "text-white", "font-bold");
    }

    updateEmbedUrl();
}

function setAudioMode(mode) {
    activeState.audioMode = mode;
    
    const subBtn = document.getElementById("btnSub");
    const dubBtn = document.getElementById("btnDub");

    if (mode === 'sub') {
        subBtn.className = "px-3 py-1 rounded-md bg-brand-500 text-white font-bold transition";
        dubBtn.className = "px-3 py-1 rounded-md text-slate-400 hover:text-slate-200 transition";
    } else {
        dubBtn.className = "px-3 py-1 rounded-md bg-brand-500 text-white font-bold transition";
        subBtn.className = "px-3 py-1 rounded-md text-slate-400 hover:text-slate-200 transition";
    }

    updateEmbedUrl();
}

function switchServer() {
    activeState.activeServer = document.getElementById("serverSelect").value;
    updateEmbedUrl();
}

function updateEmbedUrl() {
    const iframe = document.getElementById("playerFrame");
    const { currentSeries, currentEpisode, audioMode, activeServer } = activeState;

    if (!currentEpisode) return;

    let targetUrl = "";

    if (activeServer === "megaplay-catalog") {
        targetUrl = `${MEGAPLAY_EP_BASE}/${currentEpisode.embedId}/${audioMode}`;
    } else if (activeServer === "megaplay-mal" && currentSeries.mal_id) {
        targetUrl = `${MEGAPLAY_MAL_BASE}/${currentSeries.mal_id}/${currentEpisode.epNum}/${audioMode}`;
    } else {
        targetUrl = `${MEGAPLAY_EP_BASE}/${currentEpisode.embedId}/${audioMode}`;
    }

    iframe.src = targetUrl;
}

function showError(msg) {
    document.getElementById("mainContainer").innerHTML = `
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl text-center max-w-lg mx-auto my-20 space-y-3">
            <p class="font-semibold text-sm">${msg}</p>
            <button onclick="loadHome()" class="text-xs bg-red-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-600 transition">Return to Catalog</button>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
}