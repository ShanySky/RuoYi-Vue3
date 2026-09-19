import { createAiCrudPageCapabilities } from '../crudPageCapabilities.js'
import { definePageCapabilityContract } from '../pageCapabilityContract.js'

function objectSchema(properties = {}, required = []) {
  const schema = { type: 'object', properties, additionalProperties: false }
  if (required.length) schema.required = required
  return schema
}

export const systemUserPageContract = definePageCapabilityContract({
  pageId: 'system.user',
  pageName: '用户管理',
  route: '/system/user',
  toolPrefix: 'page_system_user',
  queryFields: [
    { key: 'userName', label: '用户名称', description: '登录账号关键字' },
    { key: 'phonenumber', label: '手机号码' },
    { key: 'status', label: '状态', description: '0正常，1停用' },
    { key: 'deptId', label: '部门ID', type: 'integer' },
    { key: 'dateRange', label: '创建时间范围', type: 'array' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  formFields: [
    {
      key: 'userName', label: '用户名称', required: true, addOnly: true,
      description: '仅新增用户时可设置；已有用户登录账号不可修改'
    },
    {
      key: 'password', label: '用户密码', required: true, addOnly: true,
      description: '仅新增用户时可设置'
    },
    { key: 'nickName', label: '用户昵称', required: true },
    { key: 'deptId', label: '归属部门', type: 'integer' },
    { key: 'phonenumber', label: '手机号码' },
    { key: 'email', label: '邮箱' },
    { key: 'sex', label: '用户性别', description: '0男，1女，2未知' },
    { key: 'status', label: '状态', description: '0正常，1停用' },
    { key: 'postIds', label: '岗位ID列表', type: 'array', itemType: 'integer' },
    { key: 'roleIds', label: '角色ID列表', type: 'array', itemType: 'integer' },
    { key: 'remark', label: '备注' }
  ],
  query: {
    permission: 'system:user:list'
  },
  form: {
    addPermission: 'system:user:add',
    editPermission: 'system:user:edit',
    recordIdKey: 'userId',
    recordIdLabel: '用户ID'
  },
  actions: [
    {
      suffix: 'view',
      permission: 'system:user:list',
      label: '查看用户详情',
      inputSchema: objectSchema({ userId: { type: 'integer' } }, ['userId'])
    },
    {
      suffix: 'delete',
      permission: 'system:user:remove',
      label: '删除用户',
      inputSchema: objectSchema({ userIds: { type: 'array', items: { type: 'integer' } } }, ['userIds'])
    },
    {
      suffix: 'change_status',
      permission: 'system:user:edit',
      label: '启用或停用用户',
      inputSchema: objectSchema({
        userId: { type: 'integer' },
        status: { type: 'string', enum: ['0', '1'] }
      }, ['userId', 'status'])
    },
    {
      suffix: 'reset_password',
      permission: 'system:user:resetPwd',
      label: '重置用户密码',
      inputSchema: objectSchema({
        userId: { type: 'integer' },
        password: { type: 'string' }
      }, ['userId', 'password'])
    },
    {
      suffix: 'auth_role',
      permission: 'system:user:edit',
      label: '进入用户角色分配页面',
      inputSchema: objectSchema({ userId: { type: 'integer' } }, ['userId'])
    },
    {
      suffix: 'import_open',
      permission: 'system:user:import',
      label: '打开用户导入窗口'
    },
    {
      suffix: 'export',
      permission: 'system:user:export',
      label: '按当前查询条件导出用户'
    }
  ]
})

function resolve(value) {
  try {
    return typeof value === 'function' ? value() : value
  } catch {
    return undefined
  }
}

function mapOptions(items, valueKey, labelKey) {
  return (resolve(items) || []).map(item => ({
    value: item?.[valueKey],
    label: item?.[labelKey] ?? String(item?.[valueKey] ?? ''),
    disabled: String(item?.status ?? '0') === '1'
  })).filter(item => item.value !== undefined && item.value !== null)
}

function flattenDepartments(items) {
  const result = []
  const visit = nodes => {
    for (const item of nodes || []) {
      if (item?.id !== undefined && item?.id !== null) {
        result.push({ value: Number(item.id), label: item.label || String(item.id), disabled: !!item.disabled })
      }
      if (Array.isArray(item?.children)) visit(item.children)
    }
  }
  visit(resolve(items) || [])
  return result
}

export function createSystemUserPageCapability(bindings) {
  const validation = bindings.validationRules || {}
  const options = bindings.options || {}
  return createAiCrudPageCapabilities({
    contract: systemUserPageContract,
    bindings: {
      ...bindings,
      queryFields: bindings.queryFields || {},
      formFields: {
        userName: { validationRules: validation.userName },
        password: { validationRules: validation.password },
        nickName: { validationRules: validation.nickName },
        deptId: { options: () => flattenDepartments(options.departments) },
        phonenumber: { validationRules: validation.phonenumber },
        email: { validationRules: validation.email },
        sex: { options: () => mapOptions(options.sex, 'value', 'label') },
        status: { options: () => mapOptions(options.status, 'value', 'label') },
        postIds: { options: () => mapOptions(options.posts, 'postId', 'postName') },
        roleIds: { options: () => mapOptions(options.roles, 'roleId', 'roleName') },
        ...(bindings.formFields || {})
      }
    }
  })
}
