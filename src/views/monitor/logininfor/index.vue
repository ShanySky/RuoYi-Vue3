<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
         <el-form-item label="登录地址" prop="ipaddr">
            <el-input
               v-model="queryParams.ipaddr"
               placeholder="请输入登录地址"
               clearable
               style="width: 240px;"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="用户名称" prop="userName">
            <el-input
               v-model="queryParams.userName"
               placeholder="请输入用户名称"
               clearable
               style="width: 240px;"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select
               v-model="queryParams.status"
               placeholder="登录状态"
               clearable
               style="width: 240px"
            >
               <el-option
                  v-for="dict in sys_common_status"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item label="登录时间" style="width: 308px">
            <el-date-picker
               v-model="dateRange"
               value-format="YYYY-MM-DD HH:mm:ss"
               type="daterange"
               range-separator="-"
               start-placeholder="开始日期"
               end-placeholder="结束日期"
               :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]"
            ></el-date-picker>
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button
               type="danger"
               plain
               icon="Delete"
               :disabled="multiple"
               @click="handleDelete"
               v-hasPermi="['monitor:logininfor:remove']"
            >删除</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="danger"
               plain
               icon="Delete"
               @click="handleClean"
               v-hasPermi="['monitor:logininfor:remove']"
            >清空</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="primary"
               plain
               icon="Unlock"
               :disabled="single"
               @click="handleUnlock"
               v-hasPermi="['monitor:logininfor:unlock']"
            >解锁</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="warning"
               plain
               icon="Download"
               @click="handleExport"
               v-hasPermi="['monitor:logininfor:export']"
            >导出</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table ref="logininforRef" v-loading="loading" :data="logininforList" @selection-change="handleSelectionChange" :default-sort="defaultSort" @sort-change="handleSortChange">
         <el-table-column type="selection" width="55" align="center" />
         <el-table-column label="访问编号" align="center" prop="infoId" />
         <el-table-column label="用户名称" align="center" prop="userName" :show-overflow-tooltip="true" sortable="custom" :sort-orders="['descending', 'ascending']" />
         <el-table-column label="地址" align="center" prop="ipaddr" :show-overflow-tooltip="true" />
         <el-table-column label="登录地点" align="center" prop="loginLocation" :show-overflow-tooltip="true" />
         <el-table-column label="操作系统" align="center" prop="os" :show-overflow-tooltip="true" />
         <el-table-column label="浏览器" align="center" prop="browser" :show-overflow-tooltip="true" />
         <el-table-column label="登录状态" align="center" prop="status">
            <template #default="scope">
               <dict-tag :options="sys_common_status" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column label="描述" align="center" prop="msg" :show-overflow-tooltip="true" />
         <el-table-column label="访问时间" align="center" prop="loginTime" sortable="custom" :sort-orders="['descending', 'ascending']" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.loginTime) }}</span>
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
   </div>
</template>

<script setup name="Logininfor">
import { list, delLogininfor, cleanLogininfor, unlockLogininfor } from "@/api/monitor/logininfor"
import { useAiPageTools } from "@/ai/toolRegistry"
import { createAiCrudPageCapabilities } from "@/ai/crudPageCapabilities"

const { proxy } = getCurrentInstance()
const { sys_common_status } = useDict("sys_common_status")

const logininforList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const selectName = ref("")
const total = ref(0)
const dateRange = ref([])
const defaultSort = ref({ prop: "loginTime", order: "descending" })

// 查询参数
const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  ipaddr: undefined,
  userName: undefined,
  status: undefined,
  orderByColumn: undefined,
  isAsc: undefined
})

/** 查询登录日志列表 */
function getList() {
  loading.value = true
  return list(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    logininforList.value = response.rows
    total.value = response.total
    return response
  }).finally(() => {
    loading.value = false
  })
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
  queryParams.value.pageNum = 1
  proxy.$refs["logininforRef"].sort(defaultSort.value.prop, defaultSort.value.order)
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.infoId)
  multiple.value = !selection.length
  single.value = selection.length != 1
  selectName.value = selection.map(item => item.userName)
}

/** 排序触发事件 */
function handleSortChange(column, prop, order) {
  queryParams.value.orderByColumn = column.prop
  queryParams.value.isAsc = column.order
  getList()
}

/** 删除按钮操作 */
function handleDelete(row) {
  const infoIds = row.infoId || ids.value
  proxy.$modal.confirm('是否确认删除访问编号为"' + infoIds + '"的数据项?').then(function () {
    return delLogininfor(infoIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 清空按钮操作 */
function handleClean() {
  proxy.$modal.confirm("是否确认清空所有登录日志数据项?").then(function () {
    return cleanLogininfor()
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("清空成功")
  }).catch(() => {})
}

/** 解锁按钮操作 */
function handleUnlock() {
  const username = selectName.value
  proxy.$modal.confirm('是否确认解锁用户"' + username + '"数据项?').then(function () {
    return unlockLogininfor(username)
  }).then(() => {
    proxy.$modal.msgSuccess("用户" + username + "解锁成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("monitor/logininfor/export", {
    ...queryParams.value,
  }, `logininfor_${new Date().getTime()}.xlsx`)
}


const logininforAiCapabilities = createAiCrudPageCapabilities({
  pageName: '登录日志',
  toolPrefix: 'page_monitor_logininfor',
  queryFields: [
    { key: 'ipaddr', label: '登录地址' },
    { key: 'userName', label: '用户名称' },
    { key: 'status', label: '登录状态', options: ['0', '1'] },
    { key: 'dateRange', label: '登录时间范围', type: 'array', itemType: 'string' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  query: {
    permission: 'monitor:logininfor:list',
    apply: async args => {
      for (const key of ['ipaddr', 'userName', 'status', 'pageNum', 'pageSize']) {
        if (Object.prototype.hasOwnProperty.call(args, key)) queryParams.value[key] = args[key] ?? undefined
      }
      if (Array.isArray(args.dateRange)) dateRange.value = args.dateRange.slice(0, 2)
    },
    run: getList,
    reset: async () => {
      dateRange.value = []
      Object.assign(queryParams.value, {
        pageNum: 1, pageSize: 10, ipaddr: undefined, userName: undefined,
        status: undefined, orderByColumn: undefined, isAsc: undefined
      })
      return getList()
    }
  },
  actions: [
    {
      suffix: 'delete',
      permission: 'monitor:logininfor:remove',
      label: '删除登录日志',
      inputSchema: { type: 'object', properties: { infoIds: { type: 'array', items: { type: 'integer' } } }, required: ['infoIds'], additionalProperties: false },
      handler: async ({ infoIds }) => {
        if (!Array.isArray(infoIds) || !infoIds.length) throw new Error('没有可删除的登录日志ID')
        await delLogininfor(infoIds.join(','))
        await getList()
        return { deletedInfoIds: infoIds }
      }
    },
    {
      suffix: 'clean',
      permission: 'monitor:logininfor:remove',
      label: '清空全部登录日志',
      handler: async () => {
        await cleanLogininfor()
        await getList()
        return { cleaned: true }
      }
    },
    {
      suffix: 'unlock',
      permission: 'monitor:logininfor:unlock',
      label: '解锁登录用户',
      inputSchema: { type: 'object', properties: { userName: { type: 'string' } }, required: ['userName'], additionalProperties: false },
      handler: async ({ userName }) => {
        await unlockLogininfor(userName)
        return { unlocked: true, userName }
      }
    },
    {
      suffix: 'export',
      permission: 'monitor:logininfor:export',
      label: '按当前查询条件导出登录日志',
      handler: async () => {
        handleExport()
        return { started: true, query: { ...queryParams.value }, dateRange: [...dateRange.value] }
      }
    }
  ],
  getRows: () => logininforList.value.slice(0, 50).map(item => ({ ...item })),
  getTotal: () => total.value,
  getSelectedIds: () => [...ids.value],
  getContext: () => ({
    query: { ...queryParams.value },
    dateRange: [...dateRange.value],
    pagination: { pageNum: queryParams.value.pageNum, pageSize: queryParams.value.pageSize, total: total.value }
  })
})

useAiPageTools('monitor-logininfor', logininforAiCapabilities.tools, logininforAiCapabilities.getContext, {
  route: '/monitor/logininfor',
  pageName: '登录日志'
})

getList()
</script>
