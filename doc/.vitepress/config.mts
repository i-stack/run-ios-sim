import { defineConfig } from 'vitepress'
import themeConfig from '../theme-config.mjs' 

export default defineConfig({
	title: "iOSInsight",
	description: "iOSInsight 是一个致力于分享和记录iOS开发经验的专业网站。",
	themeConfig: {
		logo: "https://data.freelibrary.top/img/head.jpeg",
		nav: themeConfig.navData(),
		sidebar: themeConfig.sidebarData(),
		socialLinks: [
			{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }
		],
		outline: {
    		label: '目录',
			level: [2, 6]
		},
		docFooter: {
			prev: '上一页',
			next: '下一页'
		},
	},
	markdown: {
		container: {
			tipLabel: '提示',
			warningLabel: '警告',
			dangerLabel: '危险',
			infoLabel: '信息',
			detailsLabel: '详细信息'
		},
		lineNumbers: true
	},
	sitemap: {
		hostname: 'https://freelibrary.top',
		// transformItems: (items) => {
		//   // 添加新选项或修改/过滤现有选项
		//   	items.push({
		// 		url: '/extra-page',
		// 		changefreq: 'monthly',
		// 		priority: 0.8
		//   	})
		//   	return items
		// }
	},
	vite: {
		build: {
			chunkSizeWarningLimit: 1500,
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (id.includes('node_modules')) {
							return id.toString().split('node_modules/')[1].split('/')[0].toString();
						}
					}
				}
			}
		},
	},
	cleanUrls: true,
	head: [
		[
			'script',
			{},
			`
			window._hmt = window._hmt || [];
			(function() {
				var hm = document.createElement("script");
				hm.src = "https://hm.baidu.com/hm.js?d7081b62deb4d103aca073589b382ffd";
				var s = document.getElementsByTagName("script")[0];
				s.parentNode.insertBefore(hm, s);
			})();`
		],
		[
			'meta', 
			{ 
				name: 'baidu-site-verification', 
				content: 'codeva-1ikdMmThse' 
			}
		]
	],
	rewrites: themeConfig.rewrites()
})
