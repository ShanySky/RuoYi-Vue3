<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
         <el-form-item label="任务名称" prop="jobName">
            <el-input
               v-model="queryParams.jobName"
               placeholder="请输入任务名称"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="任务组名" prop="jobGroup">
            <el-select v-model="queryParams.jobGroup" placeholder="请选择任务组名" clearable style="width: 200px">
               <el-option
                  v-for="dict in sys_job_group"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item label="任务状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="请选择任务状态" clearable style="width: 200px">
               <el-option
                  v-for="dict in sys_job_status"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
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
               @click="handleAdd"
               v-hasPermi="['monitor:job:add']"
            >新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="success"
               plain
               icon="Edit"
               :disabled="single"
               @click="handleUpdate"
               v-hasPermi="['monitor:job:edit']"
            >修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="danger"
               plain
               icon="Delete"
               :disabled="multiple"
               @click="handleDelete"
               v-hasPermi="['monitor:job:remove']"
            >删除</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="warning"
               plain
               icon="Download"
               @click="handleExport"
               v-hasPermi="['monitor:job:export']"
            >导出</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="info"
               plain
               icon="Operation"
               @click="handleJobLog"
               v-hasPermi="['monitor:job:query']"
            >日志</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table v-loading="loading" :data="jobList" @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="55" align="center" />
         <el-table-column label="任务编号" width="100" align="center" prop="jobId" />
         <el-table-column label="任务名称" align="center" :show-overflow-tooltip="true">
            <template #default="scope">
               <a class="link-type" style="cursor:pointer" @click="handleView(scope.row)">{{ scope.row.jobName }}</a>
            </template>
         </el-table-column>
         <el-table-column label="任务组名" align="center" prop="jobGroup">
            <template #default="scope">
               <dict-tag :options="sys_job_group" :value="scope.row.jobGroup" />
            </template>
         </el-table-column>
         <el-table-column label="调用目标字符串" align="center" prop="invokeTarget" :show-overflow-tooltip="true" />
         <el-table-column label="cron执行表达式" align="center" prop="cronExpression" :show-overflow-tooltip="true" />
         <el-table-column label="状态" align="center">
            <template #default="scope">
               <el-switch
                  v-model="scope.row.status"
                  active-value="0"
                  inactive-value="1"
                  @change="handleStatusChange(scope.row)"
               ></el-switch>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" width="200" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-tooltip content="修改" placement="top">
                  <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['monitor:job:edit']"></el-button>
               </el-tooltip>
               <el-tooltip content="删除" placement="top">
                  <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['monitor:job:remove']"></el-button>
               </el-tooltip>
               <el-tooltip content="执行一次" placement="top">
                  <el-button link type="primary" icon="CaretRight" @click="handleRun(scope.row)" v-hasPermi="['monitor:job:changeStatus']"></el-button>
               </el-tooltip>
               <el-tooltip content="调度日志" placement="top">
                  <el-button link type="primary" icon="Operation" @click="handleJobLog(scope.row)" v-hasPermi="['monitor:job:query']"></el-button>
               </el-tooltip>
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

      <!-- 添加或修改定时任务对话框 -->
      <el-dialog :title="title" v-model="open" width="820px" append-to-body>
         <el-form ref="jobRef" :model="form" :rules="rules" label-width="120px">
            <el-row>
               <el-col :span="12">
                  <el-form-item label="任务名称" prop="jobName">
                     <el-input v-model="form.jobName" placeholder="请输入任务名称" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="任务分组" prop="jobGroup">
                     <el-select v-model="form.jobGroup" placeholder="请选择">
                        <el-option
                           v-for="dict in sys_job_group"
                           :key="dict.value"
                           :label="dict.label"
                           :value="dict.value"
                        ></el-option>
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item prop="invokeTarget">
                     <template #label>
                        <span>
                           调用方法
                           <el-tooltip placement="top">
                              <template #content>
                                 <div>
                                    Bean调用示例：ryTask.ryParams('ry')
                                    <br />Class类调用示例：com.ruoyi.quartz.task.RyTask.ryParams('ry')
                                    <br />参数说明：支持字符串，布尔类型，长整型，浮点型，整型
                                 </div>
                              </template>
                              <el-icon><question-filled /></el-icon>
                           </el-tooltip>
                        </span>
                     </template>
                     <el-input v-model="form.invokeTarget" placeholder="请输入调用目标字符串" />
                  </el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item label="cron表达式" prop="cronExpression">
                     <el-input v-model="form.cronExpression" placeholder="请输入cron执行表达式">
                        <template #append>
                           <el-button type="primary" @click="handleShowCron">
                              生成表达式
                              <i class="el-icon-time el-icon--right"></i>
                           </el-button>
                        </template>
                     </el-input>
                  </el-form-item>
               </el-col>
               <el-col :span="24" v-if="form.jobId !== undefined">
                  <el-form-item label="状态">
                     <el-radio-group v-model="form.status">
                        <el-radio
                           v-for="dict in sys_job_status"
                           :key="dict.value"
                           :value="dict.value"
                        >{{ dict.label }}</el-radio>
                     </el-radio-group>
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="执行策略" prop="misfirePolicy">
                     <el-radio-group v-model="form.misfirePolicy">
                        <el-radio-button value="1">立即执行</el-radio-button>
                        <el-radio-button value="2">执行一次</el-radio-button>
                        <el-radio-button value="3">放弃执行</el-radio-button>
                     </el-radio-group>
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="是否并发" prop="concurrent">
                     <el-radio-group v-model="form.concurrent">
                        <el-radio-button value="0">允许</el-radio-button>
                        <el-radio-button value="1">禁止</el-radio-button>
                     </el-radio-group>
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

     <el-dialog title="Cron表达式生成器" v-model="openCron" append-to-body destroy-on-close>
       <crontab ref="crontabRef" @hide="openCron=false" @fill="crontabFill" :expression="expression"></crontab>
     </el-dialog>

      <!-- 任务详细 -->
      <job-detail v-model:visible="openView" :row="form" type="job" />
   </div>
</template>

<script setup name="Job">
import Crontab from '@/components/Crontab'
import JobDetail from './detail'
import { listJob, getJob, delJob, addJob, updateJob, runJob, changeJobStatus } from "@/api/monitor/job"
import { useAiPageTools } from "@/ai/toolRegistry"
import { createAiCrudPageCapabilities } from "@/ai/crudPageCapabilities"

const router = useRouter()
const { proxy } = getCurrentInstance()
const { sys_job_group, sys_job_status } = useDict("sys_job_group", "sys_job_status")

const jobList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const openView = ref(false)
const openCron = ref(false)
const expression = ref("")

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    jobName: undefined,
    jobGroup: undefined,
    status: undefined
  },
  rules: {
    jobName: [{ required: true, message: "任务名称不能为空", trigger: "blur" }],
    invokeTarget: [{ required: true, message: "调用目标字符串不能为空", trigger: "blur" }],
    cronExpression: [{ required: true, message: "cron执行表达式不能为空", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询定时任务列表 */
function getList() {
  loading.value = true
  return listJob(queryParams.value).then(response => {
    jobList.value = response.rows
    total.value = response.total
    return response
  }).finally(() => {
    loading.value = false
  })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    jobId: undefined,
    jobName: undefined,
    jobGroup: undefined,
    invokeTarget: undefined,
    cronExpression: undefined,
    misfirePolicy: '1',
    concurrent: '1',
    status: "0"
  }
  proxy.resetForm("jobRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  return getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  return handleQuery()
}

// 多选框选中数据
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.jobId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

// 任务状态修改
function handleStatusChange(row) {
  let text = row.status === "0" ? "启用" : "停用"
  proxy.$modal.confirm('确认要"' + text + '""' + row.jobName + '"任务吗?').then(function () {
    return changeJobStatus(row.jobId, row.status)
  }).then(() => {
    proxy.$modal.msgSuccess(text + "成功")
  }).catch(function () {
    row.status = row.status === "0" ? "1" : "0"
  })
}

/* 立即执行一次 */
function handleRun(row) {
  proxy.$modal.confirm('确认要立即执行一次"' + row.jobName + '"任务吗?').then(function () {
    return runJob(row.jobId, row.jobGroup)
  }).then(() => {
    proxy.$modal.msgSuccess("执行成功")
  }).catch(() => {})
}

/** 任务详细信息 */
function handleView(row) {
  return getJob(row.jobId).then(response => {
    form.value = response.data
    openView.value = true
    return response.data
  })
}

/** cron表达式按钮操作 */
function handleShowCron() {
  expression.value = form.value.cronExpression
  openCron.value = true
}

/** 确定后回传值 */
function crontabFill(value) {
  form.value.cronExpression = value
}

/** 任务日志列表查询 */
function handleJobLog(row) {
  const jobId = row.jobId || 0
  router.push('/monitor/job-log/index/' + jobId)
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加任务"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const jobId = row.jobId || ids.value
  return getJob(jobId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改任务"
    return response.data
  })
}

/** 提交按钮 */
function submitFormCore() {
  return new Promise((resolve, reject) => {
    proxy.$refs["jobRef"].validate(valid => {
      if (!valid) return reject(new Error("表单校验未通过"))
      const editing = form.value.jobId != undefined
      const savedJobId = form.value.jobId
      const action = editing ? updateJob(form.value) : addJob(form.value)
      action.then(() => {
        proxy.$modal.msgSuccess(editing ? "修改成功" : "新增成功")
        open.value = false
        getList().then(() => resolve({ success: true, jobId: savedJobId }))
      }).catch(reject)
    })
  })
}

function submitForm() {
  submitFormCore().catch(() => {})
}

/** 删除按钮操作 */
function handleDelete(row) {
  const jobIds = row.jobId || ids.value
  proxy.$modal.confirm('是否确认删除定时任务编号为"' + jobIds + '"的数据项?').then(function () {
    return delJob(jobIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("monitor/job/export", {
    ...queryParams.value,
  }, `job_${new Date().getTime()}.xlsx`)
}


const jobAiCapabilities = createAiCrudPageCapabilities({
  pageName: '定时任务',
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
  query: {
    permission: 'monitor:job:list',
    apply: async args => {
      for (const key of ['jobName', 'jobGroup', 'status', 'pageNum', 'pageSize']) {
        if (Object.prototype.hasOwnProperty.call(args, key)) queryParams.value[key] = args[key] ?? undefined
      }
    },
    run: getList,
    reset: resetQuery
  },
  form: {
    addPermission: 'monitor:job:add',
    editPermission: 'monitor:job:edit',
    recordIdKey: 'jobId',
    recordIdLabel: '任务ID',
    openAdd: async () => { handleAdd(); await nextTick(); return form.value },
    openEdit: jobId => handleUpdate({ jobId }),
    snapshot: () => ({ ...form.value }),
    setFields: async args => {
      const allowed = ['jobName', 'jobGroup', 'invokeTarget', 'cronExpression', 'misfirePolicy', 'concurrent', 'status']
      const changedFields = []
      for (const key of allowed) if (Object.prototype.hasOwnProperty.call(args, key)) {
        form.value[key] = args[key]
        changedFields.push(key)
      }
      await nextTick()
      return { changedFields, saved: false, form: { ...form.value } }
    },
    submit: submitFormCore
  },
  actions: [
    {
      suffix: 'view',
      permission: 'monitor:job:query',
      label: '查看任务详情',
      inputSchema: { type: 'object', properties: { jobId: { type: 'integer' } }, required: ['jobId'], additionalProperties: false },
      handler: async ({ jobId }) => {
        const data = await handleView({ jobId })
        return { opened: true, jobId, data }
      }
    },
    {
      suffix: 'change_status',
      permission: 'monitor:job:changeStatus',
      label: '启用或暂停任务',
      inputSchema: { type: 'object', properties: { jobId: { type: 'integer' }, status: { type: 'string', enum: ['0', '1'] } }, required: ['jobId', 'status'], additionalProperties: false },
      handler: async ({ jobId, status }) => {
        await changeJobStatus(jobId, status)
        await getList()
        return { jobId, status }
      }
    },
    {
      suffix: 'run_now',
      permission: 'monitor:job:changeStatus',
      label: '立即执行一次任务',
      inputSchema: { type: 'object', properties: { jobId: { type: 'integer' }, jobGroup: { type: 'string' } }, required: ['jobId', 'jobGroup'], additionalProperties: false },
      handler: async ({ jobId, jobGroup }) => {
        await runJob(jobId, jobGroup)
        return { executed: true, jobId, jobGroup }
      }
    },
    {
      suffix: 'delete',
      permission: 'monitor:job:remove',
      label: '删除定时任务',
      inputSchema: { type: 'object', properties: { jobIds: { type: 'array', items: { type: 'integer' } } }, required: ['jobIds'], additionalProperties: false },
      handler: async ({ jobIds }) => {
        if (!Array.isArray(jobIds) || !jobIds.length) throw new Error('没有可删除的任务ID')
        await delJob(jobIds.join(','))
        await getList()
        return { deletedJobIds: jobIds }
      }
    },
    {
      suffix: 'export',
      permission: 'monitor:job:export',
      label: '按当前查询条件导出定时任务',
      handler: async () => {
        handleExport()
        return { started: true, query: { ...queryParams.value } }
      }
    }
  ],
  getRows: () => jobList.value.slice(0, 50).map(item => ({ ...item })),
  getTotal: () => total.value,
  getSelectedIds: () => [...ids.value],
  getContext: () => ({
    query: { ...queryParams.value },
    pagination: { pageNum: queryParams.value.pageNum, pageSize: queryParams.value.pageSize, total: total.value },
    jobGroups: sys_job_group.value?.map(item => ({ label: item.label, value: item.value })) || [],
    jobStatuses: sys_job_status.value?.map(item => ({ label: item.label, value: item.value })) || [],
    relatedRoutes: [{ title: '调度日志', template: '/monitor/job-log/index/{jobId}' }],
    open: open.value,
    openView: openView.value,
    form: open.value || openView.value ? { ...form.value } : null
  })
})

useAiPageTools('monitor-job', jobAiCapabilities.tools, jobAiCapabilities.getContext, {
  route: '/monitor/job',
  pageName: '定时任务'
})

getList()
</script>
