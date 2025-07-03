// 移动端导航菜单交互脚本
document.addEventListener('DOMContentLoaded', () => {
    // 获取汉堡菜单按钮和导航菜单
    const hamburger = document.querySelector('.hamburger-menu');
    const navMenu = document.querySelector('.nav-menu');

    // 只有当页面上存在汉堡菜单时才执行
    if (hamburger && navMenu) {
        // 监听汉堡菜单的点击事件
        hamburger.addEventListener('click', () => {
            // 切换导航菜单的 'active' 类
            navMenu.classList.toggle('active');
        });
    }
}); 