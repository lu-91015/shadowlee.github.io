// 管理员默认密码：shadowlee
// 可在登录判断处修改 sha256('shadowlee') 为其他哈希

// IndexedDB 配置
const DB_NAME = 'ShadowleeLocalDB';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveLocalFile(file) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(file);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function getLocalFiles() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

async function deleteLocalFile(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function clearLocalFiles() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function sha256(text) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// 音频播放管理器
class AudioPlayer {
    constructor() {
        this.currentAudios = [];
        this.allowOverlap = false;
        this.loop = false;
        this.nowPlayingElement = document.getElementById('now-playing');
    }

    stopAll() {
        this.currentAudios.forEach(a => {
            a.pause();
            a.currentTime = 0;
        });
        this.currentAudios = [];
        this.updateNowPlaying('暂无播放');
    }

    playAudio(audioUrl, buttonText) {
        if (!this.allowOverlap) {
            this.stopAll();
        }

        const audio = new Audio(audioUrl);
        audio.loop = this.loop;

        audio.addEventListener('loadedmetadata', () => {
            const minutes = Math.floor(audio.duration / 60);
            const seconds = Math.floor(audio.duration % 60).toString().padStart(2, '0');
            this.updateNowPlaying(`${buttonText} (${minutes}:${seconds})`);
        });

        audio.addEventListener('ended', () => {
            this.currentAudios = this.currentAudios.filter(a => a !== audio);
            if (this.currentAudios.length === 0) {
                this.updateNowPlaying('暂无播放');
            }
        });

        audio.addEventListener('error', () => {
            this.updateNowPlaying('播放失败');
        });

        audio.play().catch(() => {
            this.updateNowPlaying('播放失败');
        });

        this.currentAudios.push(audio);
    }

    updateNowPlaying(text) {
        if (this.nowPlayingElement) {
            this.nowPlayingElement.textContent = text;
        }
    }

    randomPlay(buttons) {
        const activeButtons = Array.from(buttons).filter(btn => btn.dataset.audio);
        if (activeButtons.length === 0) {
            alert('没有可播放的语音');
            return;
        }
        const randomBtn = activeButtons[Math.floor(Math.random() * activeButtons.length)];
        this.playAudio(randomBtn.dataset.audio, randomBtn.textContent.trim());
    }
}

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
    const player = new AudioPlayer();

    // Tab 切换
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tab}-panel`).classList.add('active');
        });
    });

    // 表情分类筛选
    const filterTags = document.querySelectorAll('.filter-tag');
    const emoteCards = document.querySelectorAll('.emote-card');
    const previewImg = document.getElementById('emote-preview-img');
    const previewPlaceholder = document.getElementById('emote-preview-placeholder');
    const previewTitle = document.getElementById('emote-preview-title');

    function setPreview(name, src) {
        if (src) {
            previewImg.src = src;
            previewImg.style.display = 'block';
            previewPlaceholder.style.display = 'none';
            previewTitle.textContent = name || '';
        } else {
            previewImg.style.display = 'none';
            previewPlaceholder.style.display = 'flex';
            previewTitle.textContent = '请选择表情';
        }
    }

    function filterEmotes(category) {
        emoteCards.forEach(card => {
            const cats = (card.dataset.categories || card.dataset.category || '').split(',');
            if (category === 'all' || cats.includes(category)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            filterEmotes(tag.dataset.filter);
        });
    });

    emoteCards.forEach(card => {
        card.addEventListener('click', () => {
            emoteCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            setPreview(card.dataset.name, card.dataset.src);
        });
    });

    // 默认选中第一个可见表情
    if (emoteCards.length > 0) {
        emoteCards[0].classList.add('active');
        setPreview(emoteCards[0].dataset.name, emoteCards[0].dataset.src);
    }

    // 语音按钮
    const voiceButtons = document.querySelectorAll('.voice-btn');
    voiceButtons.forEach(button => {
        button.addEventListener('click', () => {
            const audioUrl = button.dataset.audio;
            if (audioUrl) {
                player.playAudio(audioUrl, button.textContent.trim());
                voiceButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
            }
        });
    });

    // 控制按钮
    document.getElementById('stop-btn')?.addEventListener('click', () => {
        player.stopAll();
        voiceButtons.forEach(b => b.classList.remove('active'));
    });

    document.getElementById('random-btn')?.addEventListener('click', () => {
        player.randomPlay(voiceButtons);
    });

    document.getElementById('allow-overlap')?.addEventListener('change', (e) => {
        player.allowOverlap = e.target.checked;
    });

    document.getElementById('dont-stop')?.addEventListener('change', (e) => {
        player.loop = e.target.checked;
        player.currentAudios.forEach(a => a.loop = e.target.checked);
    });

    // 全局快捷键
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            player.stopAll();
            voiceButtons.forEach(b => b.classList.remove('active'));
        } else if (e.key === ' ') {
            // 输入框里打字、或正在玩游戏时，空格不触发随机语音
            const t = e.target;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;
            if (window.__gameModal && window.__gameModal.current()) return;
            e.preventDefault();
            player.randomPlay(voiceButtons);
        }
    });

    // 本地文件上传与渲染
    async function renderLocalFiles() {
        const files = await getLocalFiles();
        const listEl = document.getElementById('local-files-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        // 渲染本地表情
        document.querySelectorAll('.local-emote-card').forEach(el => el.remove());
        const emotesGrid = document.getElementById('emotes-grid');
        const emptyHint = emotesGrid?.querySelector('.empty-hint');
        if (emptyHint) emptyHint.style.display = 'none';

        const localEmotes = files.filter(f => f.type === 'emote');
        localEmotes.forEach(file => {
            const card = document.createElement('div');
            card.className = 'emote-card local-emote-card';
            const cats = (file.categories && file.categories.length) ? file.categories : [file.category || 'other'];
            card.dataset.categories = cats.join(',');
            card.dataset.name = file.name;
            card.dataset.src = file.dataUrl;
            card.innerHTML = `
                <div class="emote-thumb"><img src="${file.dataUrl}" alt="${file.name}"></div>
                <div class="emote-name">${file.name}</div>
            `;
            card.addEventListener('click', () => {
                emoteCards.forEach(c => c.classList.remove('active'));
                document.querySelectorAll('.local-emote-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                setPreview(file.name, file.dataUrl);
            });
            emotesGrid?.appendChild(card);
        });

        // 渲染本地语音
        document.querySelectorAll('.local-voice-section').forEach(el => el.remove());
        const voicesContainer = document.querySelector('.voices-container');
        const localVoices = files.filter(f => f.type === 'voice');
        if (localVoices.length > 0 && voicesContainer) {
            const section = document.createElement('section');
            section.className = 'voice-category local-voice-section';
            section.innerHTML = '<h3>本地上传</h3><div class="buttons-grid local-voice-grid"></div>';
            const grid = section.querySelector('.local-voice-grid');
            localVoices.forEach(file => {
                const btn = document.createElement('button');
                btn.className = 'voice-btn';
                btn.dataset.audio = file.dataUrl;
                btn.textContent = file.name;
                btn.addEventListener('click', () => {
                    player.playAudio(file.dataUrl, file.name);
                    document.querySelectorAll('.voice-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
                grid.appendChild(btn);
            });
            voicesContainer.appendChild(section);
        }

        // 列表
        if (files.length === 0) {
            listEl.innerHTML = '<li>暂无本地缓存文件</li>';
            if (emptyHint && emoteCards.length === 0) emptyHint.style.display = 'block';
        } else {
            files.forEach(file => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${file.type === 'emote' ? '表情' : '语音'} / ${file.category || '其他'} / ${file.name}</span><button data-id="${file.id}">删除</button>`;
                li.querySelector('button').addEventListener('click', async (e) => {
                    if (confirm('确定删除这个本地文件吗？')) {
                        await deleteLocalFile(e.target.dataset.id);
                        await renderLocalFiles();
                    }
                });
                listEl.appendChild(li);
            });
        }
    }

    renderLocalFiles();

    // ---- 表情管理（改名 + 多分类） ----
    async function updateEmoteMeta(file, name, categories) {
        const workerUrl = window.UPLOAD_WORKER_URL;
        if (!workerUrl) throw new Error('未配置上传 Worker');
        const password = sessionStorage.getItem('shadowleeAdminPwd');
        if (!password) throw new Error('请先登录');
        const res = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-upload-password': password },
            body: JSON.stringify({ action: 'updateMeta', file, name, categories }),
        });
        const text = await res.text();
        if (!res.ok) throw new Error(text);
        const item = (window.EMOTE_META.items || []).find(i => i.file === file);
        if (item) {
            item.name = name;
            item.categories = categories;
        }
    }

    function renderManageCategories() {
        const listEl = document.getElementById('manage-cat-list');
        if (!listEl) return;
        const meta = window.EMOTE_META || { items: [] };
        listEl.innerHTML = '';
        const base = (window.SITE_BASE || '/').replace(/\/$/, '');
        (meta.items || []).forEach(item => {
            const row = document.createElement('div');
            row.className = 'cat-row';
            row._file = item.file;
            row._origName = item.name;
            row._origCats = (item.categories || []).join(',');
            const imgSrc = `${base}/assets/images/emotes/${encodeURIComponent(item.file)}`;
            row.innerHTML = `
                <img class="manage-thumb" src="${imgSrc}" alt="${item.name}" loading="lazy">
                <input type="text" class="manage-name-input" value="${item.name}" placeholder="名字">
                <input type="text" class="manage-cat-input" value="${(item.categories || []).join(',')}" placeholder="分类，逗号分隔">
            `;
            listEl.appendChild(row);
        });

        // 批量保存按钮（只提交有改动的条目）
        const oldBtn = document.getElementById('manage-save-all');
        if (oldBtn) oldBtn.remove();
        const saveAllBtn = document.createElement('button');
        saveAllBtn.id = 'manage-save-all';
        saveAllBtn.className = 'control-btn';
        saveAllBtn.textContent = '批量保存修改';
        saveAllBtn.style.marginTop = '14px';
        saveAllBtn.addEventListener('click', saveAllChanges);
        listEl.insertAdjacentElement('afterend', saveAllBtn);
    }

    async function updateEmoteMetaBatch(items) {
        const workerUrl = window.UPLOAD_WORKER_URL;
        if (!workerUrl) throw new Error('未配置上传 Worker');
        const password = sessionStorage.getItem('shadowleeAdminPwd');
        if (!password) throw new Error('请先登录');
        const res = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-upload-password': password },
            body: JSON.stringify({ action: 'updateMetaBatch', items }),
        });
        const text = await res.text();
        if (!res.ok) throw new Error(text);
        const local = window.EMOTE_META.items || [];
        items.forEach(it => {
            const m = local.find(i => i.file === it.file);
            if (m) { m.name = it.name; m.categories = it.categories; }
        });
    }

    async function saveAllChanges() {
        const listEl = document.getElementById('manage-cat-list');
        if (!listEl) return;
        const rows = listEl.querySelectorAll('.cat-row');
        const items = [];
        rows.forEach(row => {
            const nameInput = row.querySelector('.manage-name-input');
            const catInput = row.querySelector('.manage-cat-input');
            const name = nameInput.value.trim();
            if (!name) return;
            const cats = catInput.value.split(',').map(s => s.trim()).filter(Boolean);
            const origCats = (row._origCats || '').split(',').map(s => s.trim()).filter(Boolean);
            const changed = name !== (row._origName || '') || cats.join(',') !== origCats.join(',');
            if (changed) items.push({ file: row._file, name, categories: cats });
        });
        if (items.length === 0) { alert('没有改动需要保存'); return; }
        if (!confirm(`确认批量保存 ${items.length} 处修改？`)) return;
        try {
            await updateEmoteMetaBatch(items);
            alert(`已批量保存 ${items.length} 项，等待 Pages 自动部署后生效`);
            rows.forEach(row => {
                const nameInput = row.querySelector('.manage-name-input');
                const catInput = row.querySelector('.manage-cat-input');
                row._origName = nameInput.value.trim();
                row._origCats = catInput.value.split(',').map(s => s.trim()).filter(Boolean).join(',');
            });
        } catch (err) {
            alert('保存失败：' + err.message);
        }
    }

    renderManageCategories();

    // 管理员登录
    const adminToggle = document.getElementById('admin-toggle');
    const adminPanel = document.getElementById('admin-panel');
    const loginModal = document.getElementById('login-modal');
    let isAdmin = false;

    function toggleModal(show) {
        loginModal.style.display = show ? 'flex' : 'none';
        if (show) document.getElementById('login-password')?.focus();
    }

    adminToggle?.addEventListener('click', () => {
        if (isAdmin) {
            logoutAdmin();
        } else {
            toggleModal(true);
        }
    });

    document.getElementById('login-cancel')?.addEventListener('click', () => toggleModal(false));

    document.getElementById('login-submit')?.addEventListener('click', async () => {
        const input = document.getElementById('login-password');
        const password = input.value;
        const hash = await sha256(password);
        // 当前密码：lidousha22966160@
        if (hash === 'a0e38159cc99457da4a7e8252bb8bf9ac26d96cbb1b953d76682502438003256') {
            isAdmin = true;
            adminPanel.style.display = 'block';
            adminToggle.textContent = '退出管理';
            toggleModal(false);
            sessionStorage.setItem('shadowleeAdminPwd', password);
            input.value = '';
        } else {
            alert('密码错误');
            input.value = '';
        }
    });

    function logoutAdmin() {
        isAdmin = false;
        adminPanel.style.display = 'none';
        adminToggle.textContent = '管理登录';
        sessionStorage.removeItem('shadowleeAdminPwd');
    }

    document.getElementById('admin-logout')?.addEventListener('click', logoutAdmin);

    // 上传 Tab
    const uploadTabs = document.querySelectorAll('.upload-tab');
    const uploadForms = document.querySelectorAll('.upload-form');
    uploadTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.upload;
            uploadTabs.forEach(t => t.classList.remove('active'));
            uploadForms.forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`upload-${target}-form`).classList.add('active');
        });
    });

    // 上传辅助函数：优先写入 GitHub 仓库，未配置 Worker 则回退本地
    async function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function safeFilename(name) {
        return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    }

    async function uploadFile(type, file, category, name) {
        const ext = file.name.split('.').pop() || (type === 'emote' ? 'png' : 'mp3');
        const dataUrl = await readFileAsDataURL(file);
        const base64 = dataUrl.split(',')[1];
        const workerUrl = window.UPLOAD_WORKER_URL;

        // 支持逗号分隔的多分类
        const categories = (category || '').split(',').map(s => s.trim()).filter(Boolean);

        if (!workerUrl) {
            await saveLocalFile({
                id: `${type}_${Date.now()}`,
                type,
                category: categories[0] || 'other',
                categories,
                name,
                dataUrl,
                timestamp: Date.now()
            });
            return { ok: true, local: true };
        }

        const password = sessionStorage.getItem('shadowleeAdminPwd');
        if (!password) {
            alert('请先重新登录获取上传授权');
            return { ok: false };
        }

        const action = type === 'emote' ? 'upload' : 'upload-voice';
        const res = await fetch(workerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-upload-password': password,
            },
            body: JSON.stringify({ action, name, ext, content: base64, categories }),
        });

        const text = await res.text();
        if (!res.ok) {
            throw new Error(text || `HTTP ${res.status}`);
        }

        return { ok: true, worker: true, ...JSON.parse(text) };
    }

    async function uploadBatch(items, categories) {
        const workerUrl = window.UPLOAD_WORKER_URL;
        if (!workerUrl) {
            // 无 Worker 时回退本地存储
            for (const it of items) {
                const mime = it.ext === 'jpg' ? 'image/jpeg' : `image/${it.ext}`;
                await saveLocalFile({
                    id: `emote_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                    type: 'emote',
                    category: categories[0] || 'other',
                    categories,
                    name: it.name,
                    dataUrl: `data:${mime};base64,${it.content}`,
                    timestamp: Date.now(),
                });
            }
            return { ok: true, local: true, files: items.map(i => i.name) };
        }
        const password = sessionStorage.getItem('shadowleeAdminPwd');
        if (!password) {
            alert('请先重新登录获取上传授权');
            return null;
        }
        const res = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-upload-password': password },
            body: JSON.stringify({ action: 'uploadBatch', type: 'emote', items, categories }),
        });
        const text = await res.text();
        if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
        return { ok: true, ...JSON.parse(text) };
    }

    // 上传表情（支持多文件批量）
    document.getElementById('upload-emote-btn')?.addEventListener('click', async () => {
        const categoryInput = document.getElementById('upload-emote-category');
        const fileInput = document.getElementById('upload-emote-file');
        const files = Array.from(fileInput.files || []);
        if (files.length === 0) { alert('请选择图片'); return; }

        try {
            const items = [];
            for (const file of files) {
                const ext = (file.name.split('.').pop() || 'png').toLowerCase();
                const dataUrl = await readFileAsDataURL(file);
                const content = dataUrl.split(',')[1];
                const name = file.name.replace(/\.[^.]+$/, '');
                items.push({ name, ext, content });
            }
            const categories = (categoryInput.value || '').split(',').map(s => s.trim()).filter(Boolean);
            const result = await uploadBatch(items, categories);
            if (!result || !result.ok) return;
            categoryInput.value = '';
            fileInput.value = '';
            await renderLocalFiles();
            alert(`已上传 ${result.files.length} 张到 GitHub 仓库，请等待 Pages 自动部署（约 30 秒 ~ 2 分钟）`);
        } catch (e) {
            alert('上传失败：' + e.message);
        }
    });

    // 上传语音
    document.getElementById('upload-voice-btn')?.addEventListener('click', async () => {
        const categoryInput = document.getElementById('upload-voice-category');
        const nameInput = document.getElementById('upload-voice-name');
        const fileInput = document.getElementById('upload-voice-file');
        const file = fileInput.files[0];
        if (!file) { alert('请选择音频'); return; }
        if (!nameInput.value.trim()) { alert('请填写语音名称'); return; }

        try {
            const result = await uploadFile('voice', file, categoryInput.value, nameInput.value);
            if (!result.ok) return;
            categoryInput.value = '';
            nameInput.value = '';
            fileInput.value = '';
            await renderLocalFiles();
            alert(result.local
                ? '已保存到本地浏览器（未配置 Worker）'
                : '已上传到 GitHub 仓库，请等待 Pages 自动部署（约 30 秒 ~ 2 分钟）');
        } catch (e) {
            alert('上传失败：' + e.message);
        }
    });

    // 清空本地缓存
    document.getElementById('clear-local')?.addEventListener('click', async () => {
        if (confirm('确定清空所有本地缓存文件吗？')) {
            await clearLocalFiles();
            await renderLocalFiles();
        }
    });

    // 随机挑选一个表情到上方预览区
    document.getElementById('refresh-emotes')?.addEventListener('click', () => {
        const visible = Array.from(document.querySelectorAll('.emote-card')).filter(c => c.style.display !== 'none');
        if (visible.length === 0) return;
        const randomCard = visible[Math.floor(Math.random() * visible.length)];
        emoteCards.forEach(c => c.classList.remove('active'));
        randomCard.classList.add('active');
        setPreview(randomCard.dataset.name, randomCard.dataset.src);
    });

    // 随机切换 space 背景图
    const bgLayer = document.getElementById('bg-layer');
    if (bgLayer) {
        const base = (window.SITE_BASE || '/').replace(/\/$/, '');
        const bgCount = 6;
        const n = Math.floor(Math.random() * bgCount) + 1;
        bgLayer.style.backgroundImage = `url("${base}/assets/images/space/space-bg-${n}.jpg")`;
    }
});
