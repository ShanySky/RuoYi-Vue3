<template>
  <div class="app-container tree-sidebar-manage-wrap">
    <tree-panel title="组织机构" :tree-data="deptOptions" search-placeholder="请输入部门名称" storage-key="dept-sidebar-width" :defaultExpandAll="true" @node-click="handleNodeClick" @refresh="getDeptTree" ref="deptTreeRef" />
    <div class="tree-sidebar-content">
      <div class="content-inner">
        <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
          <el-form-item label="用户名称" prop="userName">
            <el-input data-testid="user-search-name" v-model="queryParams.userName" placeholder="请输入用户名称" clearable style="width: 240px" @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="手机号码" prop="phonenumber">
            <el-input v-model="queryParams.phonenumber" placeholder="请输入手机号码" clearable style="width: 240px" @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="用户状态" clearable style="width: 240px">
              <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="创建时间" style="width: 308px">
            <el-date-picker v-model="dateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始日期" end-placeholder="结束日期"></el-date-picker>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['system:user:add']">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['system:user:edit']">修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['system:user:remove']">删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="info" plain icon="Upload" @click="handleImport" v-hasPermi="['system:user:import']">导入</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['system:user:export']">导出</el-button>
          </el-col>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" :columns="columns" storageKey="xxxxxxxx"></right-toolbar>
        </el-row>

        <el-table v-loading="loading" :data="userList" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column label="用户编号" align="center" key="userId" prop="userId" v-if="columns.userId.visible" />
          <el-table-column label="用户名称" align="center" key="userName" v-if="columns.userName.visible" :show-overflow-tooltip="true">
            <template #default="scope">
              <a class="link-type" style="cursor:pointer" @click="handleViewData(scope.row)">{{ scope.row.userName }}</a>
            </template>
         </el-table-column>
          <el-table-column label="用户昵称" align="center" key="nickName" prop="nickName" v-if="columns.nickName.visible" :show-overflow-tooltip="true" />
          <el-table-column label="部门" align="center" key="deptName" prop="dept.deptName" v-if="columns.deptName.visible" :show-overflow-tooltip="true" />
          <el-table-column label="手机号码" align="center" key="phonenumber" prop="phonenumber" v-if="columns.phonenumber.visible" width="120" />
          <el-table-column label="状态" align="center" key="status" v-if="columns.status.visible">
            <template #default="scope">
              <el-switch
                v-model="scope.row.status"
                active-value="0"
                inactive-value="1"
                @change="handleStatusChange(scope.row)"
              ></el-switch>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" align="center" prop="createTime" v-if="columns.createTime.visible" width="160">
            <template #default="scope">
              <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
            <template #default="scope">
              <el-tooltip content="修改" placement="top" v-if="scope.row.userId !== 1">
                <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:user:edit']"></el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top" v-if="scope.row.userId !== 1">
                <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:user:remove']"></el-button>
              </el-tooltip>
              <el-tooltip content="重置密码" placement="top" v-if="scope.row.userId !== 1">
                <el-button link type="primary" icon="Key" @click="handleResetPwd(scope.row)" v-hasPermi="['system:user:resetPwd']"></el-button>
              </el-tooltip>
              <el-tooltip content="分配角色" placement="top" v-if="scope.row.userId !== 1">
                <el-button link type="primary" icon="CircleCheck" @click="handleAuthRole(scope.row)" v-hasPermi="['system:user:edit']"></el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
        <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
      </div>
    </div>

    <!-- 添加或修改用户配置对话框 -->
    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form :model="form" :rules="rules" ref="userRef" label-width="80px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="用户昵称" prop="nickName">
              <el-input data-testid="user-edit-nickname" v-model="form.nickName" placeholder="请输入用户昵称" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="归属部门" prop="deptId">
              <el-tree-select v-model="form.deptId" :data="enabledDeptOptions" :props="{ value: 'id', label: 'label', children: 'children' }" value-key="id" placeholder="请选择归属部门" clearable check-strictly />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="手机号码" prop="phonenumber">
              <el-input v-model="form.phonenumber" placeholder="请输入手机号码" maxlength="11" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" maxlength="50" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item v-if="form.userId == undefined" label="用户名称" prop="userName">
              <el-input v-model="form.userName" placeholder="请输入用户名称" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item v-if="form.userId == undefined" label="用户密码" prop="password" :rules="pwdValidator">
              <el-input v-model="form.password" placeholder="请输入用户密码" type="password" maxlength="20" show-password />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="用户性别">
              <el-select v-model="form.sex" placeholder="请选择">
                <el-option v-for="dict in sys_user_sex" :key="dict.value" :label="dict.label" :value="dict.value"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="岗位">
              <el-select v-model="form.postIds" multiple placeholder="请选择">
                <el-option v-for="item in postOptions" :key="item.postId" :label="item.postName" :value="item.postId" :disabled="item.status == 1"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色">
              <el-select v-model="form.roleIds" multiple placeholder="请选择">
                <el-option v-for="item in roleOptions" :key="item.roleId" :label="item.roleName" :value="item.roleId" :disabled="item.status == 1"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 用户详情抽屉 -->
    <user-view-drawer ref="userViewRef" />
    <!-- 用户导入对话框 -->
    <excel-import-dialog ref="importUserRef" title="用户导入" action="/system/user/importData" template-action="/system/user/importTemplate" template-file-name="user_template" update-support-label="是否更新已经存在的用户数据" @success="getList" />
  </div>
</template>

<script setup name="User">
import TreePanel from "@/components/TreePanel"
import ExcelImportDialog from "@/components/ExcelImportDialog"
import UserViewDrawer from "./view"
import { usePasswordRule } from "@/utils/passwordRule"
import { useAiPageTools } from "@/ai/toolRegistry"
import { createAiCrudPageCapabilities } from "@/ai/crudPageCapabilities"
import { changeUserStatus, listUser, resetUserPwd, delUser, getUser, updateUser, addUser, deptTreeSelect } from "@/api/system/user"

const router = useRouter()
const { proxy } = getCurrentInstance()
const { pwdValidator, pwdPromptValidator } = usePasswordRule()
const { sys_normal_disable, sys_user_sex } = useDict("sys_normal_disable", "sys_user_sex")

const userList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const dateRange = ref([])
const deptOptions = ref(undefined)
const enabledDeptOptions = ref(undefined)
const initPassword = ref(undefined)
const postOptions = ref([])
const roleOptions = ref([])
// 列显隐信息
const columns = ref({
  userId: { label: '用户编号', visible: true },
  userName: { label: '用户名称', visible: true },
  nickName: { label: '用户昵称', visible: true },
  deptName: { label: '部门', visible: true },
  phonenumber: { label: '手机号码', visible: true },
  status: { label: '状态', visible: true },
  createTime: { label: '创建时间', visible: true }
})

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    userName: undefined,
    phonenumber: undefined,
    status: undefined,
    deptId: undefined
  },
  rules: {
    userName: [{ required: true, message: "用户名称不能为空", trigger: "blur" }, { min: 2, max: 20, message: "用户名称长度必须介于 2 和 20 之间", trigger: "blur" }],
    nickName: [{ required: true, message: "用户昵称不能为空", trigger: "blur" }],
    email: [{ type: "email", message: "请输入正确的邮箱地址", trigger: ["blur", "change"] }],
    phonenumber: [{ pattern: /^1[3|4|5|6|7|8|9][0-9]\d{8}$/, message: "请输入正确的手机号码", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询用户列表 */
function getList() {
  loading.value = true
  return listUser(proxy.addDateRange(queryParams.value, dateRange.value)).then(res => {
    userList.value = res.rows
    total.value = res.total
    return res
  }).finally(() => {
    loading.value = false
  })
}

/** 查询部门下拉树结构 */
function getDeptTree() {
  deptTreeSelect().then(response => {
    deptOptions.value = response.data
    enabledDeptOptions.value = filterDisabledDept(JSON.parse(JSON.stringify(response.data)))
  })
}

/** 过滤禁用的部门 */
function filterDisabledDept(deptList) {
  return deptList.filter(dept => {
    if (dept.disabled) {
      return false
    }
    if (dept.children && dept.children.length) {
      dept.children = filterDisabledDept(dept.children)
    }
    return true
  })
}

/** 节点单击事件 */
function handleNodeClick(data) {
  queryParams.value.deptId = data.id
  handleQuery()
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  return getList()
}

/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = []
  proxy.resetForm("queryRef")
  queryParams.value.deptId = undefined
  proxy.$refs.deptTreeRef.setCurrentKey(null)
  handleQuery()
}

/** 删除按钮操作 */
function handleDelete(row) {
  const userIds = row.userId || ids.value
  proxy.$modal.confirm('是否确认删除用户编号为"' + userIds + '"的数据项？').then(function () {
    return delUser(userIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("system/user/export", {
    ...queryParams.value,
  },`user_${new Date().getTime()}.xlsx`)
}

/** 用户状态修改  */
function handleStatusChange(row) {
  let text = row.status === "0" ? "启用" : "停用"
  proxy.$modal.confirm('确认要"' + text + '""' + row.userName + '"用户吗?').then(function () {
    return changeUserStatus(row.userId, row.status)
  }).then(() => {
    proxy.$modal.msgSuccess(text + "成功")
  }).catch(function () {
    row.status = row.status === "0" ? "1" : "0"
  })
}

/** 更多操作 */
function handleCommand(command, row) {
  switch (command) {
    case "handleResetPwd":
      handleResetPwd(row)
      break
    case "handleAuthRole":
      handleAuthRole(row)
      break
    default:
      break
  }
}

/** 跳转角色分配 */
function handleAuthRole(row) {
  const userId = row.userId
  router.push("/system/user-auth/role/" + userId)
}

/** 重置密码按钮操作 */
function handleResetPwd(row) {
  proxy.$prompt(`请输入「${row.userName}」的新密码`, "重置密码", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    closeOnClickModal: false,
    inputValidator: pwdPromptValidator
  }).then(({ value }) => {
    resetUserPwd(row.userId, value).then(() => {
      proxy.$modal.msgSuccess("修改成功，新密码是：" + value)
    })
  }).catch(() => {})
}

/** 选择条数  */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.userId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 详情按钮操作 */
function handleViewData(row) {
  proxy.$refs["userViewRef"].open(row.userId)
}

/** 导入按钮操作 */
function handleImport() {
  proxy.$refs["importUserRef"].open()
}

/** 重置操作表单 */
function reset() {
  form.value = {
    userId: undefined,
    deptId: undefined,
    userName: undefined,
    nickName: undefined,
    password: undefined,
    phonenumber: undefined,
    email: undefined,
    sex: undefined,
    status: "0",
    remark: undefined,
    postIds: [],
    roleIds: []
  }
  proxy.resetForm("userRef")
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  return getUser().then(response => {
    postOptions.value = response.posts
    roleOptions.value = response.roles
    open.value = true
    title.value = "添加用户"
    form.value.password = initPassword.value
    return form.value
  })
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const userId = row?.userId || ids.value
  return getUser(userId).then(response => {
    form.value = response.data
    postOptions.value = response.posts
    roleOptions.value = response.roles
    form.value.postIds = response.postIds
    form.value.roleIds = response.roleIds
    open.value = true
    title.value = "修改用户"
    form.value.password = ""
    return response.data
  })
}

/** 提交按钮 */
function submitFormCore() {
  return new Promise((resolve, reject) => {
    proxy.$refs["userRef"].validate(valid => {
      if (!valid) {
        reject(new Error("表单校验未通过"))
        return
      }
      const editing = form.value.userId != undefined
      const savedUserId = form.value.userId
      const action = editing ? updateUser(form.value) : addUser(form.value)
      action.then(() => {
        proxy.$modal.msgSuccess(editing ? "修改成功" : "新增成功")
        open.value = false
        getList().then(() => resolve({ success: true, userId: savedUserId }))
      }).catch(reject)
    })
  })
}

function submitForm() {
  submitFormCore().catch(() => {})
}


function getUserAiRows() {
  return userList.value.slice(0, 50).map(item => ({
    userId: item.userId,
    userName: item.userName,
    nickName: item.nickName,
    deptId: item.deptId,
    deptName: item.dept?.deptName,
    phonenumber: item.phonenumber,
    email: item.email,
    sex: item.sex,
    status: item.status,
    createTime: item.createTime
  }))
}

function getUserAiFormSnapshot() {
  const value = form.value || {}
  return {
    userId: value.userId,
    userName: value.userName,
    nickName: value.nickName,
    deptId: value.deptId,
    phonenumber: value.phonenumber,
    email: value.email,
    sex: value.sex,
    status: value.status,
    postIds: value.postIds || [],
    roleIds: value.roleIds || [],
    remark: value.remark
  }
}

const userAiCapabilities = createAiCrudPageCapabilities({
  pageName: '用户管理',
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
    { key: 'userName', label: '用户名称', description: '仅新增用户时可设置；已有用户登录账号不可修改' },
    { key: 'password', label: '用户密码', description: '仅新增用户时可设置' },
    { key: 'nickName', label: '用户昵称', required: true },
    { key: 'deptId', label: '归属部门', type: 'integer' },
    { key: 'phonenumber', label: '手机号码' },
    { key: 'email', label: '邮箱' },
    { key: 'sex', label: '用户性别', description: '0男，1女，2未知' },
    { key: 'status', label: '状态', description: '0正常，1停用' },
    { key: 'postIds', label: '岗位ID列表', type: 'array' },
    { key: 'roleIds', label: '角色ID列表', type: 'array' },
    { key: 'remark', label: '备注' }
  ],
  query: {
    permission: 'system:user:list',
    apply: async args => {
      const allowed = ['userName', 'phonenumber', 'status', 'deptId', 'pageNum', 'pageSize']
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(args, key)) queryParams.value[key] = args[key] ?? undefined
      }
      if (Array.isArray(args.dateRange)) dateRange.value = args.dateRange.slice(0, 2)
      queryParams.value.pageNum = Number(queryParams.value.pageNum || 1)
    },
    run: handleQuery,
    reset: async () => resetQuery(),
    result: () => ({
      total: total.value,
      pageNum: queryParams.value.pageNum,
      pageSize: queryParams.value.pageSize,
      rows: getUserAiRows()
    })
  },
  form: {
    addPermission: 'system:user:add',
    editPermission: 'system:user:edit',
    recordIdKey: 'userId',
    recordIdLabel: '用户ID',
    openAdd: handleAdd,
    openEdit: userId => handleUpdate({ userId }),
    snapshot: getUserAiFormSnapshot,
    setFields: async (args, mode) => {
      if (!open.value) throw new Error('当前没有打开用户表单')
      const common = ['nickName', 'deptId', 'phonenumber', 'email', 'sex', 'status', 'postIds', 'roleIds', 'remark']
      const allowed = mode === 'add' ? ['userName', 'password', ...common] : common
      const changedFields = []
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(args, key)) {
          form.value[key] = args[key]
          changedFields.push(key)
        }
      }
      await nextTick()
      return { mode, changedFields, saved: false, form: getUserAiFormSnapshot() }
    },
    submit: async mode => {
      if (!open.value) throw new Error('当前没有可提交的用户表单')
      const adding = form.value.userId == undefined
      if ((mode === 'add') !== adding) throw new Error('当前表单模式已经变化，请重新打开表单')
      return await submitFormCore()
    }
  },
  actions: [
    {
      suffix: 'view',
      permission: 'system:user:list',
      label: '查看用户详情',
      inputSchema: { type: 'object', properties: { userId: { type: 'integer' } }, required: ['userId'], additionalProperties: false },
      handler: async args => {
        handleViewData({ userId: args.userId })
        return { opened: true, userId: args.userId }
      }
    },
    {
      suffix: 'delete',
      permission: 'system:user:remove',
      label: '删除用户',
      inputSchema: { type: 'object', properties: { userIds: { type: 'array', items: { type: 'integer' } } }, required: ['userIds'], additionalProperties: false },
      handler: async args => {
        const userIds = Array.isArray(args.userIds) ? args.userIds.filter(id => id && id !== 1) : []
        if (!userIds.length) throw new Error('没有可删除的用户ID')
        await delUser(userIds.join(','))
        await getList()
        return { deletedUserIds: userIds }
      }
    },
    {
      suffix: 'change_status',
      permission: 'system:user:edit',
      label: '启用或停用用户',
      inputSchema: { type: 'object', properties: { userId: { type: 'integer' }, status: { type: 'string', enum: ['0', '1'] } }, required: ['userId', 'status'], additionalProperties: false },
      handler: async args => {
        if (!args.userId || args.userId === 1) throw new Error('不能修改该用户状态')
        await changeUserStatus(args.userId, args.status)
        await getList()
        return { userId: args.userId, status: args.status }
      }
    },
    {
      suffix: 'reset_password',
      permission: 'system:user:resetPwd',
      label: '重置用户密码',
      inputSchema: { type: 'object', properties: { userId: { type: 'integer' }, password: { type: 'string' } }, required: ['userId', 'password'], additionalProperties: false },
      handler: async args => {
        if (!args.userId || args.userId === 1 || !args.password) throw new Error('缺少有效用户ID或新密码')
        await resetUserPwd(args.userId, args.password)
        return { userId: args.userId, passwordChanged: true }
      }
    },
    {
      suffix: 'auth_role',
      permission: 'system:user:edit',
      label: '进入用户角色分配页面',
      inputSchema: { type: 'object', properties: { userId: { type: 'integer' } }, required: ['userId'], additionalProperties: false },
      handler: async args => {
        await router.push('/system/user-auth/role/' + args.userId)
        return { navigated: true, userId: args.userId }
      }
    },
    {
      suffix: 'import_open',
      permission: 'system:user:import',
      label: '打开用户导入窗口',
      handler: async () => {
        handleImport()
        return { opened: true }
      }
    },
    {
      suffix: 'export',
      permission: 'system:user:export',
      label: '按当前查询条件导出用户',
      handler: async () => {
        handleExport()
        return { started: true, query: { ...queryParams.value } }
      }
    }
  ],
  getRows: getUserAiRows,
  getTotal: () => total.value,
  getSelectedIds: () => [...ids.value],
  getContext: () => ({
    query: { ...queryParams.value, dateRange: [...dateRange.value] },
    pagination: { pageNum: queryParams.value.pageNum, pageSize: queryParams.value.pageSize, total: total.value },
    visibleColumns: Object.entries(columns.value).filter(([, value]) => value.visible)
      .map(([key, value]) => ({ key, label: value.label })),
    form: {
      open: open.value,
      mode: open.value ? (form.value.userId == undefined ? 'add' : 'edit') : null,
      value: open.value ? getUserAiFormSnapshot() : null,
      postOptions: open.value ? postOptions.value.map(item => ({ postId: item.postId, postName: item.postName, status: item.status })) : [],
      roleOptions: open.value ? roleOptions.value.map(item => ({ roleId: item.roleId, roleName: item.roleName, status: item.status })) : []
    }
  })
})

useAiPageTools('system.user', userAiCapabilities.tools, userAiCapabilities.getContext, {
  pageName: '用户管理',
  route: '/system/user'
})

onMounted(() => {
  getDeptTree()
  getList()
  proxy.getConfigKey("sys.user.initPassword").then(response => {
    initPassword.value = response.msg
  })
})
</script>
