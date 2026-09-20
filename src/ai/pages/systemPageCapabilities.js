import { definePageCapabilityContract } from '../pageCapabilityContract.js'

export const systemAuthRolePageContract = definePageCapabilityContract({
  pageId: 'system-user-auth-role',
  pageName: '分配角色',
  route: '/system/user-auth/role/*',
  toolPrefix: 'page_system_user_auth_role',
  actions: [
    { suffix: 'view', permission: 'system:user:query', label: '查看当前用户及角色授权状态' },
    {
      suffix: 'select',
      permission: 'system:user:edit',
      label: '选择准备授予当前用户的角色',
      inputSchema: {
        type: 'object',
        properties: { roleIds: { type: 'array', items: { type: 'integer' } } },
        required: ['roleIds'],
        additionalProperties: false
      }
    },
    { suffix: 'submit', permission: 'system:user:edit', label: '提交当前用户角色授权' }
  ]
})

export const systemRolePageContract = definePageCapabilityContract({
  pageId: 'system-role',
  pageName: '角色管理',
  route: '/system/role',
  toolPrefix: 'page_system_role',
  queryFields: [
    { key: 'roleName', label: '角色名称' },
    { key: 'roleKey', label: '权限字符' },
    { key: 'status', label: '状态', options: ['0', '1'], description: '0正常，1停用' },
    { key: 'dateRange', label: '创建时间范围', type: 'array', itemType: 'string' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  formFields: [
    { key: 'roleName', label: '角色名称', required: true, inputSchema: { type: 'string', minLength: 1, maxLength: 30 } },
    { key: 'roleKey', label: '权限字符', required: true, inputSchema: { type: 'string', minLength: 1, maxLength: 100 } },
    { key: 'roleSort', label: '角色顺序', type: 'integer', required: true, inputSchema: { type: 'integer', minimum: 0 } },
    { key: 'status', label: '状态', options: ['0', '1'], description: '0正常，1停用' },
    { key: 'menuIds', label: '菜单权限ID', type: 'array', itemType: 'integer' },
    { key: 'menuCheckStrictly', label: '菜单父子联动', type: 'boolean' },
    { key: 'remark', label: '备注' }
  ],
  query: { permission: 'system:role:list' },
  form: {
    addPermission: 'system:role:add',
    editPermission: 'system:role:edit',
    recordIdKey: 'roleId',
    recordIdLabel: '角色ID'
  },
  actions: [
    {
      suffix: 'data_scope_open',
      permission: 'system:role:edit',
      label: '打开角色数据权限',
      inputSchema: { type: 'object', properties: { roleId: { type: 'integer' } }, required: ['roleId'], additionalProperties: false }
    },
    {
      suffix: 'data_scope_set_fields',
      permission: 'system:role:edit',
      label: '填写角色数据权限但不保存',
      inputSchema: {
        type: 'object',
        properties: {
          dataScope: { type: 'string', enum: ['1', '2', '3', '4', '5'] },
          deptCheckStrictly: { type: 'boolean' },
          deptIds: { type: 'array', items: { type: 'integer' } }
        },
        additionalProperties: false
      }
    },
    { suffix: 'data_scope_submit', permission: 'system:role:edit', label: '提交角色数据权限' },
    {
      suffix: 'change_status',
      permission: 'system:role:edit',
      label: '启用或停用角色',
      inputSchema: {
        type: 'object',
        properties: { roleId: { type: 'integer' }, status: { type: 'string', enum: ['0', '1'] } },
        required: ['roleId', 'status'],
        additionalProperties: false
      }
    },
    {
      suffix: 'delete',
      permission: 'system:role:remove',
      label: '删除角色',
      inputSchema: {
        type: 'object',
        properties: { roleIds: { type: 'array', items: { type: 'integer' } } },
        required: ['roleIds'],
        additionalProperties: false
      }
    },
    { suffix: 'export', permission: 'system:role:export', label: '按当前查询条件导出角色' }
  ]
})

export const systemRoleAuthUserPageContract = definePageCapabilityContract({
  pageId: 'system.role.authUser',
  pageName: '角色分配用户',
  route: '/system/role-auth/user/*',
  toolPrefix: 'page_system_role_auth_user',
  queryFields: [
    { key: 'userName', label: '用户名称' },
    { key: 'phonenumber', label: '手机号码' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  query: { permission: 'system:role:list' },
  actions: [
    {
      suffix: 'candidates',
      permission: 'system:role:list',
      label: '查询当前角色可添加的用户',
      inputSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          phonenumber: { type: 'string' },
          pageNum: { type: 'integer' },
          pageSize: { type: 'integer' }
        },
        additionalProperties: false
      }
    },
    {
      suffix: 'assign_users',
      permission: 'system:role:edit',
      label: '向当前角色批量授权用户',
      inputSchema: {
        type: 'object',
        properties: { userIds: { type: 'array', items: { type: 'integer' } } },
        required: ['userIds'],
        additionalProperties: false
      }
    },
    {
      suffix: 'cancel_user',
      permission: 'system:role:edit',
      label: '取消单个用户的当前角色授权',
      inputSchema: {
        type: 'object',
        properties: { userId: { type: 'integer' } },
        required: ['userId'],
        additionalProperties: false
      }
    },
    {
      suffix: 'cancel_users',
      permission: 'system:role:edit',
      label: '批量取消用户的当前角色授权',
      inputSchema: {
        type: 'object',
        properties: { userIds: { type: 'array', items: { type: 'integer' } } },
        required: ['userIds'],
        additionalProperties: false
      }
    }
  ]
})

export const systemMenuPageContract = definePageCapabilityContract({
  pageId: 'system-menu',
  pageName: '菜单管理',
  route: '/system/menu',
  toolPrefix: 'page_system_menu',
  queryFields: [
    { key: 'menuName', label: '菜单名称' },
    { key: 'visible', label: '显示状态', options: ['0', '1'], description: '0显示，1隐藏' }
  ],
  formFields: [
    { key: 'parentId', label: '上级菜单ID', type: 'integer' },
    { key: 'menuType', label: '菜单类型', options: ['M', 'C', 'F'], required: true },
    { key: 'icon', label: '菜单图标' },
    { key: 'orderNum', label: '显示排序', type: 'integer', required: true, inputSchema: { type: 'integer', minimum: 0 } },
    { key: 'menuName', label: '菜单名称', required: true },
    { key: 'routeName', label: '路由名称' },
    { key: 'isFrame', label: '是否外链', options: ['0', '1'], description: '0是，1否' },
    { key: 'path', label: '路由地址' },
    { key: 'component', label: '组件路径' },
    { key: 'perms', label: '权限字符' },
    { key: 'query', label: '路由参数' },
    { key: 'isCache', label: '是否缓存', options: ['0', '1'], description: '0缓存，1不缓存' },
    { key: 'visible', label: '显示状态', options: ['0', '1'] },
    { key: 'status', label: '菜单状态', options: ['0', '1'] }
  ],
  query: { permission: 'system:menu:list' },
  form: {
    addPermission: 'system:menu:add',
    editPermission: 'system:menu:edit',
    recordIdKey: 'menuId',
    recordIdLabel: '菜单ID'
  },
  actions: [
    {
      suffix: 'sort_submit',
      permission: 'system:menu:edit',
      label: '保存菜单显示排序',
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: { menuId: { type: 'integer' }, orderNum: { type: 'integer', minimum: 0 } },
              required: ['menuId', 'orderNum'],
              additionalProperties: false
            }
          }
        },
        required: ['items'],
        additionalProperties: false
      }
    },
    {
      suffix: 'delete',
      permission: 'system:menu:remove',
      label: '删除菜单',
      inputSchema: { type: 'object', properties: { menuId: { type: 'integer' } }, required: ['menuId'], additionalProperties: false }
    }
  ]
})

export const systemDeptPageContract = definePageCapabilityContract({
  pageId: 'system-dept',
  pageName: '部门管理',
  route: '/system/dept',
  toolPrefix: 'page_system_dept',
  queryFields: [
    { key: 'deptName', label: '部门名称' },
    { key: 'status', label: '状态', options: ['0', '1'], description: '0正常，1停用' }
  ],
  formFields: [
    { key: 'parentId', label: '上级部门ID', type: 'integer', required: true },
    { key: 'deptName', label: '部门名称', required: true, inputSchema: { type: 'string', minLength: 1, maxLength: 30 } },
    { key: 'orderNum', label: '显示排序', type: 'integer', required: true, inputSchema: { type: 'integer', minimum: 0 } },
    { key: 'leader', label: '负责人' },
    { key: 'phone', label: '联系电话', inputSchema: { type: 'string', pattern: '^1[3-9][0-9]{9}$' } },
    { key: 'email', label: '邮箱', inputSchema: { type: 'string', format: 'email' } },
    { key: 'status', label: '状态', options: ['0', '1'], description: '0正常，1停用' }
  ],
  query: { permission: 'system:dept:list' },
  form: {
    addPermission: 'system:dept:add',
    editPermission: 'system:dept:edit',
    recordIdKey: 'deptId',
    recordIdLabel: '部门ID'
  },
  actions: [
    {
      suffix: 'sort_submit',
      permission: 'system:dept:edit',
      label: '保存部门显示排序',
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: { deptId: { type: 'integer' }, orderNum: { type: 'integer', minimum: 0 } },
              required: ['deptId', 'orderNum'],
              additionalProperties: false
            }
          }
        },
        required: ['items'],
        additionalProperties: false
      }
    },
    {
      suffix: 'delete',
      permission: 'system:dept:remove',
      label: '删除部门',
      inputSchema: { type: 'object', properties: { deptId: { type: 'integer' } }, required: ['deptId'], additionalProperties: false }
    }
  ]
})

export const systemPostPageContract = definePageCapabilityContract({
  pageId: 'system.post',
  pageName: '岗位管理',
  route: '/system/post',
  toolPrefix: 'page_system_post',
  queryFields: [
    { key: 'postCode', label: '岗位编码' },
    { key: 'postName', label: '岗位名称' },
    { key: 'status', label: '状态', description: '0正常，1停用' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  formFields: [
    { key: 'postCode', label: '岗位编码', required: true },
    { key: 'postName', label: '岗位名称', required: true },
    { key: 'postSort', label: '岗位顺序', type: 'integer', required: true },
    { key: 'status', label: '岗位状态', description: '0正常，1停用' },
    { key: 'remark', label: '备注' }
  ],
  query: { permission: 'system:post:list' },
  form: {
    addPermission: 'system:post:add',
    editPermission: 'system:post:edit',
    recordIdKey: 'postId',
    recordIdLabel: '岗位ID'
  },
  actions: [
    {
      suffix: 'delete',
      permission: 'system:post:remove',
      label: '删除岗位',
      inputSchema: {
        type: 'object',
        properties: { postIds: { type: 'array', items: { type: 'integer' } } },
        required: ['postIds'],
        additionalProperties: false
      }
    },
    { suffix: 'export', permission: 'system:post:export', label: '按当前查询条件导出岗位' }
  ]
})

export const systemDictPageContract = definePageCapabilityContract({
  pageId: 'system-dict',
  pageName: '字典类型',
  route: '/system/dict',
  toolPrefix: 'page_system_dict',
  queryFields: [
    { key: 'dictName', label: '字典名称' },
    { key: 'dictType', label: '字典类型' },
    { key: 'status', label: '状态', options: ['0', '1'] },
    { key: 'dateRange', label: '创建时间范围', type: 'array', itemType: 'string' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  formFields: [
    { key: 'dictName', label: '字典名称', required: true },
    { key: 'dictType', label: '字典类型', required: true },
    { key: 'status', label: '状态', options: ['0', '1'] },
    { key: 'remark', label: '备注' }
  ],
  query: { permission: 'system:dict:list' },
  form: {
    addPermission: 'system:dict:add',
    editPermission: 'system:dict:edit',
    recordIdKey: 'dictId',
    recordIdLabel: '字典ID'
  },
  actions: [
    {
      suffix: 'view',
      permission: 'system:dict:list',
      label: '查看字典类型详情',
      inputSchema: { type: 'object', properties: { dictId: { type: 'integer' } }, required: ['dictId'], additionalProperties: false }
    },
    {
      suffix: 'delete',
      permission: 'system:dict:remove',
      label: '删除字典类型',
      inputSchema: {
        type: 'object',
        properties: { dictIds: { type: 'array', items: { type: 'integer' } } },
        required: ['dictIds'],
        additionalProperties: false
      }
    },
    { suffix: 'export', permission: 'system:dict:export', label: '按当前查询条件导出字典类型' },
    { suffix: 'refresh_cache', permission: 'system:dict:remove', label: '刷新字典缓存' }
  ]
})

export const systemDictDataPageContract = definePageCapabilityContract({
  pageId: 'system.dict.data',
  pageName: '字典数据',
  route: '/system/dict-data/index/*',
  toolPrefix: 'page_system_dict_data',
  queryFields: [
    { key: 'dictType', label: '字典类型' },
    { key: 'dictLabel', label: '字典标签' },
    { key: 'status', label: '状态' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  formFields: [
    { key: 'dictType', label: '字典类型', editable: false },
    { key: 'dictLabel', label: '数据标签', required: true },
    { key: 'dictValue', label: '数据键值', required: true },
    { key: 'cssClass', label: '样式属性' },
    { key: 'dictSort', label: '显示排序', type: 'integer', required: true, inputSchema: { type: 'integer', minimum: 0 } },
    { key: 'listClass', label: '回显样式' },
    { key: 'status', label: '状态' },
    { key: 'remark', label: '备注' }
  ],
  query: { permission: 'system:dict:list' },
  form: {
    addPermission: 'system:dict:add',
    editPermission: 'system:dict:edit',
    recordIdKey: 'dictCode',
    recordIdLabel: '字典编码'
  },
  actions: [
    {
      suffix: 'delete',
      permission: 'system:dict:remove',
      label: '删除字典数据',
      inputSchema: {
        type: 'object',
        properties: { dictCodes: { type: 'array', items: { type: 'integer' } } },
        required: ['dictCodes'],
        additionalProperties: false
      }
    },
    { suffix: 'export', permission: 'system:dict:export', label: '按当前查询条件导出字典数据' }
  ]
})

export const systemNoticePageContract = definePageCapabilityContract({
  pageId: 'system-notice',
  pageName: '通知公告',
  route: '/system/notice',
  toolPrefix: 'page_system_notice',
  queryFields: [
    { key: 'noticeTitle', label: '公告标题' },
    { key: 'createBy', label: '创建者' },
    { key: 'noticeType', label: '公告类型' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  formFields: [
    { key: 'noticeTitle', label: '公告标题', required: true },
    { key: 'noticeType', label: '公告类型', required: true },
    { key: 'status', label: '状态' },
    { key: 'noticeContent', label: '公告内容' }
  ],
  query: { permission: 'system:notice:list' },
  form: {
    addPermission: 'system:notice:add',
    editPermission: 'system:notice:edit',
    recordIdKey: 'noticeId',
    recordIdLabel: '公告ID'
  },
  actions: [
    {
      suffix: 'view',
      permission: 'system:notice:list',
      label: '查看公告详情',
      inputSchema: { type: 'object', properties: { noticeId: { type: 'integer' } }, required: ['noticeId'], additionalProperties: false }
    },
    {
      suffix: 'read_users',
      permission: 'system:notice:list',
      label: '查看公告已读用户',
      inputSchema: { type: 'object', properties: { noticeId: { type: 'integer' } }, required: ['noticeId'], additionalProperties: false }
    },
    {
      suffix: 'delete',
      permission: 'system:notice:remove',
      label: '删除公告',
      inputSchema: {
        type: 'object',
        properties: { noticeIds: { type: 'array', items: { type: 'integer' } } },
        required: ['noticeIds'],
        additionalProperties: false
      }
    }
  ]
})

export const systemProfilePageContract = definePageCapabilityContract({
  pageId: 'system.user.profile',
  pageName: '个人中心',
  route: '/user/profile',
  toolPrefix: 'page_system_profile',
  actions: [
    { suffix: 'view', label: '查看当前登录用户个人资料' },
    {
      suffix: 'set_fields',
      label: '填写本人基本资料但不保存',
      inputSchema: {
        type: 'object',
        properties: {
          nickName: { type: 'string', minLength: 1, maxLength: 30 },
          phonenumber: { type: 'string', pattern: '^1[3-9][0-9]{9}$' },
          email: { type: 'string', format: 'email', maxLength: 50 },
          sex: { type: 'string', enum: ['0', '1'] }
        },
        additionalProperties: false
      }
    },
    { suffix: 'submit', label: '保存本人基本资料' },
    {
      suffix: 'select_tab',
      label: '切换个人中心页签',
      inputSchema: {
        type: 'object',
        properties: { tab: { type: 'string', enum: ['userinfo', 'resetPwd'] } },
        required: ['tab'],
        additionalProperties: false
      }
    }
  ]
})

export const systemPageContracts = [
  systemAuthRolePageContract,
  systemRolePageContract,
  systemRoleAuthUserPageContract,
  systemMenuPageContract,
  systemDeptPageContract,
  systemPostPageContract,
  systemDictPageContract,
  systemDictDataPageContract,
  systemNoticePageContract,
  systemProfilePageContract
]
