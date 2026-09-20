<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
         <el-form-item label="公告标题" prop="noticeTitle">
            <el-input
               v-model="queryParams.noticeTitle"
               placeholder="请输入公告标题"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="操作人员" prop="createBy">
            <el-input
               v-model="queryParams.createBy"
               placeholder="请输入操作人员"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="类型" prop="noticeType">
            <el-select v-model="queryParams.noticeType" placeholder="公告类型" clearable style="width: 200px">
               <el-option
                  v-for="dict in sys_notice_type"
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
               v-hasPermi="['system:notice:add']"
            >新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="success"
               plain
               icon="Edit"
               :disabled="single"
               @click="handleUpdate"
               v-hasPermi="['system:notice:edit']"
            >修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="danger"
               plain
               icon="Delete"
               :disabled="multiple"
               @click="handleDelete"
               v-hasPermi="['system:notice:remove']"
            >删除</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table v-loading="loading" :data="noticeList" @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="55" align="center" />
         <el-table-column label="序号" align="center" prop="noticeId" width="100" />
         <el-table-column label="公告标题" align="center" :show-overflow-tooltip="true">
            <template #default="scope">
               <a class="link-type" style="cursor:pointer" @click="handleViewData(scope.row)">{{ scope.row.noticeTitle }}</a>
            </template>
         </el-table-column>
         <el-table-column label="公告类型" align="center" prop="noticeType" width="100">
            <template #default="scope">
               <dict-tag :options="sys_notice_type" :value="scope.row.noticeType" />
            </template>
         </el-table-column>
         <el-table-column label="状态" align="center" prop="status" width="100">
            <template #default="scope">
               <dict-tag :options="sys_notice_status" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column label="创建者" align="center" prop="createBy" width="100" />
         <el-table-column label="创建时间" align="center" prop="createTime" width="100">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d}') }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="User" @click="handleReadUsers(scope.row)" v-hasPermi="['system:notice:list']">阅读用户</el-button>
               <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:notice:edit']">修改</el-button>
               <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:notice:remove']" >删除</el-button>
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

      <!-- 添加或修改公告对话框 -->
      <el-dialog :title="title" v-model="open" width="780px" append-to-body>
         <el-form ref="noticeRef" :model="form" :rules="rules" label-width="80px">
            <el-row>
               <el-col :span="12">
                  <el-form-item label="公告标题" prop="noticeTitle">
                     <el-input v-model="form.noticeTitle" placeholder="请输入公告标题" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="公告类型" prop="noticeType">
                     <el-select v-model="form.noticeType" placeholder="请选择">
                        <el-option
                           v-for="dict in sys_notice_type"
                           :key="dict.value"
                           :label="dict.label"
                           :value="dict.value"
                        ></el-option>
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item label="状态">
                     <el-radio-group v-model="form.status">
                        <el-radio
                           v-for="dict in sys_notice_status"
                           :key="dict.value"
                           :value="dict.value"
                        >{{ dict.label }}</el-radio>
                     </el-radio-group>
                  </el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item label="内容">
                    <editor v-model="form.noticeContent" :min-height="192"/>
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
      <notice-detail-view ref="noticeViewRef" />
      <read-users-dialog ref="readUsersRef" />
   </div>
</template>

<script setup name="Notice">
import NoticeDetailView from "@/layout/components/HeaderNotice/DetailView"
import ReadUsersDialog from "./ReadUsers"
import { listNotice, getNotice, delNotice, addNotice, updateNotice } from "@/api/system/notice"
import { useAiPageTools } from "@/ai/toolRegistry"
import { createAiCrudPageCapabilities } from "@/ai/crudPageCapabilities"
import { systemNoticePageContract } from "@/ai/pages/systemPageCapabilities"

const { proxy } = getCurrentInstance()
const { sys_notice_status, sys_notice_type } = useDict("sys_notice_status", "sys_notice_type")

const noticeList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    noticeTitle: undefined,
    createBy: undefined,
    status: undefined
  },
  rules: {
    noticeTitle: [{ required: true, message: "公告标题不能为空", trigger: "blur" }],
    noticeType: [{ required: true, message: "公告类型不能为空", trigger: "change" }]
  },
})

const { queryParams, form, rules } = toRefs(data)

/** 查询公告列表 */
function getList() {
  loading.value = true
  return listNotice(queryParams.value).then(response => {
    noticeList.value = response.rows
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
    noticeId: undefined,
    noticeTitle: undefined,
    noticeType: undefined,
    noticeContent: undefined,
    status: "0"
  }
  proxy.resetForm("noticeRef")
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

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.noticeId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加公告"
}

/**修改按钮操作 */
function handleUpdate(row) {
  reset()
  const noticeId = row.noticeId || ids.value
  return getNotice(noticeId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改公告"
    return response.data
  })
}

/** 提交按钮 */
function submitFormCore() {
  return new Promise((resolve, reject) => {
    proxy.$refs["noticeRef"].validate(valid => {
      if (!valid) return reject(new Error("表单校验未通过"))
      const editing = form.value.noticeId != undefined
      const savedNoticeId = form.value.noticeId
      const action = editing ? updateNotice(form.value) : addNotice(form.value)
      action.then(() => {
        proxy.$modal.msgSuccess(editing ? "修改成功" : "新增成功")
        open.value = false
        getList().then(() => resolve({ success: true, noticeId: savedNoticeId }))
      }).catch(reject)
    })
  })
}

function submitForm() {
  submitFormCore().catch(() => {})
}

/** 查看公告详情 */
function handleViewData(row) {
  proxy.$refs["noticeViewRef"].open(row)
}

/** 查看已读用户 */
function handleReadUsers(row) {
   proxy.$refs["readUsersRef"].open(row)
}

/** 删除按钮操作 */
function handleDelete(row) {
  const noticeIds = row.noticeId || ids.value
  proxy.$modal.confirm('是否确认删除公告编号为"' + noticeIds + '"的数据项？').then(function() {
    return delNotice(noticeIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}


const noticeAiCapabilities = createAiCrudPageCapabilities({
  contract: systemNoticePageContract,
  bindings: {
    queryFields: {
      noticeType: { options: () => (sys_notice_type?.value || []).map(item => ({ label: item.label, value: item.value })) }
    },
    formFields: {
      noticeTitle: { validationRules: () => rules.value.noticeTitle },
      noticeType: {
        options: () => (sys_notice_type?.value || []).map(item => ({ label: item.label, value: item.value })),
        validationRules: () => rules.value.noticeType
      },
      status: { options: () => (sys_notice_status?.value || []).map(item => ({ label: item.label, value: item.value })) }
    },
    query: {
      apply: async args => {
        for (const key of ['noticeTitle', 'createBy', 'noticeType', 'pageNum', 'pageSize']) if (Object.prototype.hasOwnProperty.call(args, key)) queryParams.value[key] = args[key] ?? undefined
      },
      run: getList,
      reset: resetQuery
    },
    form: {
      openAdd: async () => { handleAdd(); await nextTick(); return form.value },
      openEdit: noticeId => handleUpdate({ noticeId }),
      snapshot: () => ({ ...form.value }),
      setFields: async args => {
        const allowed = ['noticeTitle', 'noticeType', 'status', 'noticeContent']
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
    actions: {
      view: async ({ noticeId }) => {
        const row = noticeList.value.find(item => item.noticeId === noticeId)
        if (!row) throw new Error('当前列表中未找到该公告')
        handleViewData(row)
        return { opened: true, noticeId }
      },
      read_users: async ({ noticeId }) => {
        let row = noticeList.value.find(item => Number(item.noticeId) === Number(noticeId))
        if (!row) {
          const response = await getNotice(noticeId)
          row = response.data
        }
        if (!row) throw new Error('公告不存在')
        const dialog = proxy.$refs["readUsersRef"]
        if (!dialog?.openForAi) throw new Error('阅读用户组件尚未就绪')
        return await dialog.openForAi(row)
      },
      delete: async ({ noticeIds }) => {
        if (!Array.isArray(noticeIds) || !noticeIds.length) throw new Error('没有可删除的公告ID')
        await delNotice(noticeIds.join(','))
        await getList()
        return { deletedNoticeIds: noticeIds }
      }
    },
    getRows: () => noticeList.value.slice(0, 50).map(item => ({ ...item })),
    getTotal: () => total.value,
    getSelectedIds: () => [...ids.value],
    getContext: () => ({
      query: { ...queryParams.value },
      pagination: { pageNum: queryParams.value.pageNum, pageSize: queryParams.value.pageSize, total: total.value },
      open: open.value,
      form: open.value ? { ...form.value } : null
    })
  }
})

useAiPageTools(systemNoticePageContract, noticeAiCapabilities.tools, noticeAiCapabilities.getContext)

getList()
</script>
