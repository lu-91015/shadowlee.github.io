---
layout: default
title: 沙按钮
description: 点击按钮播放语音
---

<!-- 顶部导航栏 -->
<nav class="navbar">
  <div class="nav-container">
    <!-- 左侧：网站标题 -->
    <div class="nav-left">
      <a href="/" class="site-title">沙按钮</a>
    </div>
    
    <!-- 右侧：导航链接 -->
    <div class="nav-right">
      <div class="nav-item">
        <a href="https://space.bilibili.com/1703797642/" target="_blank" rel="noopener" class="bilibili-link">
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
    </div>
  </div>
</nav>

<!-- 主内容区域 -->
<div class="main-content">
  <!-- 控制面板 -->
  <section class="control-panel">
    <div class="control-title">操作控制</div>
    <div class="controls">
      <button id="random-btn" class="control-btn">帮我选一个</button>
      <button id="stop-btn" class="control-btn">停止</button>
    </div>
    <div class="checkboxes">
      <div class="checkbox-container">
        <input type="checkbox" id="allow-overlap">
        <label for="allow-overlap">允许声音重叠</label>
      </div>
      <div class="checkbox-container">
        <input type="checkbox" id="dont-stop">
        <label for="dont-stop">播放不要停下来</label>
      </div>
    </div>
    <div class="now-playing" id="now-playing">暂无播放</div>
  </section>

  <!-- 语音分类区域 -->
  <!-- 嘎吱语音 -->
  <section class="voice-category">
    <h3>gachi语音</h3>
    <div class="buttons-grid">
      {% assign gachi_files = site.static_files | where_exp:"file", "file.path contains '/assets/audio/gachi/'" %}
      {% for file in gachi_files %}
        {% assign name = file.name | split: "." | first %}
        <button class="voice-btn" data-audio="{{ file.path | relative_url }}">
          {{ name }}
        </button>
      {% endfor %}
    </div>
  </section>

  <!-- 对线语音 -->
  <section class="voice-category">
    <h3>对线语音</h3>
    <div class="buttons-grid">
      {% assign duixian_files = site.static_files | where_exp:"file", "file.path contains '/assets/audio/duixian/'" %}
      {% for file in duixian_files %}
        {% assign name = file.name | split: "." | first %}
        <button class="voice-btn" data-audio="{{ file.path | relative_url }}">
          {{ name }}
        </button>
      {% endfor %}
    </div>
  </section>

  <!-- 杂项语音 -->
  <section class="voice-category">
    <h3>杂项语音</h3>
    <div class="buttons-grid">
      {% assign other_files = site.static_files | where_exp:"file", "file.path contains '/assets/audio/other/'" %}
      {% for file in other_files %}
        {% assign name = file.name | split: "." | first %}
        <button class="voice-btn" data-audio="{{ file.path | relative_url }}">
          {{ name }}
        </button>
      {% endfor %}
    </div>
  </section>

  <!-- 底部信息区域 -->
  <footer class="simple-footer">
    <p>音频来源直播和B站投稿</p>
    <p class="footer-links-line">
      友情链接: 暂无
    </p>
    <p class="github-line">
      <a href="https://github.com/lu-91015/shadowlee.github.io#" target="_blank" rel="noopener">本项目</a>
      请在GitHub参与翻译、增补音频或提出建议
    </p>
    <p class="disclaimer-line">本站为爱好者作品, 和PSPLIVE官方没有关联</p>
  </footer>
</div>

<!-- 引入样式和脚本 -->
<link rel="stylesheet" href="{{ '/assets/css/style.css' | relative_url }}">
<script src="{{ '/assets/js/player.js' | relative_url }}" defer></script>