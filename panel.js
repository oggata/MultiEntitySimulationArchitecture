// パネルのドラッグ機能を実装
function setupPanelDrag() {
    const panels = ['control-panel', 'info-panel', 'log-panel'];
    
    panels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        const header = panel.querySelector('.panel-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        // 最小化ボタンの設定
        const minimizeBtn = panel.querySelector('.minimize-btn');
        minimizeBtn.addEventListener('click', () => {
            panel.classList.toggle('panel-minimized');
            minimizeBtn.textContent = panel.classList.contains('panel-minimized') ? '□' : '−';
        });

        // 閉じるボタンの設定
        const closeBtn = panel.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        // ドラッグ開始
        header.addEventListener('mousedown', dragStart);

        // ドラッグ中
        document.addEventListener('mousemove', drag);

        // ドラッグ終了
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header || e.target.parentNode === header) {
                isDragging = true;
                window.setPanelDragging(true); // パネルドラッグ開始
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, panel);
            }
        }

        function dragEnd() {
            if (isDragging) {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                window.setPanelDragging(false); // パネルドラッグ終了
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate(${xPos}px, ${yPos}px)`;
        }
    });
}

// パネルのHTMLを更新
function updatePanelHTML() {
    const panels = {
        'control-panel': '🔧 制御パネル',
        'info-panel': '👥 エージェント情報',
        'log-panel': '📝 活動ログ'
    };

    Object.entries(panels).forEach(([id, title]) => {
        const panel = document.getElementById(id);
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3 class="panel-title">${title}</h3>
            <div class="panel-controls">
                <button class="panel-button minimize-btn">−</button>
                <button class="panel-button close-btn">×</button>
            </div>
        `;
        panel.insertBefore(header, panel.firstChild);
    });
}
