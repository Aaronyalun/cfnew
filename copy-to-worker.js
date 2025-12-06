const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, '少年你相信光吗');
const outFile = path.join(__dirname, 'worker.js');

try {
  const content = fs.readFileSync(srcFile, 'utf8');
  
  // 判断是否已是 ES module 导出或 worker 格式
  const isModule = /export\s+default|self\.addEventListener|addEventListener\(/.test(content);
  
  let workerCode;
  if (isModule) {
    // 若已是模块格式，直接使用
    workerCode = content;
  } else {
    // 否则包成标准 Worker 导出
    workerCode = `export default {
  async fetch(request, env, ctx) {
    // 自动复制的源文件内容：
${content.split('\n').map(line => '    ' + line).join('\n')}
  }
};`;
  }
  
  fs.writeFileSync(outFile, workerCode, 'utf8');
  console.log(`✓ 已将 "少年你相信光吗" 复制到 ${outFile}`);
} catch (err) {
  console.error('✗ 复制失败:', err.message);
  process.exit(1);
}
