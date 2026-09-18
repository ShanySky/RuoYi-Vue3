<template>
  <el-card>
    <el-tabs v-model="activeName">
      <el-tab-pane label="基本信息" name="basic">
        <basic-info-form ref="basicInfo" :info="info" />
      </el-tab-pane>
      <el-tab-pane label="字段信息" name="columnInfo">
        <el-table ref="dragTable" :data="columns" row-key="columnId" :max-height="tableHeight">
          <el-table-column label="序号" type="index" min-width="5%" class-name="allowDrag"/>
          <el-table-column label="字段列名" prop="columnName" min-width="10%" :show-overflow-tooltip="true" class-name="allowDrag"/>
          <el-table-column label="字段描述" min-width="10%">
            <template #default="scope">
              <el-input v-model="scope.row.columnComment"></el-input>
            </template>
          </el-table-column>
          <el-table-column
            label="物理类型"
            prop="columnType"
            min-width="10%"
            :show-overflow-tooltip="true"
          />
          <el-table-column label="Java类型" min-width="11%">
            <template #default="scope">
              <el-select v-model="scope.row.javaType">
                <el-option label="Long" value="Long" />
                <el-option label="String" value="String" />
                <el-option label="Integer" value="Integer" />
                <el-option label="Double" value="Double" />
                <el-option label="BigDecimal" value="BigDecimal" />
                <el-option label="Date" value="Date" />
                <el-option label="Boolean" value="Boolean" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="java属性" min-width="10%">
            <template #default="scope">
              <el-input v-model="scope.row.javaField"></el-input>
            </template>
          </el-table-column>

          <el-table-column label="插入" min-width="5%">
            <template #default="scope">
              <el-checkbox true-value="1" false-value="0" v-model="scope.row.isInsert"></el-checkbox>
            </template>
          </el-table-column>
          <el-table-column label="编辑" min-width="5%">
            <template #default="scope">
              <el-checkbox true-value="1" false-value="0" v-model="scope.row.isEdit"></el-checkbox>
            </template>
          </el-table-column>
          <el-table-column label="列表" min-width="5%">
            <template #default="scope">
              <el-checkbox true-value="1" false-value="0" v-model="scope.row.isList"></el-checkbox>
            </template>
          </el-table-column>
          <el-table-column label="查询" min-width="5%">
            <template #default="scope">
              <el-checkbox true-value="1" false-value="0" v-model="scope.row.isQuery"></el-checkbox>
            </template>
          </el-table-column>
          <el-table-column label="查询方式" min-width="10%">
            <template #default="scope">
              <el-select v-model="scope.row.queryType">
                <el-option label="=" value="EQ" />
                <el-option label="!=" value="NE" />
                <el-option label=">" value="GT" />
                <el-option label=">=" value="GTE" />
                <el-option label="<" value="LT" />
                <el-option label="<=" value="LTE" />
                <el-option label="LIKE" value="LIKE" />
                <el-option label="BETWEEN" value="BETWEEN" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="必填" min-width="5%">
            <template #default="scope">
              <el-checkbox true-value="1" false-value="0" v-model="scope.row.isRequired"></el-checkbox>
            </template>
          </el-table-column>
          <el-table-column label="显示类型" min-width="12%">
            <template #default="scope">
              <el-select v-model="scope.row.htmlType">
                <el-option label="文本框" value="input" />
                <el-option label="文本域" value="textarea" />
                <el-option label="下拉框" value="select" />
                <el-option label="单选框" value="radio" />
                <el-option label="复选框" value="checkbox" />
                <el-option label="日期控件" value="datetime" />
                <el-option label="图片上传" value="imageUpload" />
                <el-option label="文件上传" value="fileUpload" />
                <el-option label="富文本控件" value="editor" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="字典类型" min-width="12%">
            <template #default="scope">
              <el-select v-model="scope.row.dictType" clearable filterable placeholder="请选择">
                <el-option
                  v-for="dict in dictOptions"
                  :key="dict.dictType"
                  :label="dict.dictName"
                  :value="dict.dictType">
                  <span style="float: left">{{ dict.dictName }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">{{ dict.dictType }}</span>
              </el-option>
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="生成信息" name="genInfo">
        <gen-info-form ref="genInfo" :info="info" :tables="tables" />
      </el-tab-pane>
    </el-tabs>
    <el-form label-width="100px">
      <div style="text-align: center;margin-left:-100px;margin-top:10px;">
        <el-button type="primary" @click="submitForm()">提交</el-button>
        <el-button @click="close()">返回</el-button>
      </div>
    </el-form>
  </el-card>
</template>

<script setup name="GenEdit">
import { getGenTable, updateGenTable } from "@/api/tool/gen"
import { optionselect as getDictOptionselect } from "@/api/system/dict/type"
import basicInfoForm from "./basicInfoForm"
import genInfoForm from "./genInfoForm"
import Sortable from 'sortablejs'
import { createAiCrudPageCapabilities } from '@/ai/crudPageCapabilities'

const route = useRoute()
const { proxy } = getCurrentInstance()

const activeName = ref("columnInfo")
const tableHeight = ref(document.documentElement.scrollHeight - 245 + "px")
const tables = ref([])
const columns = ref([])
const dictOptions = ref([])
const info = ref({})

function buildGenTablePayload() {
  const genTable = Object.assign({}, info.value)
  genTable.columns = columns.value
  genTable.params = {
    genView: info.value.view ? '1' : '0',
    treeCode: info.value.treeCode,
    treeName: info.value.treeName,
    treeParentCode: info.value.treeParentCode,
    parentMenuId: info.value.parentMenuId
  }
  return genTable
}

async function submitFormCore() {
  const basicForm = proxy.$refs.basicInfo?.$refs?.basicInfoForm
  const genForm = proxy.$refs.genInfo?.$refs?.genInfoForm
  if (!basicForm || !genForm) throw new Error('生成配置表单尚未就绪')
  const res = await Promise.all([basicForm, genForm].map(getFormPromise))
  if (!res.every(Boolean)) throw new Error('表单校验未通过，请重新检查提交内容')
  const genTable = buildGenTablePayload()
  const response = await updateGenTable(genTable)
  proxy.$modal.msgSuccess(response.msg)
  return { saved: true, tableId: genTable.tableId, tableName: genTable.tableName }
}

/** 提交按钮 */
function submitForm() {
  submitFormCore().then(response => {
    if (response?.saved) close()
  }).catch(error => {
    if (String(error?.message || '').includes('校验')) proxy.$modal.msgError(error.message)
  })
}

function getFormPromise(form) {
  return new Promise(resolve => {
    form.validate(res => {
      resolve(res)
    })
  })
}

function close() {
  const obj = { path: "/tool/gen", query: { t: Date.now(), pageNum: route.query.pageNum } }
  proxy.$tab.closeOpenPage(obj)
}

function codegenInfoSnapshot() {
  const value = info.value || {}
  return {
    tableId: value.tableId,
    tableName: value.tableName,
    tableComment: value.tableComment,
    className: value.className,
    functionAuthor: value.functionAuthor,
    remark: value.remark,
    tplCategory: value.tplCategory,
    tplWebType: value.tplWebType,
    packageName: value.packageName,
    moduleName: value.moduleName,
    businessName: value.businessName,
    functionName: value.functionName,
    formColNum: value.formColNum,
    view: !!value.view,
    genType: value.genType,
    genPath: value.genPath,
    parentMenuId: value.parentMenuId,
    treeCode: value.treeCode,
    treeParentCode: value.treeParentCode,
    treeName: value.treeName,
    subTableName: value.subTableName,
    subTableFkName: value.subTableFkName
  }
}

function codegenColumnSnapshot(column) {
  return {
    columnId: column.columnId,
    columnName: column.columnName,
    columnComment: column.columnComment,
    columnType: column.columnType,
    javaType: column.javaType,
    javaField: column.javaField,
    isInsert: column.isInsert,
    isEdit: column.isEdit,
    isList: column.isList,
    isQuery: column.isQuery,
    queryType: column.queryType,
    isRequired: column.isRequired,
    htmlType: column.htmlType,
    dictType: column.dictType,
    sort: column.sort
  }
}

const codegenEditAiCapabilities = createAiCrudPageCapabilities({
  pageName: '修改生成配置',
  toolPrefix: 'page_tool_gen_edit',
  actions: [
    {
      suffix: 'view',
      permission: 'tool:gen:query',
      label: '查看当前生成配置',
      handler: async () => ({
        activeTab: activeName.value,
        info: codegenInfoSnapshot(),
        columns: columns.value.map(codegenColumnSnapshot),
        dictOptions: dictOptions.value.map(item => ({ dictName: item.dictName, dictType: item.dictType }))
      })
    },
    {
      suffix: 'set_info',
      permission: 'tool:gen:edit',
      label: '修改代码生成基础与生成信息但不保存',
      inputSchema: {
        type: 'object',
        properties: {
          tableName: { type: 'string' },
          tableComment: { type: 'string' },
          className: { type: 'string' },
          functionAuthor: { type: 'string' },
          remark: { type: 'string' },
          tplCategory: { type: 'string', enum: ['crud', 'tree', 'sub'] },
          tplWebType: { type: 'string', enum: ['element-ui', 'element-plus', 'element-plus-typescript'] },
          packageName: { type: 'string' },
          moduleName: { type: 'string' },
          businessName: { type: 'string' },
          functionName: { type: 'string' },
          formColNum: { type: 'integer', enum: [1, 2, 3] },
          view: { type: 'boolean' },
          genType: { type: 'string', enum: ['0', '1'] },
          genPath: { type: 'string' },
          parentMenuId: { type: 'integer' },
          treeCode: { type: 'string' },
          treeParentCode: { type: 'string' },
          treeName: { type: 'string' },
          subTableName: { type: 'string' },
          subTableFkName: { type: 'string' }
        },
        additionalProperties: false
      },
      handler: async args => {
        const allowed = ['tableName','tableComment','className','functionAuthor','remark','tplCategory','tplWebType',
          'packageName','moduleName','businessName','functionName','formColNum','view','genType','genPath','parentMenuId',
          'treeCode','treeParentCode','treeName','subTableName','subTableFkName']
        for (const key of allowed) {
          if (Object.prototype.hasOwnProperty.call(args, key)) info.value[key] = args[key]
        }
        await nextTick()
        return { saved: false, info: codegenInfoSnapshot() }
      }
    },
    {
      suffix: 'set_column',
      permission: 'tool:gen:edit',
      label: '修改指定生成字段配置但不保存',
      inputSchema: {
        type: 'object',
        properties: {
          columnId: { type: 'integer' },
          columnComment: { type: 'string' },
          javaType: { type: 'string', enum: ['Long','String','Integer','Double','BigDecimal','Date','Boolean'] },
          javaField: { type: 'string' },
          isInsert: { type: 'string', enum: ['0','1'] },
          isEdit: { type: 'string', enum: ['0','1'] },
          isList: { type: 'string', enum: ['0','1'] },
          isQuery: { type: 'string', enum: ['0','1'] },
          queryType: { type: 'string', enum: ['EQ','NE','GT','GTE','LT','LTE','LIKE','BETWEEN'] },
          isRequired: { type: 'string', enum: ['0','1'] },
          htmlType: { type: 'string', enum: ['input','textarea','select','radio','checkbox','datetime','imageUpload','fileUpload','editor'] },
          dictType: { type: ['string','null'] }
        },
        required: ['columnId'],
        additionalProperties: false
      },
      handler: async args => {
        const column = columns.value.find(item => Number(item.columnId) === Number(args.columnId))
        if (!column) throw new Error('未找到指定字段')
        const allowed = ['columnComment','javaType','javaField','isInsert','isEdit','isList','isQuery','queryType','isRequired','htmlType','dictType']
        for (const key of allowed) {
          if (Object.prototype.hasOwnProperty.call(args, key)) column[key] = args[key]
        }
        await nextTick()
        return { saved: false, column: codegenColumnSnapshot(column) }
      }
    },
    {
      suffix: 'reorder_columns',
      permission: 'tool:gen:edit',
      label: '重排生成字段',
      inputSchema: {
        type: 'object',
        properties: { columnIds: { type: 'array', items: { type: 'integer' } } },
        required: ['columnIds'],
        additionalProperties: false
      },
      handler: async ({ columnIds }) => {
        const requested = Array.isArray(columnIds) ? columnIds.map(Number) : []
        const existing = columns.value.map(item => Number(item.columnId))
        if (requested.length !== existing.length || new Set(requested).size !== existing.length || existing.some(id => !requested.includes(id))) {
          throw new Error('columnIds 必须完整包含当前全部字段且不能重复')
        }
        const byId = new Map(columns.value.map(item => [Number(item.columnId), item]))
        columns.value = requested.map((id, index) => {
          const column = byId.get(id)
          column.sort = index + 1
          return column
        })
        return { saved: false, columnIds: requested }
      }
    },
    {
      suffix: 'select_tab',
      permission: 'tool:gen:query',
      label: '切换生成配置页签',
      inputSchema: {
        type: 'object',
        properties: { tab: { type: 'string', enum: ['basic', 'columnInfo', 'genInfo'] } },
        required: ['tab'],
        additionalProperties: false
      },
      handler: async ({ tab }) => {
        activeName.value = tab
        await nextTick()
        return { activeTab: activeName.value }
      }
    },
    {
      suffix: 'submit',
      permission: 'tool:gen:edit',
      label: '提交代码生成配置',
      handler: submitFormCore
    }
  ],
  getContext: () => ({
    tableId: Number(route.params?.tableId),
    activeTab: activeName.value,
    info: codegenInfoSnapshot(),
    columns: columns.value.map(codegenColumnSnapshot),
    dictOptions: dictOptions.value.map(item => ({ dictName: item.dictName, dictType: item.dictType })),
    relatedTables: tables.value.map(item => ({ tableName: item.tableName, tableComment: item.tableComment }))
  })
})

useAiPageTools('tool.gen.edit', codegenEditAiCapabilities.tools, codegenEditAiCapabilities.getContext, {
  route: route.path,
  pageName: '修改生成配置'
})

(() => {
  const tableId = route.params && route.params.tableId
  if (tableId) {
    // 获取表详细信息
    getGenTable(tableId).then(res => {
      columns.value = res.data.rows
      info.value = res.data.info
      tables.value = res.data.tables
    })
    /** 查询字典下拉列表 */
    getDictOptionselect().then(response => {
      dictOptions.value = response.data
    })
  }
})()

// 拖动排序
onMounted(() => {
  const element = document.querySelector('.el-table__body > tbody')
  Sortable.create(element, {
    handle: ".allowDrag",
    onEnd: (evt) => {
      const targetRow = columns.value.splice(evt.oldIndex, 1)[0]
      columns.value.splice(evt.newIndex, 0, targetRow)
      for (const index in columns.value) {
        columns.value[index].sort = parseInt(index) + 1
      }
    }
  })
})
</script>
