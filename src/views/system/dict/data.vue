<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
         <el-form-item label="字典名称" prop="dictType">
            <el-select v-model="queryParams.dictType" style="width: 200px">
               <el-option
                  v-for="item in typeOptions"
                  :key="item.dictId"
                  :label="item.dictName"
                  :value="item.dictType"
               />
            </el-select>
         </el-form-item>
         <el-form-item label="字典标签" prop="dictLabel">
            <el-input
               v-model="queryParams.dictLabel"
               placeholder="请输入字典标签"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="数据状态" clearable style="width: 200px">
               <el-option
                  v-for="dict in sys_normal_disable"
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
               v-hasPermi="['system:dict:add']"
            >新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="success"
               plain
               icon="Edit"
               :disabled="single"
               @click="handleUpdate"
               v-hasPermi="['system:dict:edit']"
            >修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="danger"
               plain
               icon="Delete"
               :disabled="multiple"
               @click="handleDelete"
               v-hasPermi="['system:dict:remove']"
            >删除</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="warning"
               plain
               icon="Download"
               @click="handleExport"
               v-hasPermi="['system:dict:export']"
            >导出</el-button>
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

      <el-table v-loading="loading" :data="dataList" @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="55" align="center" />
         <el-table-column label="字典编码" align="center" prop="dictCode" />
         <el-table-column label="字典标签" align="center" prop="dictLabel">
            <template #default="scope">
               <span v-if="(scope.row.listClass == '' || scope.row.listClass == 'default') && (scope.row.cssClass == '' || scope.row.cssClass == null)">{{ scope.row.dictLabel }}</span>
               <el-tag v-else :type="scope.row.listClass == 'primary' ? '' : scope.row.listClass" :class="scope.row.cssClass">{{ scope.row.dictLabel }}</el-tag>
            </template>
         </el-table-column>
         <el-table-column label="字典键值" align="center" prop="dictValue" />
         <el-table-column label="字典排序" align="center" prop="dictSort" />
         <el-table-column label="状态" align="center" prop="status">
            <template #default="scope">
               <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
         <el-table-column label="创建时间" align="center" prop="createTime" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" width="160" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:dict:edit']">修改</el-button>
               <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:dict:remove']">删除</el-button>
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

      <!-- 添加或修改参数配置对话框 -->
      <el-dialog :title="title" v-model="open" width="500px" append-to-body>
         <el-form ref="dataRef" :model="form" :rules="rules" label-width="80px">
            <el-form-item label="字典类型">
               <el-input v-model="form.dictType" :disabled="true" />
            </el-form-item>
            <el-form-item label="数据标签" prop="dictLabel">
               <el-input v-model="form.dictLabel" placeholder="请输入数据标签" />
            </el-form-item>
            <el-form-item label="数据键值" prop="dictValue">
               <el-input v-model="form.dictValue" placeholder="请输入数据键值" />
            </el-form-item>
            <el-form-item label="样式属性" prop="cssClass">
               <el-input v-model="form.cssClass" placeholder="请输入样式属性" />
            </el-form-item>
            <el-form-item label="显示排序" prop="dictSort">
               <el-input-number v-model="form.dictSort" controls-position="right" :min="0" />
            </el-form-item>
            <el-form-item label="回显样式" prop="listClass">
               <el-select v-model="form.listClass">
                  <el-option
                     v-for="item in listClassOptions"
                     :key="item.value"
                     :label="item.label + '(' + item.value + ')'"
                     :value="item.value"
                  ></el-option>
               </el-select>
            </el-form-item>
            <el-form-item label="状态" prop="status">
               <el-radio-group v-model="form.status">
                  <el-radio
                     v-for="dict in sys_normal_disable"
                     :key="dict.value"
                     :value="dict.value"
                  >{{ dict.label }}</el-radio>
               </el-radio-group>
            </el-form-item>
            <el-form-item label="备注" prop="remark">
               <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitForm">确 定</el-button>
               <el-button @click="cancel">取 消</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="Data">
import useDictStore from '@/store/modules/dict'
import { optionselect as getDictOptionselect, getType } from "@/api/system/dict/type"
import { listData, getData, delData, addData, updateData } from "@/api/system/dict/data"
import { createAiCrudPageCapabilities } from "@/ai/crudPageCapabilities"

const { proxy } = getCurrentInstance()
const { sys_normal_disable } = useDict("sys_normal_disable")

const dataList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const defaultDictType = ref("")
const typeOptions = ref([])
const route = useRoute()
// 数据标签回显样式
const listClassOptions = ref([
  { value: "default", label: "默认" }, 
  { value: "primary", label: "主要" }, 
  { value: "success", label: "成功" },
  { value: "info", label: "信息" },
  { value: "warning", label: "警告" },
  { value: "danger", label: "危险" }
])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    dictType: undefined,
    dictLabel: undefined,
    status: undefined
  },
  rules: {
    dictLabel: [{ required: true, message: "数据标签不能为空", trigger: "blur" }],
    dictValue: [{ required: true, message: "数据键值不能为空", trigger: "blur" }],
    dictSort: [{ required: true, message: "数据顺序不能为空", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询字典类型详细 */
function getTypes(dictId) {
  getType(dictId).then(response => {
    queryParams.value.dictType = response.data.dictType
    defaultDictType.value = response.data.dictType
    getList()
  })
}

/** 查询字典类型列表 */
function getTypeList() {
  getDictOptionselect().then(response => {
    typeOptions.value = response.data
  })
}

/** 查询字典数据列表 */
function getList() {
  loading.value = true
  listData(queryParams.value).then(response => {
    dataList.value = response.rows
    total.value = response.total
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
    dictCode: undefined,
    dictLabel: undefined,
    dictValue: undefined,
    cssClass: undefined,
    listClass: "default",
    dictSort: 0,
    status: "0",
    remark: undefined
  }
  proxy.resetForm("dataRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 返回按钮操作 */
function handleClose() {
  const obj = { path: "/system/dict" }
  proxy.$tab.closeOpenPage(obj)
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  queryParams.value.dictType = defaultDictType.value
  handleQuery()
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加字典数据"
  form.value.dictType = queryParams.value.dictType
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.dictCode)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const dictCode = row.dictCode || ids.value
  getData(dictCode).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改字典数据"
  })
}

async function submitFormCore() {
  if (!open.value) throw new Error("当前没有打开字典数据表单")
  await proxy.$refs["dataRef"].validate()
  const editing = form.value.dictCode != undefined
  if (editing) await updateData(form.value)
  else await addData(form.value)
  useDictStore().removeDict(queryParams.value.dictType)
  proxy.$modal.msgSuccess(editing ? "修改成功" : "新增成功")
  const result = { dictCode: form.value.dictCode, dictType: form.value.dictType, dictLabel: form.value.dictLabel, dictValue: form.value.dictValue }
  open.value = false
  await getList()
  return result
}

/** 提交按钮 */
function submitForm() {
  submitFormCore().catch(() => {})
}

/** 删除按钮操作 */
function handleDelete(row) {
  const dictCodes = row.dictCode || ids.value
  proxy.$modal.confirm('是否确认删除字典编码为"' + dictCodes + '"的数据项？').then(function() {
    return delData(dictCodes)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
    useDictStore().removeDict(queryParams.value.dictType)
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("system/dict/data/export", {
    ...queryParams.value
  }, `dict_data_${new Date().getTime()}.xlsx`)
}

async function openDictDataForAi(dictCode) {
  reset()
  const response = await getData(dictCode)
  form.value = response.data
  open.value = true
  title.value = "修改字典数据"
  await nextTick()
  return { ...form.value }
}

function currentNormalOptions() {
  const items = sys_normal_disable?.value || []
  return items.map(item => ({ label: item.label, value: item.value }))
}

const dictDataAiCapabilities = createAiCrudPageCapabilities({
  pageName: '字典数据',
  toolPrefix: 'page_system_dict_data',
  queryFields: [
    { key: 'dictType', label: '字典类型', options: () => typeOptions.value.map(item => ({ label: item.dictName, value: item.dictType })) },
    { key: 'dictLabel', label: '字典标签' },
    { key: 'status', label: '状态', options: currentNormalOptions },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' }
  ],
  formFields: [
    { key: 'dictType', label: '字典类型', editable: false },
    { key: 'dictLabel', label: '数据标签', required: true, validationRules: () => rules.value.dictLabel },
    { key: 'dictValue', label: '数据键值', required: true, validationRules: () => rules.value.dictValue },
    { key: 'cssClass', label: '样式属性' },
    { key: 'dictSort', label: '显示排序', type: 'integer', required: true, validationRules: () => rules.value.dictSort, inputSchema: { type: 'integer', minimum: 0 } },
    { key: 'listClass', label: '回显样式', options: () => listClassOptions.value },
    { key: 'status', label: '状态', options: currentNormalOptions },
    { key: 'remark', label: '备注' }
  ],
  query: {
    permission: 'system:dict:list',
    apply: async args => {
      for (const key of ['dictType', 'dictLabel', 'status', 'pageNum', 'pageSize']) {
        if (Object.prototype.hasOwnProperty.call(args, key)) queryParams.value[key] = args[key] ?? undefined
      }
      queryParams.value.pageNum = Number(queryParams.value.pageNum || 1)
    },
    run: getList,
    reset: async () => {
      Object.assign(queryParams.value, { pageNum: 1, pageSize: 10, dictType: defaultDictType.value, dictLabel: undefined, status: undefined })
      return getList()
    },
    result: () => ({ total: total.value, rows: dataList.value.map(item => ({ ...item })) })
  },
  form: {
    addPermission: 'system:dict:add',
    editPermission: 'system:dict:edit',
    recordIdKey: 'dictCode',
    recordIdLabel: '字典编码',
    openAdd: async () => { handleAdd(); await nextTick(); return { ...form.value } },
    openEdit: openDictDataForAi,
    snapshot: () => ({ ...form.value }),
    setFields: async args => {
      if (!open.value) throw new Error('当前没有打开字典数据表单')
      for (const key of ['dictLabel', 'dictValue', 'cssClass', 'dictSort', 'listClass', 'status', 'remark']) {
        if (Object.prototype.hasOwnProperty.call(args, key)) form.value[key] = args[key]
      }
      await nextTick()
      return { saved: false, form: { ...form.value } }
    },
    submit: submitFormCore
  },
  actions: [
    {
      suffix: 'delete',
      permission: 'system:dict:remove',
      label: '删除字典数据',
      inputSchema: { type: 'object', properties: { dictCodes: { type: 'array', items: { type: 'integer' } } }, required: ['dictCodes'], additionalProperties: false },
      handler: async ({ dictCodes }) => {
        const values = Array.isArray(dictCodes) ? [...new Set(dictCodes.filter(Boolean))] : []
        if (!values.length) throw new Error('没有可删除的字典编码')
        await delData(values.join(','))
        useDictStore().removeDict(queryParams.value.dictType)
        await getList()
        return { deletedDictCodes: values }
      }
    },
    {
      suffix: 'export',
      permission: 'system:dict:export',
      label: '按当前查询条件导出字典数据',
      handler: async () => {
        handleExport()
        return { started: true, query: { ...queryParams.value } }
      }
    }
  ],
  getRows: () => dataList.value.map(item => ({ ...item })),
  getTotal: () => total.value,
  getSelectedIds: () => [...ids.value],
  getContext: () => ({
    dictType: queryParams.value.dictType,
    query: { ...queryParams.value },
    pagination: { pageNum: queryParams.value.pageNum, pageSize: queryParams.value.pageSize, total: total.value },
    form: open.value ? { open: true, value: { ...form.value } } : { open: false }
  })
})

useAiPageTools('system.dict.data', dictDataAiCapabilities.tools, dictDataAiCapabilities.getContext, {
  route: route.path,
  pageName: '字典数据'
})

getTypes(route.params && route.params.dictId)
getTypeList()
</script>
