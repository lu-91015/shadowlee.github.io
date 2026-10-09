---
layout: default
title: 沙按钮
description: 点击按钮播放语音 / 浏览表情
---

<!-- 全屏背景图层（space 背景图，由脚本随机切换） -->
<div class="bg-layer" id="bg-layer"></div>

<!-- 顶部导航栏 -->
<nav class="navbar">
  <div class="nav-container">
    <div class="nav-left">
      <a href="/" class="site-title">
        <span>沙按钮</span>
      </a>
    </div>
    <div class="nav-right">
      <div class="nav-item">
        <a href="https://space.bilibili.com/1703797642/" target="_blank" rel="noopener" class="bilibili-link" title="B站空间">
          <svg class="bilibili-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="#FB7299" d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
          </svg>
        </a>
      </div>
      <div class="nav-item volume-hint">请注意音量大小</div>
      <div class="nav-item">
        <a href="https://www.bilibili.com/video/BV12c411D7j4" target="_blank" rel="noopener" class="listen-song">点我听歌</a>
      </div>
      <div class="nav-item">
        <a href="https://www.bilibili.com/video/BV1Z2bpznEag" target="_blank" rel="noopener" class="listen-song">支持百合厨女子的恋爱理论</a>
      </div>
      <div class="nav-item">
        <button id="admin-toggle" class="admin-link">管理登录</button>
      </div>
    </div>
  </div>
</nav>

<!-- Tab 切换 -->
<div class="tab-bar">
  <button class="tab-btn active" data-tab="emotes">表情</button>
  <button class="tab-btn" data-tab="voices">语音</button>
  <button class="tab-btn" data-tab="games">游戏</button>
</div>

<!-- 主内容区域 -->
<div class="main-content">

  <!-- 表情面板 -->
  <section id="emotes-panel" class="tab-panel active">
    <!-- 大图预览 -->
    <div class="emote-preview">
      <div class="emote-preview-title" id="emote-preview-title">请选择表情</div>
      <div class="emote-preview-img">
        <img id="emote-preview-img" alt="表情预览" style="display:none;">
        <div id="emote-preview-placeholder" class="preview-placeholder">暂无预览</div>
      </div>
    </div>

    <!-- 分类筛选（根据 meta 中的实际分类动态生成） -->
    {% assign meta = site.data.emotes_meta %}
    {% assign dynamic_categories = "" | split: "" %}
    {% for item in meta.items %}
      {% for cat in item.categories %}
        {% unless dynamic_categories contains cat %}
          {% assign dynamic_categories = dynamic_categories | push: cat %}
        {% endunless %}
      {% endfor %}
    {% endfor %}
    <div class="filter-bar">
      <span class="filter-label">按分类筛选：</span>
      <div class="filter-tags" id="emote-filters">
        <button class="filter-tag active" data-filter="all">全部</button>
        {% for cat in dynamic_categories %}
          <button class="filter-tag" data-filter="{{ cat }}">{{ cat }}</button>
        {% endfor %}
        <button class="filter-tag" data-filter="other">其他</button>
      </div>
      <button class="refresh-btn" id="refresh-emotes" title="随机挑选一个表情包到上面">↻</button>
    </div>

    <!-- 表情网格 -->
    <div class="emotes-grid" id="emotes-grid">
      {% if meta and meta.items and meta.items.size > 0 %}
        {% for item in meta.items %}
          <div class="emote-card" data-categories="{% if item.categories and item.categories.size > 0 %}{{ item.categories | join: ',' }}{% else %}other{% endif %}" data-name="{{ item.name }}" data-src="{{ '/assets/images/emotes/' | append: item.file | relative_url }}">
            <div class="emote-thumb">
              <img src="{{ '/assets/images/emotes/' | append: item.file | relative_url }}" alt="{{ item.name }}" loading="lazy">
            </div>
            <div class="emote-name">{{ item.name }}</div>
          </div>
        {% endfor %}
      {% else %}
        <div class="empty-hint">
          还没有表情图片~<br>
          登录管理面板上传，或在 <code>assets/images/emotes/</code> 放入图片。
        </div>
      {% endif %}
    </div>
  </section>

  <!-- 语音面板 -->
  <section id="voices-panel" class="tab-panel">
    <!-- 待播放条 -->
    <div class="now-playing-bar">
      <span class="now-playing-label">待播放：</span>
      <span class="now-playing-text" id="now-playing">暂无播放</span>
    </div>

    <!-- 控制区 -->
    <div class="voice-controls">
      <button id="random-btn" class="control-btn">帮我选一个</button>
      <button id="stop-btn" class="control-btn">停止</button>
      <label class="checkbox-label">
        <input type="checkbox" id="allow-overlap">
        <span>允许声音重叠</span>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" id="dont-stop">
        <span>播放不要停下来</span>
      </label>
    </div>

    <!-- 语音分类 -->
    <div class="voices-container">
      {% for cat in site.data.voices.categories %}
        {% capture path_match %}/assets/audio/{{ cat.id }}/{% endcapture %}
        {% assign files = site.static_files | where_exp:"file", "file.path contains path_match" %}
        {% if files.size > 0 %}
          <section class="voice-category" data-dir="{{ cat.id }}">
            <h3>{{ cat.name }}</h3>
            <div class="buttons-grid">
              {% for file in files %}
                {% assign name = file.name | split: "." | first %}
                <button class="voice-btn" data-audio="{{ file.path | relative_url }}">{{ name }}</button>
              {% endfor %}
            </div>
          </section>
        {% endif %}
      {% endfor %}
    </div>
  </section>

  <!-- 游戏面板 -->
  <section id="games-panel" class="tab-panel">
    <div class="games-grid">
      <button type="button" class="game-card" data-game="slot" aria-label="打开熊猫老虎机">
        <span class="game-card-icon" aria-hidden="true">🎰</span>
        <span class="game-card-text">
          <span class="game-card-name">熊猫老虎机</span>
          <span class="game-card-desc">从 500 分转到 1000 分，三档难度</span>
        </span>
        <span class="game-card-best" data-best-for="slot"></span>
      </button>
      <button type="button" class="game-card" data-game="breakout" aria-label="打开熊猫打砖块">
        <span class="game-card-icon" aria-hidden="true">🧱</span>
        <span class="game-card-text">
          <span class="game-card-name">熊猫打砖块</span>
          <span class="game-card-desc">清空砖块进入下一关，越往后球越快</span>
        </span>
        <span class="game-card-best" data-best-for="breakout"></span>
      </button>
      <button type="button" class="game-card" data-game="merge" aria-label="打开合成熊猫">
        <span class="game-card-icon" aria-hidden="true">🐼</span>
        <span class="game-card-text">
          <span class="game-card-name">合成熊猫</span>
          <span class="game-card-desc">两个相同的表情球碰在一起，合成更大的一个</span>
        </span>
        <span class="game-card-best" data-best-for="merge"></span>
      </button>
      <button type="button" class="game-card" data-game="flappy" aria-label="打开李豆沙 Flappy">
        <span class="game-card-icon" aria-hidden="true">🧹</span>
        <span class="game-card-text">
          <span class="game-card-name">李豆沙 Flappy</span>
          <span class="game-card-desc">骑着扫帚穿过竹林，别撞上竹子</span>
        </span>
        <span class="game-card-best" data-best-for="flappy"></span>
      </button>
      <button type="button" class="game-card" data-game="jump" aria-label="打开熊猫跳一跳">
        <span class="game-card-icon" aria-hidden="true">🐾</span>
        <span class="game-card-text">
          <span class="game-card-name">熊猫跳一跳</span>
          <span class="game-card-desc">按住蓄力、松开起跳，落在台子正中心有连击</span>
        </span>
        <span class="game-card-best" data-best-for="jump"></span>
      </button>
      <button type="button" class="game-card" data-game="number" aria-label="打开熊猫大胃王">
        <span class="game-card-icon" aria-hidden="true">🍽️</span>
        <span class="game-card-text">
          <span class="game-card-name">熊猫大胃王</span>
          <span class="game-card-desc">吃掉数字比你小的熊猫，长到 22966160 就赢</span>
        </span>
        <span class="game-card-best" data-best-for="number"></span>
      </button>
    </div>
  </section>


  <!-- 管理上传面板（默认隐藏，登录后显示） -->
  <section id="admin-panel" class="admin-panel" style="display:none;">
    <div class="admin-header">
      <h3>本地管理</h3>
      <button id="admin-logout" class="control-btn small">退出登录</button>
    </div>
    <p class="admin-tip">此功能把文件暂存在当前浏览器中，仅本地可见。如需永久保存，请把文件放进仓库后重新部署。</p>

    <div class="upload-tabs">
      <button class="upload-tab active" data-upload="emote">上传表情</button>
      <button class="upload-tab" data-upload="voice">上传语音</button>
    </div>

    <div class="upload-form active" id="upload-emote-form">
      <label>分类前缀（用于筛选，多分类用逗号分隔）：</label>
      <input type="text" id="upload-emote-category" placeholder="cute">
      <label>选择图片（可多选批量上传，名称取文件名）：</label>
      <input type="file" id="upload-emote-file" accept="image/*" multiple>
      <button id="upload-emote-btn" class="control-btn">批量上传表情</button>
    </div>

    <div class="upload-form" id="upload-voice-form">
      <label>分类目录（如 cute / 日常）：</label>
      <input type="text" id="upload-voice-category" placeholder="日常">
      <label>语音名称：</label>
      <input type="text" id="upload-voice-name" placeholder="拜拜，快滚吧">
      <label>选择音频：</label>
      <input type="file" id="upload-voice-file" accept="audio/*">
      <button id="upload-voice-btn" class="control-btn">上传语音</button>
    </div>

    <div class="local-files">
      <h4>本地缓存列表</h4>
      <ul id="local-files-list"></ul>
      <button id="clear-local" class="control-btn small danger">清空本地缓存</button>
    </div>

    <div class="manage-categories">
      <h4>管理表情（支持改名与多分类，用逗号分隔）</h4>
      <div id="manage-cat-list"></div>
    </div>
  </section>

  <!-- 密码弹窗 -->
  <div id="login-modal" class="modal" style="display:none;">
    <div class="modal-content">
      <h3>管理员登录</h3>
      <input type="password" id="login-password" placeholder="输入密码">
      <div class="modal-actions">
        <button id="login-cancel" class="control-btn small">取消</button>
        <button id="login-submit" class="control-btn small">登录</button>
      </div>
    </div>
  </div>

  <!-- 底部信息区域 -->
  <footer class="simple-footer">
    <p>音频与表情来源直播和B站投稿</p>
    <p class="footer-links-line">友情链接: 暂无</p>
    <p class="github-line">
      <a href="https://github.com/lu-91015/shadowlee.github.io" target="_blank" rel="noopener">本项目</a>
      请在GitHub参与翻译、增补音频或提出建议
    </p>
    <p class="disclaimer-line">本站为爱好者作品，和PSPLIVE官方没有关联</p>
  </footer>
</div>
  <!-- 游戏弹窗 -->
  <div id="game-modal" class="game-modal" style="display:none;" aria-hidden="true">
    <div class="game-modal-backdrop" data-close-modal></div>
    <div class="game-modal-content" role="dialog" aria-modal="true" aria-labelledby="game-modal-title">
      <header class="game-head">
        <h2 class="game-head-title" id="game-modal-title"></h2>
        <button type="button" class="game-modal-close" data-close-modal aria-label="关闭游戏">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
        </button>
      </header>
      <div class="game-modal-body" id="game-modal-body">

        <div class="game-instance" id="game-slot" data-game="slot" data-title="熊猫老虎机" style="display:none;">
          <div class="game-hud">
            <span class="hud-chip"><span class="hud-label">得分</span><span class="hud-num" id="slot-score">500</span></span>
            <span class="hud-chip"><span class="hud-label">目标</span><span class="hud-num">1000</span></span>
            <span class="hud-chip"><span class="hud-label">每转</span><span class="hud-num" id="slot-bet">25</span></span>
          </div>
          <div class="slot-modes" role="group" aria-label="难度">
            <button type="button" class="slot-mode active" data-mode="easy">简单 · 3 轴</button>
            <button type="button" class="slot-mode" data-mode="normal">普通 · 4 轴</button>
            <button type="button" class="slot-mode" data-mode="hard">困难 · 5 轴</button>
          </div>
          <div class="slot-cabinet">
            <div class="slot-reels" id="slot-reels"></div>
            <div class="slot-result" id="slot-result" aria-live="polite">点“旋转”开始</div>
          </div>
          <div class="slot-actions">
            <button type="button" id="slot-spin" class="game-btn primary">旋转</button>
            <button type="button" id="slot-reset" class="game-btn">重开</button>
          </div>
          <div class="slot-info">
            <div class="slot-pool">
              <span class="slot-info-label">本局图池</span>
              <span class="slot-pool-list" id="slot-pool"></span>
            </div>
            <table class="slot-paytable" id="slot-paytable" aria-label="赔率"></table>
          </div>
        </div>

        <div class="game-instance" id="game-breakout" data-game="breakout" data-title="熊猫打砖块" style="display:none;">
          <div class="game-hud">
            <span class="hud-chip"><span class="hud-label">得分</span><span class="hud-num" id="breakout-score">0</span></span>
            <span class="hud-chip"><span class="hud-label">关卡</span><span class="hud-num" id="breakout-level">1</span></span>
            <span class="hud-chip"><span class="hud-label">生命</span><span class="hud-num hud-lives" id="breakout-lives">3</span></span>
            <span class="hud-chip best"><span class="hud-label">最高</span><span class="hud-num" id="breakout-best">0</span></span>
          </div>
          <div class="game-screen" style="--ratio: 420 / 620;">
            <canvas id="breakout-canvas" width="420" height="620"></canvas>
          </div>
          <p class="game-tip">移动鼠标或手指控制竹子挡板，也可以用 ← →；🐼 熊猫砖 30 分</p>
        </div>

        <div class="game-instance" id="game-merge" data-game="merge" data-title="合成熊猫" style="display:none;">
          <div class="game-hud">
            <span class="hud-chip"><span class="hud-label">得分</span><span class="hud-num" id="merge-score">0</span></span>
            <span class="hud-chip best"><span class="hud-label">最高</span><span class="hud-num" id="merge-best">0</span></span>
            <span class="hud-chip next"><span class="hud-label">下一个</span><img id="merge-next" alt="" width="26" height="26"></span>
          </div>
          <div class="game-screen" style="--ratio: 400 / 600;">
            <canvas id="merge-canvas" width="400" height="600"></canvas>
          </div>
          <p class="game-tip">左右移动选位置，点击掉落；按 P 暂停</p>
        </div>

        <div class="game-instance" id="game-flappy" data-game="flappy" data-title="李豆沙 Flappy" style="display:none;">
          <div class="game-hud">
            <span class="hud-chip best"><span class="hud-label">最高</span><span class="hud-num" id="flappy-best">0</span></span>
          </div>
          <div class="game-screen" style="--ratio: 400 / 600;">
            <canvas id="flappy-canvas" width="400" height="600"></canvas>
          </div>
          <p class="game-tip">点击画面或按空格往上飞</p>
        </div>

        <div class="game-instance" id="game-jump" data-game="jump" data-title="熊猫跳一跳" style="display:none;">
          <div class="game-hud">
            <span class="hud-chip"><span class="hud-label">得分</span><span class="hud-num" id="jump-score">0</span></span>
            <span class="hud-chip"><span class="hud-label">连击</span><span class="hud-num" id="jump-combo">0</span></span>
            <span class="hud-chip best"><span class="hud-label">最高</span><span class="hud-num" id="jump-best">0</span></span>
          </div>
          <div class="jump-skins" id="jump-skins" role="group" aria-label="选择角色"></div>
          <div class="game-screen jump-screen" style="--ratio: 400 / 600;">
            <canvas id="jump-canvas" width="400" height="600"></canvas>
            <div class="jump-pop-layer" id="jump-pop" aria-hidden="true"></div>
            <div class="jump-charge" id="jump-charge" hidden><span></span></div>
            <div class="jump-overlay" id="jump-overlay" hidden></div>
          </div>
          <p class="game-tip">按住画面或空格蓄力，松开起跳。角色模型来自 <a href="https://github.com/shaw-core/ShadowLee_It-s-MyGO-" target="_blank" rel="noopener">ShadowLee: It's MyGO!</a></p>
        </div>

        <div class="game-instance" id="game-number" data-game="number" data-title="熊猫大胃王" style="display:none;">
          <div class="game-hud">
            <span class="hud-chip"><span class="hud-label">我的数字</span><span class="hud-num" id="number-value">1</span></span>
            <span class="hud-chip"><span class="hud-label">吃掉</span><span class="hud-num" id="number-eaten">0</span></span>
            <span class="hud-chip best"><span class="hud-label">最高</span><span class="hud-num" id="number-best">0</span></span>
          </div>
          <div class="game-screen" style="--ratio: 400 / 600;">
            <canvas id="number-canvas" width="400" height="600"></canvas>
          </div>
          <p class="game-tip">鼠标或手指指向哪里就往哪里走，也可以用方向键 / WASD</p>
        </div>
      </div>
    </div>
  </div>


<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&display=swap">
<link rel="stylesheet" href="{{ '/assets/css/style.css' | relative_url }}?v=13">
<script>
  window.SITE_BASE = "{{ '/' | relative_url }}";
  // Cloudflare Worker 上传服务地址
  window.UPLOAD_WORKER_URL = "https://shadowlee.1557852185.workers.dev";
  // 表情元数据（构建时注入），用于分类管理与多分类渲染
  window.EMOTE_META = {{ site.data.emotes_meta | jsonify }};
</script>
<script src="{{ '/assets/js/player.js' | relative_url }}?v=13" defer></script>
<script src="{{ '/assets/js/game-modal.js' | relative_url }}?v=15" defer></script>
<script src="{{ '/assets/js/game-slot.js' | relative_url }}?v=13" defer></script>
<script src="{{ '/assets/js/game-breakout.js' | relative_url }}?v=13" defer></script>
<script src="{{ '/assets/js/game-merge.js' | relative_url }}?v=15" defer></script>
<script src="{{ '/assets/js/game-flappy.js' | relative_url }}?v=13" defer></script>
<script type="module" src="{{ '/assets/js/game-jump.js' | relative_url }}?v=13"></script>
<script src="{{ '/assets/js/game-number.js' | relative_url }}?v=16" defer></script>
