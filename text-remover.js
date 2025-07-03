document.addEventListener('DOMContentLoaded', () => {
    // --- 获取DOM元素 ---
    const uploadBox = document.getElementById('upload-box-remover');
    const fileInput = document.getElementById('file-input-remover');
    const editorArea = document.getElementById('editor-area');
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    const brushSizeSlider = document.getElementById('brush-size');
    const removeTextBtn = document.getElementById('remove-text-btn');
    const instructions = document.querySelector('.editor-instructions');

    // 为画笔涂抹创建一个独立的、不可见的Canvas，用于生成蒙版
    // 这样可以确保我们发送给API的蒙版数据是纯净的，并且与原图分离
    const maskDrawingCanvas = document.createElement('canvas');
    const maskDrawingCtx = maskDrawingCanvas.getContext('2d');

    let originalImage = null; // 用于存储原始未修改的图片
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    const apiKey = '3e14cc0a9a9b6efd4c3d3e4d8af437e13dba8a756730948e69bc6373a1899716e4f10461d549d13e50ccc308e6c65398';

    // --- 事件监听 ---

    // 点击上传区域时触发文件选择
    uploadBox.addEventListener('click', () => fileInput.click());

    // 拖拽文件
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    });
    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('dragover');
    });
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // 文件选择
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // 处理文件并加载到Canvas
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file (PNG or JPG).');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            originalImage.onload = () => {
                editorArea.hidden = false;
                uploadBox.hidden = true;
                setupCanvas();
            };
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 设置Canvas尺寸并绘制初始图片
    function setupCanvas() {
        const containerWidth = canvas.parentElement.clientWidth;
        const scale = containerWidth / originalImage.width;
        canvas.width = containerWidth;
        canvas.height = originalImage.height * scale;

        // 同时也设置离屏蒙版Canvas的尺寸，并确保它是干净的
        maskDrawingCanvas.width = canvas.width;
        maskDrawingCanvas.height = canvas.height;
        maskDrawingCtx.clearRect(0, 0, maskDrawingCanvas.width, maskDrawingCanvas.height);

        // 在可见的Canvas上绘制图片
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    }
    
    // --- 在Canvas上绘制涂抹区域 ---
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    });
    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) drawBrush(e.offsetX, e.offsetY);
    });
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);

    function drawBrush(x, y) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = brushSizeSlider.value;
        
        // 在可见的Canvas上绘制红色笔刷，给用户提供视觉反馈
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // 同时，在离屏的蒙版Canvas上绘制同样的笔迹
        // 这个Canvas只记录笔迹，不包含原图
        maskDrawingCtx.lineJoin = ctx.lineJoin;
        maskDrawingCtx.lineCap = ctx.lineCap;
        maskDrawingCtx.lineWidth = ctx.lineWidth;
        maskDrawingCtx.strokeStyle = 'white'; // 在蒙版上直接用白色绘制即可
        maskDrawingCtx.beginPath();
        maskDrawingCtx.moveTo(lastX, lastY);
        maskDrawingCtx.lineTo(x, y);
        maskDrawingCtx.stroke();

        [lastX, lastY] = [x, y];
    }
    
    // --- API 调用与处理 ---
    removeTextBtn.addEventListener('click', async () => {
        if (!originalImage) return;

        setLoadingState(true);

        // 1. 创建原始图片文件 (image_file)
        const imageBlob = await getCanvasBlob(originalImage);

        // 2. 根据涂抹创建蒙版文件 (mask_file)
        const maskBlob = await createMaskBlob();

        // 3. 创建 FormData 并调用API
        const formData = new FormData();
        formData.append('image_file', imageBlob, 'image.png');
        formData.append('mask_file', maskBlob, 'mask.png');

        try {
            const response = await fetch('https://clipdrop-api.co/cleanup/v1', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                },
                body: formData,
            });

            if (response.ok) {
                const imageBuffer = await response.arrayBuffer();
                const resultBlob = new Blob([imageBuffer], { type: 'image/png' });
                const resultUrl = URL.createObjectURL(resultBlob);
                const resultImage = new Image();
                resultImage.onload = () => {
                    originalImage = resultImage; // 将处理后的图片作为新的原始图片，方便再次编辑
                    setupCanvas(); // 重新绘制到Canvas上
                };
                resultImage.src = resultUrl;
                instructions.textContent = 'Success! You can continue editing or download the image.';
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            alert('An unexpected error occurred. Please check your network connection.');
            console.error(error);
        } finally {
            setLoadingState(false);
        }
    });

    // 从原始图片创建Blob
    function getCanvasBlob(img) {
        return new Promise(resolve => {
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = img.width;
            offscreenCanvas.height = img.height;
            const offscreenCtx = offscreenCanvas.getContext('2d');
            offscreenCtx.drawImage(img, 0, 0);
            offscreenCanvas.toBlob(resolve, 'image/png');
        });
    }

    // 从涂抹的Canvas创建黑白蒙版Blob
    function createMaskBlob() {
        return new Promise(resolve => {
            // 1. 创建一个最终的、与原始图片同样大小的蒙版Canvas
            const finalMaskCanvas = document.createElement('canvas');
            finalMaskCanvas.width = originalImage.width;
            finalMaskCanvas.height = originalImage.height;
            const finalMaskCtx = finalMaskCanvas.getContext('2d');
            
            // 2. 将我们记录的纯笔迹（来自离屏Canvas），拉伸绘制到最终的蒙版上
            //    这就解决了原图和蒙版尺寸不一致的问题
            finalMaskCtx.drawImage(maskDrawingCanvas, 0, 0, originalImage.width, originalImage.height);

            // 3. 遍历像素，生成API要求的纯黑白蒙版
            const imageData = finalMaskCtx.getImageData(0, 0, finalMaskCanvas.width, finalMaskCanvas.height);
            const maskImageData = finalMaskCtx.createImageData(finalMaskCanvas.width, finalMaskCanvas.height);

            // 任何被涂抹过的区域（alpha > 0），在最终蒙版里都设为纯白色
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (imageData.data[i + 3] > 0) { // 检查Alpha通道
                    maskImageData.data[i] = 255;
                    maskImageData.data[i + 1] = 255;
                    maskImageData.data[i + 2] = 255;
                    maskImageData.data[i + 3] = 255;
                }
            }
            finalMaskCtx.putImageData(maskImageData, 0, 0);
            
            // 4. 从最终的蒙版Canvas生成Blob文件
            finalMaskCanvas.toBlob(resolve, 'image/png');
        });
    }

    // 设置加载状态
    function setLoadingState(isLoading) {
        if (isLoading) {
            removeTextBtn.disabled = true;
            removeTextBtn.textContent = 'Processing...';
            instructions.textContent = 'Our AI is working its magic... Please wait.';
        } else {
            removeTextBtn.disabled = false;
            removeTextBtn.textContent = 'Remove Text';
        }
    }

    // 响应式调整
    window.addEventListener('resize', () => {
        if (originalImage) setupCanvas();
    });
}); 