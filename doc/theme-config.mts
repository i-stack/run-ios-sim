export default {
	// 导航栏
	navData() {
		return [
			{ text: '首页', link: '/' },
			{ text: 'iOS', link: '/deep/', activeMatch: '/deep/' },
			{ text: '算法', link: '/algorithm/', activeMatch: '/algorithm/' },
		]
	},

	// 侧边栏
	sidebarData() {
		return {
			'/deep/': [
				{
					text: '底层原理',
					// link: '/deep/',
					collapsed: true,
					items: [
						{
							items: [
								{ text: '01_OC对象的本质', link: '/deep/essence' },
								{ text: '02_OC对象的分类', link: '/deep/category' },
								{ text: '03_isa指针', link: '/deep/isa' },
							]
						}
					]
				},
			],

			'/algorithm/': [
				{
					text: '算法',
					link: '/algorithm/',
					items: [
						{
							items: [
								{ text: '01_排序算法', link: '/algorithm/sort' },
							]
						}
					]
				}
			]
		}
	},
	
	rewrites() {
		const dic: Record<string, string> = {}; 
		// dic['/doc/deep/01_OC对象的本质.md'] = 'iOS/OC/essence.md';
		return dic
	}
}