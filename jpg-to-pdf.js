// 严格模式
"use strict";

// --- DOM 元素获取 (JPG to PDF 页面) ---
const uploadBox = document.getElementById('upload-box-pdf');
const fileInput = document.getElementById('file-input-pdf');
const resultArea = document.getElementById('result-area-pdf');
const imageGrid = document.getElementById('image-grid-pdf');
const downloadBtn = document.getElementById('download-btn-pdf');
const addMoreBtn = document.getElementById('add-more-btn');

// --- 全局状态管理 ---
let imageFiles = []; // 存储用户上传的 File 对象

// jsPDF 库从 window 对象中获取，因为它是由 CDN 引入的
const { jsPDF } = window.jspdf;

// --- 事件监听器 ---

// 1. 点击上传区域，触发文件选择
uploadBox.addEventListener('click', () => fileInput.click());
addMoreBtn.addEventListener('click', () => fileInput.click());


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

// 4. 点击下载按钮，开始转换
downloadBtn.addEventListener('click', convertToPdf);


// --- 核心功能函数 ---

/**
 * 处理用户上传的一批文件
 * @param {FileList} files 用户上传的文件列表
 */
function handleFiles(files) {
    const newFiles = [...files].filter(file => file.type === 'image/jpeg');

    if (newFiles.length === 0) {
        alert('Please select valid JPG or JPEG files.');
        return;
    }
    
    // 将新文件添加到现有队列
    imageFiles.push(...newFiles);

    // 显示结果区域，隐藏初始上传框
    uploadBox.hidden = true;
    resultArea.hidden = false;
    
    // 为新文件创建预览卡片
    newFiles.forEach(file => {
        const card = createImageCard(file);
        imageGrid.appendChild(card);
    });
}

/**
 * 为单个图片文件创建 DOM 卡片结构
 * @param {File} file 原始文件
 * @returns {HTMLElement} 创建好的卡片元素
 */
function createImageCard(file) {
    const card = document.createElement('div');
    card.className = 'image-card';
    
    const fileUrl = URL.createObjectURL(file);
    
    card.innerHTML = `
        <div class="image-preview">
            <img src="${fileUrl}" alt="Preview of ${file.name}">
        </div>
        <div class="image-info">
            <p class="file-name" title="${file.name}">${file.name}</p>
            <p class="file-size">${formatBytes(file.size)}</p>
        </div>
    `;
    return card;
}

/**
 * 将所有上传的图片转换为一个 PDF 文件
 */
async function convertToPdf() {
    if (imageFiles.length === 0) {
        alert('No images to convert!');
        return;
    }

    downloadBtn.textContent = 'Converting...';
    downloadBtn.disabled = true;

    try {
        // 创建一个 A4 尺寸的 PDF (单位：毫米)
        const pdf = new jsPDF('p', 'mm', 'a4');
        const a4Width = 210;
        const a4Height = 297;

        // 异步地、逐一地处理每个图片
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const dataUrl = await readFileAsDataURL(file);
            const img = await loadImage(dataUrl);

            // 计算图片在 A4 页面中的最佳尺寸
            const imgRatio = img.width / img.height;
            const a4Ratio = a4Width / a4Height;

            let imgWidth, imgHeight;
            if (imgRatio > a4Ratio) {
                // 图片比 A4 纸更宽
                imgWidth = a4Width;
                imgHeight = a4Width / imgRatio;
            } else {
                // 图片比 A4 纸更高
                imgHeight = a4Height;
                imgWidth = a4Height * imgRatio;
            }

            // 如果不是第一页，则添加新页面
            if (i > 0) {
                pdf.addPage();
            }

            // 将图片添加到 PDF，居中放置
            const x = (a4Width - imgWidth) / 2;
            const y = (a4Height - imgHeight) / 2;
            pdf.addImage(img, 'JPEG', x, y, imgWidth, imgHeight);
        }

        // 保存 PDF 文件
        pdf.save('converted-from-TinyImagePro.pdf');

    } catch (error) {
        console.error('Failed to convert to PDF:', error);
        alert('An error occurred during PDF conversion.');
    } finally {
        downloadBtn.textContent = 'Convert & Download as PDF';
        downloadBtn.disabled = false;
    }
}


// --- 辅助函数 ---

/**
 * 将 File 对象读取为 Base64 data URL
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * 从 data URL 加载图片
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
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