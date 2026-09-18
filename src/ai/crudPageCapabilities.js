function objectSchema(properties = {}, required = []) {
  const schema = { type: 'object', properties, additionalProperties: false }
  if (required.length) schema.required = required
  return schema
}

function normalizeFields(fields = []) {
  return fields.map(field => ({
    key: field.key,
    label: field.label || field.key,
    type: field.type || 'string',
    required: !!field.required,
    editable: field.editable !== false,
    options: field.options || undefined,
    description: field.description || undefined
  }))
}

export function createAiCrudPageCapabilities(options) {
  const prefix = options.toolPrefix
  if (!prefix) throw new Error('AI CRUD capability requires toolPrefix')

  const tools = []
  const queryFields = normalizeFields(options.queryFields)
  const formFields = normalizeFields(options.formFields)

  if (options.query?.run) {
    tools.push({
      name: `${prefix}_search`,
      requiredPermission: options.query.permission,
      description: `设置${options.pageName || '当前页面'}查询条件并执行查询`,
      inputSchema: objectSchema(
        Object.fromEntries(queryFields.map(field => [field.key, {
          type: field.type,
          description: field.description || field.label
        }]))
      ),
      handler: async args => {
        await options.query.apply?.(args || {})
        const result = await options.query.run()
        return options.query.result?.(result) || {
          total: options.getTotal?.() ?? null,
          rows: options.getRows?.() ?? []
        }
      }
    })
  }

  if (options.query?.reset) {
    tools.push({
      name: `${prefix}_reset`,
      requiredPermission: options.query.permission,
      description: `重置${options.pageName || '当前页面'}查询条件并刷新数据`,
      inputSchema: objectSchema(),
      handler: async () => {
        await options.query.reset()
        return { reset: true, total: options.getTotal?.() ?? null }
      }
    })
  }

  const form = options.form
  if (form) {
    if (form.openAdd) {
      tools.push({
        name: `${prefix}_add_open`,
        requiredPermission: form.addPermission,
        description: `打开${options.pageName || '当前页面'}新增表单`,
        inputSchema: objectSchema(),
        handler: async () => {
          await form.openAdd()
          return { opened: true, mode: 'add', form: form.snapshot?.() || {} }
        }
      })
    }

    if (form.openEdit) {
      const recordIdKey = form.recordIdKey || 'recordId'
      tools.push({
        name: `${prefix}_edit_open`,
        requiredPermission: form.editPermission,
        description: `打开${options.pageName || '当前页面'}指定记录的编辑表单`,
        inputSchema: objectSchema({
          [recordIdKey]: { type: 'integer', description: form.recordIdLabel || '记录ID' }
        }, [recordIdKey]),
        handler: async args => {
          const recordId = args[recordIdKey]
          const data = await form.openEdit(recordId)
          return { opened: true, mode: 'edit', recordId, data: data || form.snapshot?.() || {} }
        }
      })
    }

    if (form.setFields) {
      const fieldSchema = Object.fromEntries(formFields.filter(item => item.editable).map(field => [field.key, {
        type: field.type,
        description: field.description || field.label
      }]))
      if (form.openAdd) {
        tools.push({
          name: `${prefix}_add_set_fields`,
          requiredPermission: form.addPermission,
          description: `填写当前已打开的${options.pageName || '页面'}新增表单字段，但不保存`,
          inputSchema: objectSchema(fieldSchema),
          handler: args => form.setFields(args || {}, 'add')
        })
      }
      if (form.openEdit) {
        tools.push({
          name: `${prefix}_edit_set_fields`,
          requiredPermission: form.editPermission,
          description: `修改当前已打开的${options.pageName || '页面'}编辑表单字段，但不保存`,
          inputSchema: objectSchema(fieldSchema),
          handler: args => form.setFields(args || {}, 'edit')
        })
      }
    }

    if (form.submit) {
      if (form.openAdd) {
        tools.push({
          name: `${prefix}_add_submit`,
          requiredPermission: form.addPermission,
          description: `提交当前${options.pageName || '页面'}新增表单并真实写入系统`,
          inputSchema: objectSchema(),
          handler: () => form.submit('add')
        })
      }
      if (form.openEdit) {
        tools.push({
          name: `${prefix}_edit_submit`,
          requiredPermission: form.editPermission,
          description: `提交当前${options.pageName || '页面'}编辑表单并真实写入系统`,
          inputSchema: objectSchema(),
          handler: () => form.submit('edit')
        })
      }
    }
  }

  for (const action of options.actions || []) {
    tools.push({
      name: `${prefix}_${action.suffix}`,
      requiredPermission: action.permission,
      description: action.description || `执行${options.pageName || '当前页面'}动作：${action.label || action.suffix}`,
      inputSchema: action.inputSchema || objectSchema(),
      handler: args => action.handler(args || {})
    })
  }

  function getContext() {
    const base = options.getContext?.() || {}
    return {
      pageName: options.pageName,
      capabilityProtocol: 'ruoyi-semantic-page-v1',
      queryFields,
      formFields,
      actions: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        requiredPermission: tool.requiredPermission || null
      })),
      total: options.getTotal?.() ?? base.total ?? null,
      rows: options.getRows?.() ?? base.rows ?? [],
      selectedIds: options.getSelectedIds?.() ?? base.selectedIds ?? [],
      ...base
    }
  }

  return { tools, getContext }
}
