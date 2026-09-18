
<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" v-show="showSearch" :inline="true">
         <el-form-item label="用户名称" prop="userName">
            <el-input
               v-model="queryParams.userName"
               placeholder="请输入用户名称"
               clearable
               style="width: 240px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="手机号码" prop="phonenumber">
            <el-input
               v-model="queryParams.phonenumber"
               placeholder="请输入手机号码"
               clearable
               style="width: 240px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button
               type="primary"
               plain
               icon="Plus"
               @click="openSelectUser"
               v-hasPermi="['system:role:add']"
            >添加用户</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="danger"
               plain
               icon="CircleClose"
               :disabled="multiple"
               @click="cancelAuthUserAll"
               v-hasPermi="['system:role:remove']"
            >批量取消授权</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button 
               type="warning" 
               plain 
               icon="Close"
               @click="handleClose"
            >关闭</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table v-loading="loading" :data="userList" @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="55" align="center" />
         <el-table-column label="用户名称" prop="userName" :show-overflow-tooltip="true" />
         <el-table-column label="用户昵称" prop="nickName" :show-overflow-tooltip="true" />
         <el-table-column label="邮箱" prop="email" :show-overflow-tooltip="true" />
         <el-table-column label="手机" prop="phonenumber" :show-overflow-tooltip="true" />
         <el-table-column label="状态" align="center" prop="status">
            <template #default="scope">
               <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column label="创建时间" align="center" prop="createTime" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="CircleClose" @click="cancelAuthUser(scope.row)" v-hasPermi="['system:role:remove']">取消授权</el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination
         v-show="total > 0"
         :total="total"
         v-model:page="queryParams.pageNum"
         v-model:limit="queryParams.pageSize"
         @pagination="getList"
      />
      <select-user ref="selectRef" :roleId="queryParams.roleId" @ok="handleQuery" />
   </div>
</template>

<script setup name="AuthUser">
import selectUser from "./selectUser"
import { allocatedUserList, unallocatedUserList, authUserCancel, authUserCancelAll, authUserSelectAll } from "@/api/system/role"
import { createAiCrudPageCapabilities } from "@/ai/crudPageCapabilities"

const route = useRoute()
const { proxy } = getCurrentInstance()
const { sys_normal_disable } = useDict("sys_normal_disable")

const userList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const multiple = ref(true)
const total = ref(0)
const userIds = ref([])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  roleId: route.params.roleId,
  userName: undefined,
  phonenumber: undefined,
})

/** 查询授权用户列表 */
function getList() {
  loading.value = true
  allocatedUserList(queryParams).then(response => {
    userList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

/** 返回按钮 */
function handleClose() {
  const obj = { path: "/system/role" }
  proxy.$tab.closeOpenPage(obj)
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  userIds.value = selection.map(item => item.userId)
  multiple.value = !selection.length
}

/** 打开授权用户表弹窗 */
function openSelectUser() {
  proxy.$refs["selectRef"].show()
}

/** 取消授权按钮操作 */
function cancelAuthUser(row) {
  proxy.$modal.confirm('确认要取消该用户"' + row.userName + '"角色吗？').then(function () {
    return authUserCancel({ userId: row.userId, roleId: queryParams.roleId })
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("取消授权成功")
  }).catch(() => {})
}

/** 批量取消授权按钮操作 */
function cancelAuthUserAll() {
  const roleId = queryParams.roleId
  const uIds = userIds.value.join(",")
  proxy.$modal.confirm("是否取消选中用户授权数据项?").then(function () {
    return authUserCancelAll({ roleId: roleId, userIds: uIds })
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("取消授权成功")
  }).catch(() => {})
}

const authUserAiCapabilities = createAiCrudPageCapabilities({
  pageName: '角色分配用户',
  toolPrefix: 'page_system_role_auth_user',
  queryFields: [
    { key: 'userName', label: '用户名称' },
    { key: 'phonenumber', label: '手机号码' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  query: {
    permission: 'system:role:list',
    apply: async args => {
      for (const key of ['userName', 'phonenumber', 'pageNum', 'pageSize']) {
        if (Object.prototype.hasOwnProperty.call(args, key)) queryParams[key] = args[key] ?? undefined
      }
      queryParams.pageNum = Number(queryParams.pageNum || 1)
    },
    run: getList,
    reset: async () => {
      Object.assign(queryParams, { pageNum: 1, pageSize: 10, userName: undefined, phonenumber: undefined })
      return getList()
    },
    result: () => ({ total: total.value, rows: userList.value.map(item => ({ ...item })) })
  },
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
      },
      handler: async args => {
        const params = {
          roleId: queryParams.roleId,
          pageNum: Number(args.pageNum || 1),
          pageSize: Number(args.pageSize || 10),
          userName: args.userName || undefined,
          phonenumber: args.phonenumber || undefined
        }
        const res = await unallocatedUserList(params)
        return { total: res.total, rows: res.rows || [] }
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
      },
      handler: async ({ userIds: values }) => {
        const selected = Array.isArray(values) ? [...new Set(values.filter(Boolean))] : []
        if (!selected.length) throw new Error('没有可授权的用户ID')
        await authUserSelectAll({ roleId: queryParams.roleId, userIds: selected.join(',') })
        await getList()
        return { roleId: Number(queryParams.roleId), assignedUserIds: selected }
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
      },
      handler: async ({ userId }) => {
        if (!userId) throw new Error('缺少用户ID')
        await authUserCancel({ userId, roleId: queryParams.roleId })
        await getList()
        return { roleId: Number(queryParams.roleId), cancelledUserId: userId }
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
      },
      handler: async ({ userIds: values }) => {
        const selected = Array.isArray(values) ? [...new Set(values.filter(Boolean))] : []
        if (!selected.length) throw new Error('没有可取消授权的用户ID')
        await authUserCancelAll({ roleId: queryParams.roleId, userIds: selected.join(',') })
        await getList()
        return { roleId: Number(queryParams.roleId), cancelledUserIds: selected }
      }
    }
  ],
  getRows: () => userList.value.map(item => ({ ...item })),
  getTotal: () => total.value,
  getSelectedIds: () => [...userIds.value],
  getContext: () => ({
    roleId: Number(queryParams.roleId),
    query: { ...queryParams },
    pagination: { pageNum: queryParams.pageNum, pageSize: queryParams.pageSize, total: total.value }
  })
})

useAiPageTools('system.role.authUser', authUserAiCapabilities.tools, authUserAiCapabilities.getContext, {
  route: route.path,
  pageName: '角色分配用户'
})

getList()
</script>
