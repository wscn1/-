let currentImageData = null;
let allImages = [];
let activeTag = null;
let currentImageIndex = -1;

// 主题切换功能
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    
    // 更新主题图标
    const themeIcon = document.querySelector('.theme-icon');
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    
    // 保存主题设置到本地存储
    localStorage.setItem('theme', newTheme);
}

// 初始化主题
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeIcon = document.querySelector('.theme-icon');
    themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
});

// 添加键盘事件监听
document.addEventListener('keydown', (e) => {
    if (!currentImageData || allImages.length === 0) return;
    
    // 获取当前图片在数组中的索引
    if (currentImageIndex === -1) {
        currentImageIndex = allImages.findIndex(img => img.image_path === currentImageData.image_path);
    }
    
    let newIndex = currentImageIndex;
    
    // 左方向键：上一张图片
    if (e.key === 'ArrowLeft') {
        newIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
    }
    // 右方向键：下一张图片
    else if (e.key === 'ArrowRight') {
        newIndex = (currentImageIndex + 1) % allImages.length;
    }
    
    if (newIndex !== currentImageIndex) {
        currentImageIndex = newIndex;
        showPreview(allImages[currentImageIndex]);
    }
});

function scanFolder() {
    const folderPath = document.getElementById('folderPath').value;
    if (!folderPath) {
        alert('请输入文件夹路径');
        return;
    }

    fetch('/scan_folders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder_path: folderPath })
    })
    .then(response => response.json())
    .then(data => {
        displayImages(data);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('扫描文件夹时出错');
    });
}

function displayImages(images) {
    allImages = images;
    currentImageIndex = -1; // 重置图片索引
    updateTagStats(images);
    renderFilteredImages(images);
}

function renderFilteredImages(images) {
    const container = document.getElementById('imageContainer');
    container.innerHTML = '';

    const filteredImages = activeTag 
        ? images.filter(img => img.annotation.includes(activeTag))
        : images;

    filteredImages.forEach(imageData => {
        const div = document.createElement('div');
        div.className = 'image-item';
        
        const img = document.createElement('img');
        // 修改：确保路径正确编码
        const thumbnailPath = encodeURIComponent(imageData.image_path);
        img.src = `/thumbnail/${thumbnailPath}`;
        img.alt = imageData.image_path.split('/').pop();
        img.loading = 'lazy';
        
        img.onerror = () => {
            console.error('缩略图加载失败:', imageData.image_path);
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="100%" height="100%" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666">加载失败</text></svg>';
        };
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'image-name';
        nameLabel.textContent = imageData.image_path.split('/').pop();
        
        div.appendChild(img);
        div.appendChild(nameLabel);
        div.onclick = () => showPreview(imageData);
        container.appendChild(div);
    });
}

function showPreview(imageData) {
    currentImageData = imageData;
    const previewImage = document.getElementById('previewImage');
    
    // 修改：确保路径正确编码
    const imagePath = encodeURIComponent(imageData.image_path);
    previewImage.src = `/image/${imagePath}`;
    document.getElementById('annotation').value = imageData.annotation;
    
    previewImage.onerror = () => {
        console.error('图片加载失败:', imageData.image_path);
        alert('图片加载失败');
        previewImage.src = '';
    };
}

function updateTagStats(images) {
    const tagCounts = {};
    images.forEach(img => {
        const tags = img.annotation.split(',')  // 改用逗号分隔
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    const statsContainer = document.getElementById('tagStats');
    statsContainer.innerHTML = '';

    Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([tag, count]) => {
            const tagElement = document.createElement('div');
            tagElement.className = `tag-item ${tag === activeTag ? 'active' : ''}`;
            tagElement.innerHTML = `
                <span>${tag}</span>
                <span class="tag-count">${count}</span>
                <span class="tag-delete" title="删除此标注">×</span>
            `;
            
            // 点击标签筛选
            tagElement.querySelector('span:first-child').onclick = (e) => {
                e.stopPropagation();
                filterByTag(tag);
            };
            
            // 点击删除按钮删除标注
            tagElement.querySelector('.tag-delete').onclick = (e) => {
                e.stopPropagation();
                deleteBatchAnnotation(tag);
            };
            
            statsContainer.appendChild(tagElement);
        });
}

// 添加新的删除函数
function deleteBatchAnnotation(tagToDelete) {
    if (confirm(`确定要删除所有图片中的标注"${tagToDelete}"吗？`)) {
        allImages.forEach(imageData => {
            const tags = imageData.annotation.split(',')  // 改用逗号分隔
                .map(tag => tag.trim())
                .filter(tag => tag !== tagToDelete);
            
            const newAnnotation = tags.join(',');  // 用逗号重新连接

            fetch('/save_annotation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    txt_path: imageData.txt_path,
                    content: newAnnotation
                })
            });

            imageData.annotation = newAnnotation;
        });

        // 更新界面
        updateTagStats(allImages);
        if (currentImageData) {
            showPreview(currentImageData);
        }
        if (activeTag === tagToDelete) {
            activeTag = null;
        }
        renderFilteredImages(allImages);
        alert('标注删除完成');
    }
}

function filterByTag(tag) {
    activeTag = activeTag === tag ? null : tag;
    renderFilteredImages(allImages);
    updateTagStats(allImages);
}

// 添加防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 修改保存函数
const debouncedSave = debounce((content, path) => {
    fetch('/save_annotation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            txt_path: path,
            content: content
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('保存成功');
        } else {
            alert('保存失败: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('保存时出错');
    });
}, 500);

// 修改批量添加函数中的保存逻辑
function addBatchAnnotation() {
    const content = document.getElementById('batchAnnotation').value.trim();
    if (!content) {
        alert('请输入要添加的标注内容');
        return;
    }

    const position = document.getElementById('insertPosition').value;
    const confirmMsg = `确定要将"${content}"添加到所有图片的${position === 'start' ? '开头' : '结尾'}吗？`;
    
    if (confirm(confirmMsg)) {
        allImages.forEach(imageData => {
            const currentAnnotation = imageData.annotation.trim();
            const newAnnotation = position === 'start'
                ? currentAnnotation ? `${content},${currentAnnotation}` : content
                : currentAnnotation ? `${currentAnnotation},${content}` : content;

            fetch('/save_annotation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    txt_path: imageData.txt_path,
                    content: newAnnotation
                })
            });

            imageData.annotation = newAnnotation;
        });

        updateTagStats(allImages);
        if (currentImageData) {
            showPreview(currentImageData);
        }
        alert('批量添加完成');
    }
}

function showPreview(imageData) {
    currentImageData = imageData;
    const previewImage = document.getElementById('previewImage');
    
    // 修改：确保路径正确编码
    const imagePath = encodeURIComponent(imageData.image_path);
    previewImage.src = `/image/${imagePath}`;
    document.getElementById('annotation').value = imageData.annotation;
    
    previewImage.onerror = () => {
        console.error('图片加载失败:', imageData.image_path);
        alert('图片加载失败');
        previewImage.src = '';
    };
}

function saveAnnotation() {
    if (!currentImageData) {
        return;
    }

    const content = document.getElementById('annotation').value;
    
    fetch('/save_annotation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            txt_path: currentImageData.txt_path,
            content: content
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新当前图片的标注
            currentImageData.annotation = content;
            // 更新高频标注统计
            updateTagStats(allImages);
            // 更新图片列表
            renderFilteredImages(allImages);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}