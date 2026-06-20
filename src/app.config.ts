export default defineAppConfig({
  pages: [
    'pages/sampling/index',
    'pages/verify/index',
    'pages/signoff/index',
    'pages/verify-detail/index',
    'pages/signoff-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2563EB',
    navigationBarTitleText: '监理实测实量',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#94A3B8',
    selectedColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/sampling/index',
        text: '抽检计划'
      },
      {
        pagePath: 'pages/verify/index',
        text: '现场复核'
      },
      {
        pagePath: 'pages/signoff/index',
        text: '签认记录'
      }
    ]
  }
})
