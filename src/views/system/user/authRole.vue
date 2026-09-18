<template>
   <div class="app-container">
      <h4 class="form-header h4">基本信息</h4>
      <el-form :model="form" label-width="80px">
         <el-row>
            <el-col :span="8" :offset="2">
               <el-form-item label="用户昵称" prop="nickName">
                  <el-input v-model="form.nickName" disabled />
               </el-form-item>
            </el-col>
            <el-col :span="8" :offset="2">
               <el-form-item label="登录账号" prop="userName">
                  <el-input v-model="form.userName" disabled />
               </el-form-item>
            </el-col>
         </el-row>
      </el-form>

      <h4 class="form-header h4">角色信息</h4>
      <el-table v-loading="loading" :row-key="getRowKey" @row-click="clickRow" ref="roleRef" @selection-change="handleSelectionChange" :data="roles.slice((pageNum - 1) * pageSize, pageNum * pageSize)">
         <el-table-column label="序号" width="55" type="index" align="center">
            <template #default="scope">
               <span>{{ (pageNum - 1) * pageSize + scope.$index + 1 }}</span>
            </template>
         </el-table-column>
         <el-table-column type="selection" :reserve-selection="true" :selectable="checkSelectable" width="55"></el-table-column>
         <el-table-column label="角色编号" align="center" prop="roleId" />
         <el-table-column label="角色名称" align="center" prop="roleName" />
         <el-table-column label="权限字符" align="center" prop="roleKey" />
         <el-table-column label="创建时间" align="center" prop="createTime" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="pageNum" v-model:limit="pageSize" />

      <el-form label-width="100px">
         <div style="text-align: center;margin-left:-120px;margin-top:30px;">
            <el-button type="primary" @click="submitForm()">提交</el-button>
            <el-button @click="close()">返回</el-button>
         </div>
      </el-form>
   </div>
</template>

<script setup name="AuthRole">
import { getAuthRole, updateAuthRole } from "@/api/system/user"
import { useAiPageTools } from "@/ai/toolRegistry"
import { createAiCrudPageCapabilities } from "@/ai/crudPageCapabilities"

const route = useRoute()
const { proxy } = getCurrentInstance()

const loading = ref(true)
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const roleIds = ref([])
const roles = ref([])
const form = ref({
  nickName: undefined,
  userName: undefined,
  userId: undefined
})

/** 单击选中行数据 */
function clickRow(row) {
  if (checkSelectable(row)) {
    proxy.$refs["roleRef"].toggleRowSelection(row)
  }
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  roleIds.value = selection.map(item => item.roleId)
}

/** 保存选中的数据编号 */
function getRowKey(row) {
  return row.roleId
}

// 检查角色状态
function checkSelectable(row) {
  return row.status === "0" ? true : false
}

/** 关闭按钮 */
function close() {
  const obj = { path: "/system/user" }
  proxy.$tab.closeOpenPage(obj)
}

/** 提交按钮 */
function submitFormCore(closeAfter = true) {
  const userId = form.value.userId
  const rIds = roleIds.value.join(",")
  return updateAuthRole({ userId, roleIds: rIds }).then(() => {
    proxy.$modal.msgSuccess("授权成功")
    if (closeAfter) close()
    return { success: true, userId, roleIds: [...roleIds.value] }
  })
}

function submitForm() {
  submitFormCore(true).catch(() => {})
}

function loadUserRoles() {
  const userId = route.params && route.params.userId
  if (!userId) return Promise.resolve(null)
  loading.value = true
  return getAuthRole(userId).then(response => {
    form.value = response.user
    roles.value = response.roles
    total.value = roles.value.length
    return nextTick().then(() => {
      proxy.$refs["roleRef"]?.clearSelection?.()
      roles.value.forEach(row => {
        if (row.flag) proxy.$refs["roleRef"]?.toggleRowSelection?.(row, true)
      })
      return response
    })
  }).finally(() => {
    loading.value = false
  })
}

function roleSnapshot() {
  return {
    user: { ...form.value },
    roles: roles.value.slice(0, 100).map(item => ({
      roleId: item.roleId,
      roleName: item.roleName,
      roleKey: item.roleKey,
      status: item.status,
      selected: roleIds.value.includes(item.roleId) || !!item.flag
    })),
    selectedRoleIds: [...roleIds.value],
    pagination: { pageNum: pageNum.value, pageSize: pageSize.value, total: total.value }
  }
}

const authRoleAiCapabilities = createAiCrudPageCapabilities({
  pageName: '分配角色',
  toolPrefix: 'page_system_user_auth_role',
  actions: [
    {
      suffix: 'view',
      permission: 'system:user:query',
      label: '查看当前用户及角色授权状态',
      handler: async () => {
        if (!form.value.userId) await loadUserRoles()
        return roleSnapshot()
      }
    },
    {
      suffix: 'select',
      permission: 'system:user:edit',
      label: '选择准备授予当前用户的角色',
      inputSchema: {
        type: 'object',
        properties: { roleIds: { type: 'array', items: { type: 'integer' } } },
        required: ['roleIds'],
        additionalProperties: false
      },
      handler: async ({ roleIds: requestedRoleIds }) => {
        const requested = new Set((requestedRoleIds || []).map(Number))
        const selectableIds = new Set(roles.value.filter(checkSelectable).map(item => Number(item.roleId)))
        const selected = [...requested].filter(id => selectableIds.has(id))
        proxy.$refs["roleRef"]?.clearSelection?.()
        await nextTick()
        for (const row of roles.value) {
          if (selected.includes(Number(row.roleId))) {
            proxy.$refs["roleRef"]?.toggleRowSelection?.(row, true)
          }
        }
        roleIds.value = selected
        return { selectedRoleIds: [...selected], saved: false }
      }
    },
    {
      suffix: 'submit',
      permission: 'system:user:edit',
      label: '提交当前用户角色授权',
      handler: async () => submitFormCore(false)
    }
  ],
  getContext: roleSnapshot
})

useAiPageTools('system-user-auth-role', authRoleAiCapabilities.tools, authRoleAiCapabilities.getContext, {
  route: route.path,
  pageName: '分配角色'
})

loadUserRoles()
</script>
