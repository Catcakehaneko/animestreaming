<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HiAnime + MegaPlay Player</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            500: '#ff2e55',
                            600: '#e61e43',
                            700: '#cc1234'
                        }
                    }
                }
            }
        }
    </script>
    <style>
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #475569;
        }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans selection:bg-brand-500 selection:text-white">

    <!-- Navbar -->
    <header class="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div class="flex items-center gap-6">
            <button onclick="loadHome()" class="flex items-center gap-2 font-black text-2xl tracking-wider text-brand-500 hover:opacity-90 transition">
                <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                <span>HISTR3AM</span>
            </button>
            <nav class="hidden md:flex items-center gap-4 text-sm font-medium text-slate-400">
                <button onclick="loadHome()" class="hover:text-slate-100 transition">Home</button>
                <button onclick="loadRecent()" class="hover:text-slate-100 transition">Recent Uploads</button>
            </nav>
        </div>

        <!-- Search Bar -->
        <div class="flex items-center gap-2 max-w-md w-full">
            <div class="relative w-full">
                <input type="text" id="searchInput" onkeydown="if(event.key==='Enter') handleSearch()" placeholder="Search catalog..." class="w-full bg-slate-800 border border-slate-700/80 rounded-lg px-4 py-1.5 pl-10 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500 transition">
                <svg class="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="handleSearch()" class="bg-brand-500 hover:bg-brand-600 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition">
                Search
            </button>
        </div>
    </header>

    <!-- Main Container -->
    <main id="mainContainer" class="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        <div id="loading" class="flex justify-center items-center py-32">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent"></div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-800 bg-slate-900/50 py-6 text-center text-xs text-slate-500">
        <p>Hosted on GitHub Pages • Powered by MegaPlay Embed API</p>
    </footer>

    <script src="app.js"></script>
</body>
</html>