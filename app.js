let tldrApp;

// Global functions for HTML onclick handlers
function showHome() {
    if (tldrApp) tldrApp.showHome();
}

function performSearch() {
    if (tldrApp) tldrApp.performSearch();
}

function searchCommand(command) {
    if (tldrApp) tldrApp.searchCommand(command);
}

class TLDRApp {
    constructor() {
        this.config = {
            zipUrl: '/tldr-pages.en.zip',
            supportedPlatforms: [
                {code: "common", name: "Common", icon: "🔗", defaultSelected: true},
                {code: "linux", name: "Linux", icon: "🐧", defaultSelected: true},
                {code: "windows", name: "Windows", icon: "🪟", defaultSelected: true},
                {code: "osx", name: "macOS", icon: "🍎", defaultSelected: true},
                {code: "android", name: "Android", icon: "🤖", defaultSelected: false},
                {code: "freebsd", name: "FreeBSD", icon: "👹", defaultSelected: false},
                {code: "netbsd", name: "NetBSD", icon: "🔱", defaultSelected: false},
                {code: "openbsd", name: "OpenBSD", icon: "🐡", defaultSelected: false},
                {code: "sunos", name: "SunOS", icon: "☀️", defaultSelected: false}
            ],
            categories: [
                {
                    name: "File System",
                    icon: "📁",
                    commands: ["ls", "cd", "cp", "mv", "rm", "find", "locate", "du", "df", "chmod", "chown", "mkdir", "rmdir", "ln", "stat", "touch"]
                },
                {
                    name: "Text Processing", 
                    icon: "📝",
                    commands: ["grep", "sed", "awk", "sort", "uniq", "cut", "tr", "wc", "head", "tail", "cat", "less", "more", "diff", "tee"]
                },
                {
                    name: "Process Management",
                    icon: "⚙️", 
                    commands: ["ps", "top", "htop", "kill", "killall", "jobs", "systemctl", "service", "nohup", "screen", "tmux"]
                },
                {
                    name: "Network",
                    icon: "🌐",
                    commands: ["ping", "curl", "wget", "ssh", "scp", "netstat", "iptables", "ss", "nc", "telnet", "ftp", "rsync"]
                },
                {
                    name: "System Administration",
                    icon: "🔧",
                    commands: ["sudo", "mount", "fdisk", "crontab", "uname", "free", "lsblk", "lsof"]
                },
                {
                    name: "Archive & Compression",
                    icon: "📦", 
                    commands: ["tar", "gzip", "zip", "unzip", "7z", "gunzip", "bzip2", "xz", "compress"]
                }
            ],
            cacheKey: 'tldr-commands-cache-v7',
            cacheExpiry: 24 * 60 * 60 * 1000
        };

        this.state = {
            selectedPlatforms: new Set(['common', 'linux', 'windows', 'osx']),
            commandsIndex: new Map(),
            searchIndex: [],
            isDataLoaded: false,
            theme: localStorage.getItem('tldr-theme') || 'auto',
            currentCommand: null,
            currentCategory: null,
            lastUpdateTime: null,
            optionsMode: localStorage.getItem('tldr_options_mode') || 'short'
        };

        this.markdownConverter = new showdown.Converter({
            tables: true,
            strikethrough: true,
            simpleLineBreaks: true,
            headerLevelStart: 2
        });

        this.init();
    }

    async init() {
        console.log('🚀 Initializing TLDR App...');
        
        // FAST INITIALIZATION
        this.setupTheme();
        this.setupEventListeners();
        this.setupRouting();
        this.populateSidebar();
        
        // Handle initial URL route
        this.handleRoute();
        
        // Start background data loading
        // Check if device is mobile for performance optimization
        if (this.isMobileDevice()) {
            // Delay loading on mobile devices to improve initial render
            setTimeout(() => {
                this.loadTLDRDataInBackground();
            }, 1000);
        } else {
            setTimeout(() => {
                this.loadTLDRDataInBackground();
            }, 100);
        }

        console.log('✅ TLDR App initialized - UI ready, data loading in background');
    }

    // Check if device is mobile for performance optimization
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Setup URL routing
    setupRouting() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            this.handleRoute();
        });
        
        console.log('🔗 URL routing setup complete');
    }

    // Handle URL routing
    handleRoute() {
        const path = window.location.pathname;
        console.log(`🔗 Handling route: ${path}`);
        
        if (path === '/' || path === '/index.html') {
            // Home page
            if (this.state.isDataLoaded) {
                this.showWelcome();
            }
            return;
        }
        
        // Check for command routes: /pages/{platform}/{command}
        const commandMatch = path.match(/^\/pages\/([^\/]+)\/([^\/]+)$/);
        if (commandMatch) {
            const [, platform, command] = commandMatch;
            console.log(`🔗 Command route detected: ${command} [${platform}]`);
            
            if (this.state.isDataLoaded) {
                this.searchCommandByPlatform(command, platform);
            } else {
                // Store for later when data loads
                this.pendingRoute = { type: 'command', command, platform };
            }
            return;
        }
        
        // Check for category routes: /category/{categoryName}
        const categoryMatch = path.match(/^\/category\/([^\/]+)$/);
        if (categoryMatch) {
            const [, categoryName] = categoryMatch;
            const category = this.config.categories.find(c => 
                c.name.replace(/\s+/g, '').toLowerCase() === categoryName.toLowerCase()
            );
            
            if (category && this.state.isDataLoaded) {
                const availableCommands = this.getAvailableCommandsForCategory(category);
                this.showCategoryCommands(category, availableCommands);
            } else if (category) {
                this.pendingRoute = { type: 'category', category };
            }
            return;
        }
        
        // Invalid route - redirect to home
        if (this.state.isDataLoaded) {
            this.navigateToHome();
        }
    }

    // Navigate to home and update URL
    navigateToHome() {
        window.history.pushState(null, 'TLDR Commands', '/');
        this.showWelcome();
    }

    // Navigate to command and update URL
    navigateToCommand(command, platform) {
        const url = `/pages/${platform}/${command}`;
        window.history.pushState({ command, platform }, `${command} - TLDR Commands`, url);
        console.log(`🔗 Navigated to: ${url}`);
    }

    // Navigate to category and update URL
    navigateToCategory(category) {
        const categoryName = category.name.replace(/\s+/g, '').toLowerCase();
        const url = `/category/${categoryName}`;
        window.history.pushState({ category: category.name }, `${category.name} - TLDR Commands`, url);
        console.log(`🔗 Navigated to: ${url}`);
    }

    async loadTLDRDataInBackground() {
        try {
            this.updateBackgroundStatus('🔄 Checking for cached commands...');
            
            const cachedData = await this.getCachedData();
            if (cachedData && this.isCacheValid(cachedData.timestamp)) {
                console.log('📦 Using cached data');
                
                await this.processCommandsDataAsync(new Map(cachedData.commands));
                
                this.updateBackgroundStatus('✅ Commands loaded from cache');
                this.refreshCategoriesAfterLoad();
                this.updateLastUpdateTime(cachedData.timestamp);
                
                // Handle pending route
                this.handlePendingRoute();
                return;
            }

            this.updateBackgroundStatus('📡 Downloading command database...');

            try {
                const response = await fetch(this.config.zipUrl, {
                    cache: 'force-cache'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                this.updateBackgroundStatus('📦 Processing command data...');

                const zipData = await response.arrayBuffer();
                console.log(`📊 ZIP size: ${(zipData.byteLength / 1024 / 1024).toFixed(2)} MB`);

                const commands = await this.extractCommandsWithProgress(zipData);
                
                this.updateBackgroundStatus('🏗️ Building search index...');
                
                await this.processCommandsDataAsync(commands);

                const currentTime = Date.now();
                await this.cacheData(commands, currentTime);
                
                this.updateBackgroundStatus('✅ All commands loaded successfully!');
                this.refreshCategoriesAfterLoad();
                this.updateLastUpdateTime(currentTime);

                // Handle pending route
                this.handlePendingRoute();

                console.log(`✅ Loaded ${commands.size} commands successfully`);

            } catch (error) {
                console.error('❌ Failed to load ZIP:', error);
                this.loadFallbackData();
                this.updateBackgroundStatus('⚠️ Using limited fallback data');
                this.refreshCategoriesAfterLoad();
            }

        } catch (error) {
            console.error('Failed to load data:', error);
            this.loadFallbackData();
            this.updateBackgroundStatus('⚠️ Using limited fallback data');
            this.refreshCategoriesAfterLoad();
        }
    }

    // Handle routes that were requested before data was loaded
    handlePendingRoute() {
        if (this.pendingRoute) {
            const route = this.pendingRoute;
            this.pendingRoute = null;
            
            if (route.type === 'command') {
                this.searchCommandByPlatform(route.command, route.platform);
            } else if (route.type === 'category') {
                const availableCommands = this.getAvailableCommandsForCategory(route.category);
                this.showCategoryCommands(route.category, availableCommands);
            }
        }
    }

    async processCommandsDataAsync(commands) {
        return new Promise((resolve) => {
            const processChunk = () => {
                this.state.commandsIndex = commands;
                this.buildSearchIndex();
                this.state.isDataLoaded = true;
                this.updateCommandCount();
                
                console.log(`🔍 Commands processed. Total: ${commands.size}`);
                resolve();
            };
            
            setTimeout(processChunk, 0);
        });
    }

    async extractCommandsWithProgress(zipData) {
        const commands = new Map();
        
        try {
            console.log('🔧 Loading ZIP with JSZip...');
            const zip = await JSZip.loadAsync(zipData);
            
            const allFiles = Object.keys(zip.files);
            console.log('📁 ZIP contents:', allFiles.length, 'files');
            
            let processedCount = 0;
            const batchSize = 50;

            for (let i = 0; i < allFiles.length; i += batchSize) {
                const batch = allFiles.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (filename) => {
                    const file = zip.files[filename];
                    
                    if (file.dir || !filename.endsWith('.md')) return;

                    let platform = null;
                    let commandName = null;

                    let match = filename.match(/^pages\.en\/([^\/]+)\/([^\/]+)\.md$/);
                    if (match) {
                        platform = match[1];
                        commandName = match[2];
                    }

                    if (!match) {
                        match = filename.match(/^([^\/]+)\/([^\/]+)\.md$/);
                        if (match) {
                            platform = match[1];
                            commandName = match[2];
                        }
                    }

                    if (!match) {
                        match = filename.match(/^pages\/([^\/]+)\/([^\/]+)\.md$/);
                        if (match) {
                            platform = match[1];
                            commandName = match[2];
                        }
                    }

                    if (!match) return;

                    const supportedPlatformCodes = this.config.supportedPlatforms.map(p => p.code);
                    if (!supportedPlatformCodes.includes(platform)) return;

                    try {
                        const content = await file.async('string');
                        
                        if (content.trim()) {
                            const key = `${platform}-${commandName}`;
                            const parsedData = this.parseMarkdown(content);
                            
                            commands.set(key, {
                                command: commandName,
                                platform: platform,
                                content: content,
                                ...parsedData
                            });
                        }
                    } catch (extractError) {
                        console.warn(`⚠️ Failed to extract ${filename}:`, extractError);
                    }
                }));

                processedCount += batch.length;
                
                const progress = Math.round((processedCount / allFiles.length) * 100);
                this.updateBackgroundStatus(`📦 Processing... ${progress}% (${commands.size} commands found)`);
                
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            console.log(`🎉 Successfully extracted ${commands.size} commands`);
            
            if (commands.size === 0) {
                throw new Error('No commands were extracted from the ZIP file.');
            }

            return commands;

        } catch (error) {
            console.error('❌ ZIP extraction failed:', error);
            throw new Error(`Failed to extract command data: ${error.message}`);
        }
    }

    updateBackgroundStatus(message) {
        const statusText = document.getElementById('searchStatusText');
        if (statusText) {
            statusText.textContent = message;
        }
        console.log(`📊 ${message}`);
        
        if (message.includes('✅')) {
            setTimeout(() => {
                if (statusText && statusText.textContent === message) {
                    statusText.textContent = 'Search ready';
                }
            }, 5000);
        }
    }

    refreshCategoriesAfterLoad() {
        console.log('🔄 Refreshing categories with loaded data...');
        
        const categoriesContent = document.getElementById('categories-content');
        if (categoriesContent && this.state.isDataLoaded) {
            categoriesContent.innerHTML = '';
            
            this.config.categories.forEach(category => {
                const availableCommands = this.getAvailableCommandsForCategory(category);
                
                if (availableCommands.length === 0) return;
                
                const categoryItem = document.createElement('button');
                categoryItem.className = 'sidebar-item category-item';
                categoryItem.innerHTML = `
                    <span class="category-icon">${category.icon}</span>
                    <span class="category-name">${category.name}</span>
                    <span class="category-count">(${availableCommands.length})</span>
                `;
                
                categoryItem.onclick = () => {
                    this.showCategoryCommands(category, availableCommands);
                    this.navigateToCategory(category);
                };
                
                categoriesContent.appendChild(categoryItem);
            });
            
            console.log('✅ Categories refreshed as clickable sidebar items');
        }
    }

    // Get available commands for category
    getAvailableCommandsForCategory(category) {
        return category.commands.filter(cmd => {
            const selectedPlatforms = Array.from(this.state.selectedPlatforms);
            return selectedPlatforms.some(platform => {
                const key = `${platform}-${cmd}`;
                return this.state.commandsIndex.has(key);
            });
        });
    }

    showCategoryCommands(category, availableCommands) {
        console.log(`📂 Showing category: ${category.name} with ${availableCommands.length} commands`);
        
        this.state.currentCategory = category;
        
        const categoryContent = `
            <div class="category-view">
                <div class="category-header">
                    <h1 class="category-title">
                        <span class="category-icon">${category.icon}</span>
                        ${category.name}
                        <span class="category-subtitle">${availableCommands.length} commands available</span>
                    </h1>
                    <p class="category-description">
                        Essential commands for ${category.name.toLowerCase()}. Click any command below to view detailed examples and usage.
                    </p>
                </div>
                
                <div class="category-commands-grid">
                    ${availableCommands.map(cmd => {
                        const selectedPlatforms = Array.from(this.state.selectedPlatforms);
                        let description = '';
                        
                        for (const platform of selectedPlatforms) {
                            const key = `${platform}-${cmd}`;
                            if (this.state.commandsIndex.has(key)) {
                                description = this.state.commandsIndex.get(key).description || '';
                                break;
                            }
                        }
                        
                        return `
                            <div class="command-card" onclick="tldrApp.searchCommand('${cmd}')">
                                <div class="command-name">${cmd}</div>
                                <div class="command-description">${description || 'Click to view examples'}</div>
                                <div class="command-platforms">
                                    ${selectedPlatforms.filter(platform => {
                                        const key = `${platform}-${cmd}`;
                                        return this.state.commandsIndex.has(key);
                                    }).map(platform => {
                                        const platformInfo = this.config.supportedPlatforms.find(p => p.code === platform);
                                        return `<span class="platform-tag">${platformInfo?.icon || platform}</span>`;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        const commandDisplay = document.getElementById('commandDisplay');
        if (commandDisplay) {
            commandDisplay.innerHTML = categoryContent;
        }
        
        this.showContent('command');
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = `Search in ${category.name}...`;
        }
    }

    parseMarkdown(content) {
        const lines = content.split('\n').filter(line => line.trim());
        let description = '';
        const examples = [];
        let currentExample = null;

        for (const line of lines) {
            if (line.startsWith('# ')) {
                continue;
            } else if (line.startsWith('> ')) {
                description = line.substring(2).trim();
            } else if (line.startsWith('- ')) {
                if (currentExample) {
                    examples.push(currentExample);
                }
                currentExample = {
                    description: line.substring(2).trim(),
                    code: ''
                };
            } else if (line.startsWith('`') && line.endsWith('`') && currentExample) {
                currentExample.code = line.substring(1, line.length - 1);
            }
        }

        if (currentExample) {
            examples.push(currentExample);
        }

        return { description, examples };
    }

    buildSearchIndex() {
        this.state.searchIndex = Array.from(this.state.commandsIndex.values()).map(cmd => ({
            command: cmd.command,
            platform: cmd.platform,
            description: cmd.description || '',
            key: `${cmd.platform}-${cmd.command}`
        }));

        console.log(`🔍 Built search index with ${this.state.searchIndex.length} commands`);
    }

    async getCachedData() {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open('tldr-cache', 1);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('commands')) {
                        db.createObjectStore('commands');
                    }
                };

                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['commands'], 'readonly');
                    const store = transaction.objectStore('commands');
                    const getRequest = store.get('data');

                    getRequest.onsuccess = () => {
                        resolve(getRequest.result);
                    };

                    getRequest.onerror = () => {
                        resolve(null);
                    };
                };

                request.onerror = () => {
                    resolve(null);
                };
            } catch (error) {
                console.warn('Failed to access IndexedDB:', error);
                resolve(null);
            }
        });
    }

    async cacheData(commands, timestamp = Date.now()) {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open('tldr-cache', 1);
                
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['commands'], 'readwrite');
                    const store = transaction.objectStore('commands');
                    
                    const data = {
                        commands: Array.from(commands.entries()),
                        timestamp: timestamp
                    };

                    store.put(data, 'data');
                    console.log(`💾 Cached ${commands.size} commands with timestamp: ${new Date(timestamp).toLocaleString()}`);
                    resolve();
                };

                request.onerror = () => {
                    console.warn('Failed to cache data');
                    resolve();
                };
            } catch (error) {
                console.warn('Failed to cache data:', error);
                resolve();
            }
        });
    }

    isCacheValid(timestamp) {
        if (!timestamp) return false;
        return (Date.now() - timestamp) < this.config.cacheExpiry;
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        const searchInput = document.getElementById('searchInput');
        const searchSuggestions = document.getElementById('searchSuggestions');
        
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 200);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(searchTimeout);
                    this.performSearch();
                }
                if (e.key === 'Escape') {
                    if (searchSuggestions) {
                        searchSuggestions.classList.remove('visible');
                    }
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (searchInput && searchSuggestions && 
                !searchInput.contains(e.target) && 
                !searchSuggestions.contains(e.target)) {
                searchSuggestions.classList.remove('visible');
            }
        });

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Setup options toggle
        const optionsModeSelect = document.getElementById('optionsModeSelect');
        if (optionsModeSelect) {
            optionsModeSelect.value = this.state.optionsMode;
            optionsModeSelect.addEventListener('change', (e) => {
                this.state.optionsMode = e.target.value;
                localStorage.setItem('tldr_options_mode', e.target.value);
                this.renderCurrentCommand();
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('sidebar-section-header') || 
                e.target.closest('.sidebar-section-header')) {
                
                const header = e.target.closest('.sidebar-section-header') || e.target;
                const section = header.closest('.sidebar-section');
                
                if (section) {
                    this.toggleSidebarSection(section);
                }
            }
        });

        console.log('✅ Event listeners setup complete');
    }

    toggleSidebarSection(section) {
        section.classList.toggle('expanded');
    }

    // Utility functions for option processing
    extractOption(token, mode = "short") {
        // Remove square brackets from options for cleaner display
        const stripBrackets = (str) => str.replace(/^\[|\]$/g, '');

        const parts = token.split('|').map(part => stripBrackets(part.trim()));

        if (mode === 'short') return parts[0];
        if (mode === 'long') return parts[1];
        // For 'both' mode, join short and long with ' / '
        if (mode === 'both') return `${parts[0]} / ${parts[1]}`;
        return parts[0];
    }

    processOptionLine(line, mode = "short") {
        // Remove outer {{ and }} and replace with processed option
        return line.replace(/{{(.*?)}}/g, (match, token) => {
            if (token.includes('|')) {
                return this.extractOption(token, mode);
            }
            // For tokens without '|', just return the token without brackets
            return token.trim();
        });
    }

    renderCurrentCommand() {
        if (this.state.currentCommand) {
            const commandData = this.state.currentCommand;
            const platform = commandData.platform;
            this.displayCommand(commandData, platform);
        }
    }

    setupTheme() {
    // Always read theme from localStorage (user's real preference)
    let theme = localStorage.getItem('tldr-theme');
    if (!theme || (theme !== 'light' && theme !== 'dark')) {
        theme = 'auto'; // fallback to auto
    }
    this.state.theme = theme;

    const applyTheme = (theme) => {
        if (theme === 'auto') {
            document.documentElement.removeAttribute('data-color-scheme');
        } else {
            document.documentElement.setAttribute('data-color-scheme', theme);
        }
        // Update UI
        const themeButton = document.getElementById('themeToggle');
        if (themeButton) {
            themeButton.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    };

    applyTheme(theme);
};

toggleTheme() {
    let theme = localStorage.getItem('tldr-theme');
    let nextTheme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('tldr-theme', nextTheme);
    this.setupTheme();
}


    populateSidebar() {
        console.log('📋 Populating sidebar...');

        const platformsContent = document.getElementById('platforms-content');
        if (platformsContent) {
            const platformCheckboxes = platformsContent.querySelector('.platform-checkboxes');
            if (platformCheckboxes) {
                platformCheckboxes.innerHTML = '';
                
                this.config.supportedPlatforms.forEach(platform => {
                    const checkboxContainer = document.createElement('div');
                    checkboxContainer.className = 'platform-checkbox';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `platform-${platform.code}`;
                    checkbox.value = platform.code;
                    checkbox.checked = platform.defaultSelected;
                    
                    const label = document.createElement('label');
                    label.htmlFor = `platform-${platform.code}`;
                    label.textContent = `${platform.icon} ${platform.name}`;
                    
                    checkboxContainer.appendChild(checkbox);
                    checkboxContainer.appendChild(label);
                    
                    checkbox.addEventListener('change', () => {
                        this.handlePlatformSelection(platform.code, checkbox.checked);
                    });
                    
                    platformCheckboxes.appendChild(checkboxContainer);
                });
            }
        }

        this.updatePlatformSummary();
        console.log('✅ Sidebar populated');
    }

    handlePlatformSelection(platformCode, isSelected) {
        if (isSelected) {
            this.state.selectedPlatforms.add(platformCode);
        } else {
            this.state.selectedPlatforms.delete(platformCode);
        }

        if (this.state.selectedPlatforms.size === 0) {
            this.state.selectedPlatforms.add('common');
            const commonCheckbox = document.getElementById('platform-common');
            if (commonCheckbox) commonCheckbox.checked = true;
        }

        this.updatePlatformSummary();

        if (this.state.isDataLoaded) {
            this.refreshCategoriesAfterLoad();
            
            if (this.state.currentCategory) {
                const availableCommands = this.getAvailableCommandsForCategory(this.state.currentCategory);
                this.showCategoryCommands(this.state.currentCategory, availableCommands);
            }
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            this.handleSearch(searchInput.value);
        }
    }

    updatePlatformSummary() {
        const summaryText = document.getElementById('selectedPlatformsText');
        if (!summaryText) return;

        const selectedPlatforms = Array.from(this.state.selectedPlatforms);
        if (selectedPlatforms.length === 1) {
            const platform = this.config.supportedPlatforms.find(p => p.code === selectedPlatforms[0]);
            summaryText.textContent = `${platform.icon} ${platform.name} selected`;
        } else {
            const platformIcons = selectedPlatforms.map(code => {
                const platform = this.config.supportedPlatforms.find(p => p.code === code);
                return platform ? platform.icon : code;
            });
            summaryText.textContent = `${selectedPlatforms.length} platforms: ${platformIcons.join(' ')}`;
        }
    }

    handleSearch(query) {
        const searchSuggestions = document.getElementById('searchSuggestions');
        if (!searchSuggestions || !this.state.isDataLoaded) return;

        if (!query.trim()) {
            searchSuggestions.classList.remove('visible');
            return;
        }

        const results = this.searchCommands(query, 8);
        
        if (results.length === 0) {
            searchSuggestions.classList.remove('visible');
            return;
        }

        searchSuggestions.innerHTML = '';
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <strong>${result.command}</strong>
                <span style="color: var(--color-text-secondary); font-size: 12px;">[${result.platform}]</span>
                <div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px;">${result.description}</div>
            `;
            
            item.addEventListener('click', () => {
                this.searchCommand(result.command);
                document.getElementById('searchInput').value = result.command;
                searchSuggestions.classList.remove('visible');
            });
            
            searchSuggestions.appendChild(item);
        });
        
        searchSuggestions.classList.add('visible');
    }

    // Optimized search with better performance
    searchCommands(query, limit = 20) {
        if (!this.state.isDataLoaded) return [];

        const lowerQuery = query.toLowerCase();
        const selectedPlatforms = Array.from(this.state.selectedPlatforms);
        
        // Pre-filter by platforms first for better performance
        const platformFiltered = this.state.searchIndex.filter(item => 
            selectedPlatforms.includes(item.platform)
        );
        
        // Use more efficient search with early termination
        const results = platformFiltered.filter(item => {
            const commandMatch = item.command.toLowerCase().indexOf(lowerQuery);
            const descriptionMatch = item.description.toLowerCase().indexOf(lowerQuery);
            return commandMatch !== -1 || descriptionMatch !== -1;
        });
        
        // Sort with optimized comparison
        return results.sort((a, b) => {
            const aLower = a.command.toLowerCase();
            const bLower = b.command.toLowerCase();
            
            // Exact match first
            if (aLower === lowerQuery) return -1;
            if (bLower === lowerQuery) return 1;
            
            // Prefix match next
            const aStartsWith = aLower.startsWith(lowerQuery);
            const bStartsWith = bLower.startsWith(lowerQuery);
            if (aStartsWith && !bStartsWith) return -1;
            if (bStartsWith && !aStartsWith) return 1;
            
            // Then sort alphabetically
            return a.command.localeCompare(b.command);
        }).slice(0, limit);
    }

    performSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput || !this.state.isDataLoaded) return;

        const query = searchInput.value.trim();
        if (!query) return;

        this.searchCommand(query);
        
        const searchSuggestions = document.getElementById('searchSuggestions');
        if (searchSuggestions) {
            searchSuggestions.classList.remove('visible');
        }
    }

    searchCommand(commandName) {
        if (!this.state.isDataLoaded) {
            console.log('❌ Data not loaded yet');
            return;
        }

        const selectedPlatforms = Array.from(this.state.selectedPlatforms);
        let commandData = null;
        let foundPlatform = null;

        for (const platform of selectedPlatforms) {
            const key = `${platform}-${commandName}`;
            
            if (this.state.commandsIndex.has(key)) {
                commandData = this.state.commandsIndex.get(key);
                foundPlatform = platform;
                break;
            }
        }

        if (!commandData) {
            const commonKey = `common-${commandName}`;
            
            if (this.state.commandsIndex.has(commonKey)) {
                commandData = this.state.commandsIndex.get(commonKey);
                foundPlatform = 'common';
            }
        }

        if (commandData) {
            this.displayCommand(commandData, foundPlatform);
            this.navigateToCommand(commandName, foundPlatform);
        } else {
            this.showNoResults(commandName);
        }
    }

    // Search command by specific platform (for URL routing)
    searchCommandByPlatform(commandName, platform) {
        const key = `${platform}-${commandName}`;
        
        if (this.state.commandsIndex.has(key)) {
            const commandData = this.state.commandsIndex.get(key);
            this.displayCommand(commandData, platform);
        } else {
            this.showNoResults(commandName);
        }
    }

    displayCommand(commandData, platform) {
        const commandDisplay = document.getElementById('commandDisplay');
        
        if (!commandDisplay) return;

        this.state.currentCategory = null;

        const platformInfo = this.config.supportedPlatforms.find(p => p.code === platform);

        // Process command content lines with option toggle
        const lines = commandData.content.split('\n');
        const processedLines = lines.map(line => this.processOptionLine(line, this.state.optionsMode));
        const processedContent = processedLines.join('\n');

        const htmlContent = this.markdownConverter.makeHtml(processedContent);
        
        commandDisplay.innerHTML = `
            <div class="command-header">
                <div class="command-platform-info">
                    <span class="platform-badge" style="background: var(--color-primary); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                        ${platformInfo?.icon} ${platformInfo?.name || platform}
                    </span>
                </div>
            </div>
            ${htmlContent}
        `;

        // REMOVED: No more copy buttons as requested
        this.showContent('command');
        this.state.currentCommand = commandData;
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.placeholder = 'Search 5900+ commands...';
        }

        // Update page title
        document.title = `${commandData.command} - TLDR Commands`;
    }

    showHome() {
        this.showContent('welcome');
        this.state.currentCategory = null;
        this.navigateToHome();
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = 'Search 5900+ commands...';
        }
        
        const searchSuggestions = document.getElementById('searchSuggestions');
        if (searchSuggestions) {
            searchSuggestions.classList.remove('visible');
        }

        // Reset page title
        document.title = 'TLDR Commands – Simplified Command Man Pages | MagnetByte';
    }

    showNoResults(query) {
        const noResults = document.getElementById('noResults');
        if (noResults) {
            const content = noResults.querySelector('.no-results-content');
            if (content) {
                content.innerHTML = `
                    <div class="no-results-icon">🔍</div>
                    <h3>No Commands Found</h3>
                    <p>The command "<strong>${query}</strong>" wasn't found in the selected platforms.</p>
                    <p><strong>Tip:</strong> Try selecting additional platforms from the sidebar.</p>
                `;
            }
        }
        this.showContent('noResults');
    }

    showContent(type) {
        ['welcomeScreen', 'searchResults', 'commandDisplay', 'noResults'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });

        const contentMap = {
            'welcome': 'welcomeScreen',
            'search': 'searchResults', 
            'command': 'commandDisplay',
            'noResults': 'noResults'
        };

        const elementId = contentMap[type];
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) element.style.display = 'block';
        }
    }

    showWelcome() {
        this.showContent('welcome');
    }

    updateCommandCount() {
        const commandCountElement = document.getElementById('commandCount');
        if (commandCountElement) {
            commandCountElement.textContent = this.state.commandsIndex.size.toLocaleString();
        }
    }

    updateLastUpdateTime(timestamp) {
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement && timestamp) {
            const date = new Date(timestamp);
            const formattedDate = date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            lastUpdatedElement.textContent = formattedDate;
            console.log(`📅 Last updated timestamp set to: ${formattedDate}`);
        } else {
            console.warn('❌ Could not update last updated time - element or timestamp missing');
        }
    }

    loadFallbackData() {
        console.log('📦 Loading fallback data...');
        
        const fallbackCommands = new Map([
            ['common-ls', {
                command: 'ls',
                platform: 'common',
                content: '# ls\n\n> List directory contents.\n\n- List files and directories:\n\n`ls`\n\n- List with detailed information:\n\n`ls -la`',
                description: 'List directory contents.',
                examples: [
                    { description: 'List files and directories', code: 'ls' },
                    { description: 'List with detailed information', code: 'ls -la' }
                ]
            }],
            ['common-grep', {
                command: 'grep',
                platform: 'common', 
                content: '# grep\n\n> Search text patterns in files.\n\n- Search for a pattern:\n\n`grep "pattern" filename`',
                description: 'Search text patterns in files.',
                examples: [
                    { description: 'Search for a pattern', code: 'grep "pattern" filename' }
                ]
            }]
        ]);

        this.processCommandsDataAsync(fallbackCommands);
        this.updateBackgroundStatus('⚠️ Using fallback data');
        
        const fallbackTime = Date.now();
        this.updateLastUpdateTime(fallbackTime);
        
        console.log('✅ Fallback data loaded');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    tldrApp = new TLDRApp();
});
