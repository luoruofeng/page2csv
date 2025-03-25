document.addEventListener('DOMContentLoaded', function() {
  const loadingElement = document.getElementById('loading');
  const contentElement = document.getElementById('content');
  const linksTableElement = document.getElementById('links-table');
  const selectAllCheckbox = document.getElementById('select-all');
  const exportCsvButton = document.getElementById('export-csv');
  
  let links = [];
  
  // 获取当前活动标签页
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    
    // 延迟1秒后执行脚本
    setTimeout(() => {
      // 在当前页面执行脚本获取所有链接
      chrome.scripting.executeScript({
        target: {tabId: activeTab.id},
        function: getAllLinks
      }, (results) => {
        if (chrome.runtime.lastError || !results || !results[0]) {
          loadingElement.textContent = '获取链接失败: ' + (chrome.runtime.lastError ? chrome.runtime.lastError.message : '未知错误');
          return;
        }
        
        links = results[0].result;
        
        // 显示链接
        displayLinks(links);
        
        // 隐藏加载提示，显示内容
        loadingElement.style.display = 'none';
        contentElement.style.display = 'block';
      });
    }, 1000); // 1秒延迟
  });
  
  // 全选/取消全选功能
  selectAllCheckbox.addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('#links-table input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = selectAllCheckbox.checked;
    });
    updateExportButtonState();
  });
  
  // 导出CSV按钮点击事件
  exportCsvButton.addEventListener('click', function() {
    exportToCSV();
  });
  
  // 更新导出按钮状态
  function updateExportButtonState() {
    const checkedBoxes = document.querySelectorAll('#links-table input[type="checkbox"]:checked');
    exportCsvButton.disabled = checkedBoxes.length === 0;
  }
  
  // 显示链接到表格中
  function displayLinks(links) {
    if (links.length === 0) {
      linksTableElement.innerHTML = '<tr><td colspan="3">没有找到链接</td></tr>';
      return;
    }
    
    let html = '';
    links.forEach((link, index) => {
      // 检查是否为当前页面URL（最后一个链接是当前页面URL）
      const isCurrentPage = index === links.length - 1;
      html += `
        <tr>
          <td><input type="checkbox" data-index="${index}" ${isCurrentPage ? 'checked' : ''}></td>
          <td class="title-cell" title="${link.text}">${link.text}</td>
          <td class="url-cell" title="${link.url}">${link.url}</td>
        </tr>
      `;
    });
    
    linksTableElement.innerHTML = html;
    
    // 为每个复选框添加change事件
    document.querySelectorAll('#links-table input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', updateExportButtonState);
    });
    
    // 初始化导出按钮状态
    updateExportButtonState();
  }
  
  // 导出为CSV
  function exportToCSV() {
    const checkedBoxes = document.querySelectorAll('#links-table input[type="checkbox"]:checked');
    if (checkedBoxes.length === 0) return;
    
    let csvContent = '链接地址,标题\n';
    
    checkedBoxes.forEach(checkbox => {
      const index = checkbox.getAttribute('data-index');
      const link = links[index];
      // 处理CSV中的特殊字符
      const escapedText = link.text.replace(/"/g, '""');
      const escapedUrl = link.url.replace(/"/g, '""');
      csvContent += `"${escapedUrl}","${escapedText}"\n`;
    });
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 使用chrome.downloads API下载文件
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `links_${timestamp}.csv`;
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
  }
});

// 在页面上执行的函数，获取所有链接
function getAllLinks() {
  const links = [];
  const pageUrl = window.location.href;
  const allLinks = document.querySelectorAll('a');
  
  allLinks.forEach(link => {
    const href = link.href;
    const text = link.textContent.trim() || '无标题';
    const videoTitleSpan = link.querySelector('span#video-title');
    
    // 筛选YouTube视频链接：URL以https://www.youtube.com/watch?v=开头，且包含id为video-title的span
    if (href && 
        href.startsWith('https://www.youtube.com/watch?v=') && 
        videoTitleSpan) {
      links.push({
        url: href,
        text: videoTitleSpan.textContent.trim() || '无标题'
      });
    }
  });
  
  // 添加当前页面URL
  links.push({
    url: pageUrl,
    text: document.title || '当前页面'
  });
  
  return links;
}