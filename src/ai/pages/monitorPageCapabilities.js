import { definePageCapabilityContract } from '../pageCapabilityContract.js'

export const monitorOnlinePageContract = definePageCapabilityContract({
  pageId: 'monitor-online',
  pageName: '在线用户',
  route: '/monitor/online',
  toolPrefix: 'page_monitor_online',
  queryFields: [
    { key: 'ipaddr', label: '登录地址' },
    { key: 'userName', label: '用户名称' }
  ],
  query: { permission: 'monitor:online:list' },
  actions: [
    {
      suffix: 'force_logout',
      permission: 'monitor:online:forceLogout',
      label: '强制在线会话退出',
      inputSchema: { type: 'object', properties: { tokenId: { type: 'string' } }, required: ['tokenId'], additionalProperties: false }
    }
  ]
})

export const monitorJobPageContract = definePageCapabilityContract({
  pageId: 'monitor-job',
  pageName: '定时任务',
  route: '/monitor/job',
  toolPrefix: 'page_monitor_job',
  queryFields: [
    { key: 'jobName', label: '任务名称' },
    { key: 'jobGroup', label: '任务组' },
    { key: 'status', label: '状态', options: ['0', '1'], description: '0正常，1暂停' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  formFields: [
    { key: 'jobName', label: '任务名称', required: true },
    { key: 'jobGroup', label: '任务组', required: true },
    { key: 'invokeTarget', label: '调用目标字符串', required: true },
    { key: 'cronExpression', label: 'Cron 表达式', required: true },
    { key: 'misfirePolicy', label: '执行策略', options: ['1', '2', '3'] },
    { key: 'concurrent', label: '是否并发', options: ['0', '1'] },
    { key: 'status', label: '状态', options: ['0', '1'] }
  ],
  query: { permission: 'monitor:job:list' },
  form: {
    addPermission: 'monitor:job:add',
    editPermission: 'monitor:job:edit',
    recordIdKey: 'jobId',
    recordIdLabel: '任务ID'
  },
  actions: [
    {
      suffix: 'view', permission: 'monitor:job:query', label: '查看任务详情',
      inputSchema: { type: 'object', properties: { jobId: { type: 'integer' } }, required: ['jobId'], additionalProperties: false }
    },
    {
      suffix: 'change_status', permission: 'monitor:job:changeStatus', label: '启用或暂停任务',
      inputSchema: {
        type: 'object',
        properties: { jobId: { type: 'integer' }, status: { type: 'string', enum: ['0', '1'] } },
        required: ['jobId', 'status'],
        additionalProperties: false
      }
    },
    {
      suffix: 'run_now', permission: 'monitor:job:changeStatus', label: '立即执行一次任务',
      inputSchema: {
        type: 'object',
        properties: { jobId: { type: 'integer' }, jobGroup: { type: 'string' } },
        required: ['jobId', 'jobGroup'],
        additionalProperties: false
      }
    },
    {
      suffix: 'delete', permission: 'monitor:job:remove', label: '删除定时任务',
      inputSchema: {
        type: 'object',
        properties: { jobIds: { type: 'array', items: { type: 'integer' } } },
        required: ['jobIds'],
        additionalProperties: false
      }
    },
    { suffix: 'export', permission: 'monitor:job:export', label: '按当前查询条件导出定时任务' }
  ]
})

export const monitorJobLogPageContract = definePageCapabilityContract({
  pageId: 'monitor.job.log',
  pageName: '调度日志',
  route: '/monitor/job-log/index/*',
  toolPrefix: 'page_monitor_job_log',
  queryFields: [
    { key: 'jobName', label: '任务名称' },
    { key: 'jobGroup', label: '任务组' },
    { key: 'status', label: '执行状态' },
    { key: 'dateRange', label: '执行时间范围', type: 'array', itemType: 'string' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  query: { permission: 'monitor:job:list' },
  actions: [
    {
      suffix: 'view', permission: 'monitor:job:query', label: '查看调度日志详情',
      inputSchema: { type: 'object', properties: { jobLogId: { type: 'integer' } }, required: ['jobLogId'], additionalProperties: false }
    },
    {
      suffix: 'delete', permission: 'monitor:job:remove', label: '删除调度日志',
      inputSchema: {
        type: 'object',
        properties: { jobLogIds: { type: 'array', items: { type: 'integer' } } },
        required: ['jobLogIds'],
        additionalProperties: false
      }
    },
    { suffix: 'clean', permission: 'monitor:job:remove', label: '清空全部调度日志' },
    { suffix: 'export', permission: 'monitor:job:export', label: '按当前查询条件导出调度日志' }
  ]
})

export const monitorLogininforPageContract = definePageCapabilityContract({
  pageId: 'monitor-logininfor',
  pageName: '登录日志',
  route: '/monitor/logininfor',
  toolPrefix: 'page_monitor_logininfor',
  queryFields: [
    { key: 'ipaddr', label: '登录地址' },
    { key: 'userName', label: '用户名称' },
    { key: 'status', label: '登录状态', options: ['0', '1'] },
    { key: 'dateRange', label: '登录时间范围', type: 'array', itemType: 'string' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  query: { permission: 'monitor:logininfor:list' },
  actions: [
    {
      suffix: 'delete', permission: 'monitor:logininfor:remove', label: '删除登录日志',
      inputSchema: {
        type: 'object',
        properties: { infoIds: { type: 'array', items: { type: 'integer' } } },
        required: ['infoIds'],
        additionalProperties: false
      }
    },
    { suffix: 'clean', permission: 'monitor:logininfor:remove', label: '清空全部登录日志' },
    {
      suffix: 'unlock', permission: 'monitor:logininfor:unlock', label: '解锁登录用户',
      inputSchema: { type: 'object', properties: { userName: { type: 'string' } }, required: ['userName'], additionalProperties: false }
    },
    { suffix: 'export', permission: 'monitor:logininfor:export', label: '按当前查询条件导出登录日志' }
  ]
})

export const monitorOperlogPageContract = definePageCapabilityContract({
  pageId: 'monitor-operlog',
  pageName: '操作日志',
  route: '/monitor/operlog',
  toolPrefix: 'page_monitor_operlog',
  queryFields: [
    { key: 'operIp', label: '操作地址' },
    { key: 'title', label: '系统模块' },
    { key: 'operName', label: '操作人员' },
    { key: 'businessType', label: '操作类型', type: 'integer' },
    { key: 'status', label: '操作状态', options: ['0', '1'] },
    { key: 'dateRange', label: '操作时间范围', type: 'array', itemType: 'string' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  query: { permission: 'monitor:operlog:list' },
  actions: [
    {
      suffix: 'view', permission: 'monitor:operlog:query', label: '查看操作日志详情',
      inputSchema: { type: 'object', properties: { operId: { type: 'integer' } }, required: ['operId'], additionalProperties: false }
    },
    {
      suffix: 'delete', permission: 'monitor:operlog:remove', label: '删除操作日志',
      inputSchema: {
        type: 'object',
        properties: { operIds: { type: 'array', items: { type: 'integer' } } },
        required: ['operIds'],
        additionalProperties: false
      }
    },
    { suffix: 'clean', permission: 'monitor:operlog:remove', label: '清空全部操作日志' },
    { suffix: 'export', permission: 'monitor:operlog:export', label: '按当前查询条件导出操作日志' }
  ]
})

export const monitorCachePageContract = definePageCapabilityContract({
  pageId: 'monitor-cache',
  pageName: '缓存监控',
  route: '/monitor/cache',
  toolPrefix: 'page_monitor_cache',
  actions: [
    { suffix: 'view', permission: 'monitor:cache:list', label: '查看 Redis 缓存运行指标' }
  ]
})

export const monitorCacheListPageContract = definePageCapabilityContract({
  pageId: 'monitor.cache.list',
  pageName: '缓存列表',
  route: '/monitor/cacheList',
  toolPrefix: 'page_monitor_cache_list',
  actions: [
    {
      suffix: 'keys', permission: 'monitor:cache:list', label: '列出指定缓存名称下的键名',
      inputSchema: { type: 'object', properties: { cacheName: { type: 'string' } }, required: ['cacheName'], additionalProperties: false }
    },
    {
      suffix: 'view_value', permission: 'monitor:cache:list', label: '查看指定缓存键的值',
      inputSchema: {
        type: 'object',
        properties: { cacheName: { type: 'string' }, cacheKey: { type: 'string' } },
        required: ['cacheName', 'cacheKey'],
        additionalProperties: false
      }
    },
    {
      suffix: 'clear_name', permission: 'monitor:cache:list', label: '清理指定缓存名称下全部键',
      inputSchema: { type: 'object', properties: { cacheName: { type: 'string' } }, required: ['cacheName'], additionalProperties: false }
    },
    {
      suffix: 'clear_key', permission: 'monitor:cache:list', label: '删除指定缓存键',
      inputSchema: { type: 'object', properties: { cacheKey: { type: 'string' } }, required: ['cacheKey'], additionalProperties: false }
    },
    { suffix: 'clear_all', permission: 'monitor:cache:list', label: '清理全部缓存' }
  ]
})

export const monitorServerPageContract = definePageCapabilityContract({
  pageId: 'monitor-server',
  pageName: '服务监控',
  route: '/monitor/server',
  toolPrefix: 'page_monitor_server',
  actions: [
    { suffix: 'view', permission: 'monitor:server:list', label: '查看服务器、JVM、CPU、内存和磁盘运行指标' }
  ]
})

export const monitorDruidPageContract = definePageCapabilityContract({
  pageId: 'monitor.druid',
  pageName: '数据监控',
  route: '/monitor/druid',
  toolPrefix: 'page_monitor_druid',
  actions: []
})

export const monitorPageContracts = [
  monitorOnlinePageContract,
  monitorJobPageContract,
  monitorJobLogPageContract,
  monitorLogininforPageContract,
  monitorOperlogPageContract,
  monitorCachePageContract,
  monitorCacheListPageContract,
  monitorServerPageContract,
  monitorDruidPageContract
]
