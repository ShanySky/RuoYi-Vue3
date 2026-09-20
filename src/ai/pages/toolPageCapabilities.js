import { definePageCapabilityContract } from '../pageCapabilityContract.js'

export const toolGenPageContract = definePageCapabilityContract({
  pageId: 'tool.gen',
  pageName: '代码生成',
  route: '/tool/gen',
  toolPrefix: 'page_tool_gen',
  queryFields: [
    { key: 'tableName', label: '表名称' },
    { key: 'tableComment', label: '表描述' },
    { key: 'dateRange', label: '创建时间范围', type: 'array', itemType: 'string' },
    { key: 'pageNum', label: '页码', type: 'integer' },
    { key: 'pageSize', label: '每页数量', type: 'integer' },
    { key: 'orderByColumn', label: '排序字段', options: ['createTime', 'updateTime'] },
    { key: 'isAsc', label: '排序方向', options: ['ascending', 'descending'] }
  ],
  query: { permission: 'tool:gen:list' },
  actions: [
    {
      suffix: 'preview', permission: 'tool:gen:preview', label: '预览生成代码',
      inputSchema: { type: 'object', properties: { tableId: { type: 'integer' } }, required: ['tableId'], additionalProperties: false }
    },
    {
      suffix: 'delete', permission: 'tool:gen:remove', label: '删除代码生成配置',
      inputSchema: {
        type: 'object',
        properties: { tableIds: { type: 'array', items: { type: 'integer' } } },
        required: ['tableIds'],
        additionalProperties: false
      }
    },
    {
      suffix: 'sync_db', permission: 'tool:gen:edit', label: '同步数据库表结构',
      inputSchema: { type: 'object', properties: { tableId: { type: 'integer' } }, required: ['tableId'], additionalProperties: false }
    },
    {
      suffix: 'generate', permission: 'tool:gen:code', label: '生成代码',
      inputSchema: { type: 'object', properties: { tableId: { type: 'integer' } }, required: ['tableId'], additionalProperties: false }
    },
    { suffix: 'import_open', permission: 'tool:gen:import', label: '打开数据库表导入窗口' }
  ]
})

export const toolGenEditPageContract = definePageCapabilityContract({
  pageId: 'tool.gen.edit',
  pageName: '修改生成配置',
  route: '/tool/gen-edit/index/*',
  toolPrefix: 'page_tool_gen_edit',
  actions: [
    { suffix: 'view', permission: 'tool:gen:query', label: '查看当前生成配置' },
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
      }
    },
    { suffix: 'submit', permission: 'tool:gen:edit', label: '提交代码生成配置' }
  ]
})

export const toolBuildPageContract = definePageCapabilityContract({
  pageId: 'tool.build',
  pageName: '表单构建',
  route: '/tool/build',
  toolPrefix: 'page_tool_build',
  actions: []
})

export const toolSwaggerPageContract = definePageCapabilityContract({
  pageId: 'tool.swagger',
  pageName: '系统接口',
  route: '/tool/swagger',
  toolPrefix: 'page_tool_swagger',
  actions: []
})

export const toolPageContracts = [
  toolGenPageContract,
  toolGenEditPageContract,
  toolBuildPageContract,
  toolSwaggerPageContract
]
