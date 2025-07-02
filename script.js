// 严格模式，有助于编写更安全的代码
"use strict";

// --- DOM 元素获取 ---
const uploadBox = document.querySelector('.upload-box');
const fileInput = document.getElementById('file-input');
const resultArea = document.getElementById('result-area');
const imageGrid = document.getElementById('image-grid');
const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');
const downloadBtn = document.getElementById('download-btn');

// --- 全局状态管理 ---
// 使用一个数组来管理所有待处理和已处理的图片
let imageQueue = []; 

// --- 事件监听器 ---

// 1. 点击上传区域，触发文件选择
uploadBox.addEventListener('click', () => fileInput.click());

// 2. 处理拖拽事件
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.style.backgroundColor = '#f0f7ff';
});
uploadBox.addEventListener('dragleave', () => {
    uploadBox.style.backgroundColor = 'var(--container-bg-color)';
});
uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.style.backgroundColor = 'var(--container-bg-color)';
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

// 3. 用户通过文件输入框选择文件
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

// 4. 压缩质量滑块值改变时，重新压缩所有图片
qualitySlider.addEventListener('input', () => {
    const quality = qualitySlider.value;
    qualityValue.textContent = `${quality}%`;
    // 使用 debounce 或 throttle 会更优，但为了简单直观，这里直接调用
    recompressAll(quality / 100);
});

// 5. 点击下载全部按钮
downloadBtn.addEventListener('click', downloadAll);


// --- 核心功能函数 ---

/**
 * 处理用户上传的一批文件
 * @param {FileList} files 用户上传的文件列表
 */
function handleFiles(files) {
    // 将 FileList 转换为数组，并过滤掉非图片文件
    const imageFiles = [...files].filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        alert('No valid image files were selected.');
        return;
    }

    // 显示结果区域，隐藏上传框
    uploadBox.hidden = true;
    resultArea.hidden = false;

    // 为每个图片文件创建卡片并开始压缩流程
    imageFiles.forEach(file => {
        const fileId = `${file.name}-${file.lastModified}`; // 创建一个简易的唯一ID
        const card = createImageCard(file, fileId);
        imageGrid.appendChild(card);

        const imageEntry = {
            id: fileId,
            originalFile: file,
            dom: {
                card: card,
                previewImg: card.querySelector('.image-preview img'),
                compressedSizeEl: card.querySelector('.compressed-size'),
            },
            compressedBlob: null,
        };
        imageQueue.push(imageEntry);
        compressImage(imageEntry, qualitySlider.value / 100);
    });
}

/**
 * 为单个图片文件创建 DOM 卡片结构
 * @param {File} file 原始文件
 * @param {string} id 文件的唯一ID
 * @returns {HTMLElement} 创建好的卡片元素
 */
function createImageCard(file, id) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.dataset.id = id;

    card.innerHTML = `
        <div class="image-preview">
            <img src="${URL.createObjectURL(file)}" alt="Preview of ${file.name}">
        </div>
        <div class="image-info">
            <p class="file-name" title="${file.name}">${file.name}</p>
            <p class="file-size">Original: ${formatBytes(file.size)}</p>
            <p class="compressed-size">Compressed: ...</p>
        </div>
    `;
    return card;
}

/**
 * 压缩单个图片
 * @param {object} imageEntry 图片在队列中的条目
 * @param {number} quality 压缩质量 (0-1)
 */
async function compressImage(imageEntry, quality) {
    const { originalFile, dom } = imageEntry;
    
    // 使用 canvas.toBlob() 方法，这是异步的，性能更好
    try {
        const blob = await imageToBlob(originalFile, quality);
        imageEntry.compressedBlob = blob;
        dom.compressedSizeEl.textContent = `Compressed: ${formatBytes(blob.size)}`;
    } catch (error) {
        console.error('Compression failed:', error);
        dom.compressedSizeEl.textContent = 'Compression Failed';
    }
}

/**
 * 当滑块变动时，重新压缩所有图片
 * @param {number} quality 新的压缩质量
 */
function recompressAll(quality) {
    imageQueue.forEach(entry => {
        compressImage(entry, quality);
    });
}

/**
 * 下载所有压缩后的图片为一个 ZIP 文件
 */
async function downloadAll() {
    if (imageQueue.some(entry => !entry.compressedBlob)) {
        alert('Some images are still being compressed. Please wait.');
        return;
    }

    downloadBtn.textContent = 'Zipping...';
    downloadBtn.disabled = true;

    try {
        const zip = new JSZip();
        
        // 将每个压缩后的 blob 添加到 zip 文件中
        imageQueue.forEach(entry => {
            const { originalFile, compressedBlob } = entry;
            const originalName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.'));
            const fileName = `${originalName}-q${qualitySlider.value}.jpg`;
            zip.file(fileName, compressedBlob);
        });

        // 生成 zip 文件并触发下载
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'compressed_images.zip');
        
    } catch (error) {
        console.error('Failed to create ZIP file:', error);
        alert('An error occurred while creating the ZIP file.');
    } finally {
        downloadBtn.textContent = 'Download All (.zip)';
        downloadBtn.disabled = false;
    }
}


// --- 辅助函数 ---

/**
 * 将 File 对象通过 Canvas 压缩并转换为 Blob
 * @param {File} file 原始文件
 * @param {number} quality 压缩质量
 * @returns {Promise<Blob>} 返回一个包含 Blob 的 Promise
 */
function imageToBlob(file, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // 异步将 canvas 内容转换为 blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * 格式化文件大小
 * @param {number} bytes 文件字节数
 * @returns {string} 格式化后的字符串
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
} 