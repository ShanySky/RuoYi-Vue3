export const aiPageCapabilityCatalog = [
  ['/system/user', '用户管理'],
  ['/system/user-auth/role/*', '分配角色'],
  ['/system/role', '角色管理'],
  ['/system/menu', '菜单管理'],
  ['/system/dept', '部门管理'],
  ['/system/post', '岗位管理'],
  ['/system/dict', '字典类型'],
  ['/system/notice', '通知公告'],
  ['/monitor/online', '在线用户'],
  ['/monitor/job', '定时任务'],
  ['/monitor/logininfor', '登录日志'],
  ['/monitor/operlog', '操作日志'],
  ['/monitor/cache', '缓存监控'],
  ['/monitor/cacheList', '缓存列表'],
  ['/monitor/server', '服务监控']
].map(([route, pageName]) => ({ route, pageName }))
