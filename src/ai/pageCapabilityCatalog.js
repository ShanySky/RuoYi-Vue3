import { systemUserPageContract } from './pages/systemUserPageCapability.js'

const legacyPageCapabilities = [

  ['/system/user-auth/role/*', '分配角色'],
  ['/system/role', '角色管理'],
  ['/system/role-auth/user/*', '角色分配用户'],
  ['/system/menu', '菜单管理'],
  ['/system/dept', '部门管理'],
  ['/system/post', '岗位管理'],
  ['/system/dict', '字典类型'],
  ['/system/dict-data/index/*', '字典数据'],
  ['/system/notice', '通知公告'],
  ['/user/profile', '个人中心'],
  ['/monitor/online', '在线用户'],
  ['/monitor/job', '定时任务'],
  ['/monitor/job-log/index/*', '调度日志'],
  ['/monitor/logininfor', '登录日志'],
  ['/monitor/operlog', '操作日志'],
  ['/monitor/cache', '缓存监控'],
  ['/monitor/cacheList', '缓存列表'],
  ['/monitor/server', '服务监控'],
  ['/monitor/druid', '数据监控'],
  ['/tool/gen', '代码生成'],
  ['/tool/gen-edit/index/*', '修改生成配置'],
  ['/tool/build', '表单构建'],
  ['/tool/swagger', '系统接口']
]

export const aiPageCapabilityCatalog = [
  { route: systemUserPageContract.route, pageName: systemUserPageContract.pageName },
  ...legacyPageCapabilities.map(([route, pageName]) => ({ route, pageName }))
]
