// 音频播放管理器
class AudioPlayer {
    constructor() {
        this.currentAudio = null;
        this.allowOverlap = false;
        this.nowPlayingElement = document.getElementById('now-playing');
    }

    // 播放音频
    playAudio(audioUrl, buttonText) {
        // 如果不允许声音重叠，停止当前播放
        if (!this.allowOverlap && this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }

        // 创建新的音频对象
        const audio = new Audio(audioUrl);

        audio.addEventListener('loadedmetadata', () => {
            this.updateNowPlaying(buttonText, audio.duration);
        });

        audio.addEventListener('ended', () => {
            this.nowPlayingElement.textContent = '暂无播放';
            this.currentAudio = null;
        });

        audio.addEventListener('error', (e) => {
            console.error('音频播放失败:', e);
            this.nowPlayingElement.textContent = '播放失败';
        });

        // 播放音频
        audio.play().catch(error => {
            console.error('播放失败:', error);
            alert('音频播放失败，请检查音频文件路径或格式');
        });

        this.currentAudio = audio;
    }

    // 停止播放
    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.nowPlayingElement.textContent = '暂无播放';
            this.currentAudio = null;
        }
    }

    // 更新"正在播放"显示
    updateNowPlaying(text, duration) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        this.nowPlayingElement.textContent =
            `${text} (${minutes}:${seconds.toString().padStart(2, '0')})`;
    }

    // 随机选择语音
    randomPlay(buttons) {
        if (buttons.length === 0) return;

        const activeButtons = Array.from(buttons).filter(btn =>
            !btn.disabled && btn.dataset.audio
        );

        if (activeButtons.length === 0) {
            alert('没有可播放的语音');
            return;
        }

        const randomBtn = activeButtons[Math.floor(Math.random() * activeButtons.length)];
        this.playAudio(randomBtn.dataset.audio, randomBtn.textContent);
    }

    // 设置声音重叠
    setAllowOverlap(allow) {
        this.allowOverlap = allow;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    const player = new AudioPlayer();
    const voiceButtons = document.querySelectorAll('.voice-btn');
    const stopBtn = document.getElementById('stop-btn');
    const randomBtn = document.getElementById('random-btn');
    const overlapCheckbox = document.getElementById('allow-overlap');
    const volumeWarning = document.querySelector('.listen-song');
    const dontStopCheckbox = document.getElementById('dont-stop');

    // 音量提示点击事件
    if (volumeWarning) {
        volumeWarning.addEventListener('click', () => {
            alert('🎵 播放前请注意调整音量！');
        });
    }

    if (dontStopCheckbox) {
        dontStopCheckbox.addEventListener('change', (e) => {
            if (player.currentAudio) {
                player.currentAudio.loop = e.target.checked;
            }
        });
    }

    // 语音按钮点击事件
    voiceButtons.forEach(button => {
        button.addEventListener('click', () => {
            const audioUrl = button.dataset.audio;
            if (audioUrl) {
                player.playAudio(audioUrl, button.textContent);
            }
        });
    });

    // 控制按钮事件
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            player.stopAudio();
        });
    }

    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            player.randomPlay(voiceButtons);
        });
    }

    if (overlapCheckbox) {
        overlapCheckbox.addEventListener('change', (e) => {
            player.setAllowOverlap(e.target.checked);
        });
    }

    // 全局键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            player.stopAudio();
        } else if (e.key === ' ') {
            e.preventDefault();
            player.randomPlay(voiceButtons);
        }
    });
});