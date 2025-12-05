const fs = require('fs');
const path = require('path');

function detectJsLike(src) {
	// 简单检测是否像 JS 模块/脚本
	return /\b(export\s+default|module\.exports|exports\.|self\.addEventListener|addEventListener\(|function\s+fetch\b|async\s+function\s+fetch\b)/.test(src);
}

function guessContentType(src) {
	const t = src.trim();
	if (/^</.test(t)) return 'text/html; charset=utf-8';
	if (/^\{[\s\S]*\}$/.test(t)) return 'application/json; charset=utf-8';
	return 'text/plain; charset=utf-8';
}

function makeWorkerFromJs(src) {
	// 若已是 ESM 导出或 worker 风格，直接返回
	if (/\bexport\s+default\b/.test(src) || /self\.addEventListener|addEventListener\(/.test(src)) {
		return src;
	}
	// 将简单的 CommonJS module.exports 替换为 ESM export default
	if (/\bmodule\.exports\s*=/.test(src)) {
		return src.replace(/\bmodule\.exports\s*=/, 'export default');
	}
	// 如果看起来像普通函数/脚本，包成 export default fetch handler
	return `export default {
	async fetch(request, env, ctx) {
		// 自动包装原始脚本内容（被当作函数体或脚本片段）
${src.split('\n').map(line => '		' + line).join('\n')}
	}
};`;
}

function makeWorkerFromAsset(src) {
	const ctype = guessContentType(src);
	const bodyEscaped = src.replace(/`/g, '\\`');
	return `export default {
  async fetch(request, env, ctx) {
    const body = \`${bodyEscaped}\`;
    return new Response(body, {
      headers: { "Content-Type": "${ctype}" }
    });
  }
};`;
}

function main() {
	const args = process.argv.slice(2);
	if (args.length < 2) {
		console.error('Usage: node convert-to-worker.js <source-file> <output-worker-js>');
		process.exit(2);
	}
	const [srcPath, outPath] = args;
	const absSrc = path.resolve(srcPath);
	const absOut = path.resolve(outPath);

	if (!fs.existsSync(absSrc)) {
		console.error('Source file not found:', absSrc);
		process.exit(3);
	}

	const src = fs.readFileSync(absSrc, 'utf8');

	let outContent;
	if (detectJsLike(src)) {
		outContent = makeWorkerFromJs(src);
	} else {
		outContent = makeWorkerFromAsset(src);
	}

	fs.writeFileSync(absOut, outContent, 'utf8');
	console.log('Generated worker:', absOut);
}

if (require.main === module) main();
