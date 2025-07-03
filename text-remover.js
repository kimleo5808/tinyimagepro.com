document.addEventListener('DOMContentLoaded', () => {
    // --- 获取DOM元素 ---
    const uploadBox = document.getElementById('upload-box-remover');
    const fileInput = document.getElementById('file-input-remover');
    const editorArea = document.getElementById('editor-area');
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    const brushSizeSlider = document.getElementById('brush-size');
    const removeTextBtn = document.getElementById('remove-text-btn');

    let image = null;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // --- 事件监听 ---

    // 点击上传区域时触发文件选择
    uploadBox.addEventListener('click', () => fileInput.click());

    // 拖拽文件到上传区域
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
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 通过文件输入框选择文件
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // 处理文件并加载到Canvas
    function handleFile(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                image = new Image();
                image.onload = () => {
                    // 显示编辑器，隐藏上传框
                    editorArea.hidden = false;
                    uploadBox.hidden = true;
                    // 设置Canvas尺寸并绘制图片
                    setupCanvas();
                };
                image.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload a valid image file (PNG or JPG).');
        }
    }

    // 设置Canvas尺寸并绘制初始图片
    function setupCanvas() {
        // 根据图片尺寸和容器宽度调整Canvas大小
        const containerWidth = canvas.parentElement.clientWidth;
        const scale = containerWidth / image.width;
        canvas.width = containerWidth;
        canvas.height = image.height * scale;

        // 绘制图片到Canvas
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    
    // --- 在Canvas上绘制 ---

    // 绘制开始
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    });

    // 绘制过程
    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            drawBrush(e.offsetX, e.offsetY);
        }
    });

    // 绘制结束
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);

    // 绘制涂抹笔刷的函数
    function drawBrush(x, y) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = brushSizeSlider.value;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // 半透明红色笔刷
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        [lastX, lastY] = [x, y];
    }
    
    // "移除文字"按钮的点击事件 (占位符)
    removeTextBtn.addEventListener('click', () => {
        // 在这里，将来会调用AI API进行处理
        // 这是一个复杂的后端或API任务
        alert('AI Text Remover functionality is in development. This requires a server-side AI model or a third-party API to process the image.');
        
        // 示例：如何将Canvas内容转换为可发送到API的数据
        /*
        canvas.toBlob((blob) => {
            const formData = new FormData();
            formData.append('image_file', blob, 'image.png');
            // formData.append('mask_file', ...); // 您还需要发送一个蒙版文件
            
            // fetch('YOUR_API_ENDPOINT', {
            //     method: 'POST',
            //     body: formData,
            //     headers: { 'x-api-key': 'YOUR_API_KEY' }
            // }).then(...);
        }, 'image/png');
        */
    });

    // 窗口大小改变时重新设置Canvas，保持响应式
    window.addEventListener('resize', () => {
        if (image) {
            setupCanvas();
        }
    });
}); 