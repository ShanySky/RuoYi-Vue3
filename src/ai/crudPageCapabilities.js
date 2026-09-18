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
    validationRules: field.validationRules || field.rules || undefined,
    itemType: field.itemType || undefined,
    inputSchema: field.inputSchema || undefined,
    addOnly: !!field.addOnly,
    editOnly: !!field.editOnly,
    description: field.description || undefined
  }))
}

function resolveFieldValue(value) {
  try {
    return typeof value === 'function' ? value() : value
  } catch {
    return undefined
  }
}

function serializeValidationRules(rules) {
  const value = resolveFieldValue(rules)
  if (!Array.isArray(value)) return undefined
  return value.map(rule => {
    if (!rule || typeof rule !== 'object') return rule
    const copy = {}
    for (const key of ['required', 'type', 'min', 'max', 'len', 'message', 'trigger']) {
      if (rule[key] !== undefined) copy[key] = rule[key]
    }
    if (rule.pattern instanceof RegExp) copy.pattern = rule.pattern.source
    else if (rule.pattern != null) copy.pattern = String(rule.pattern)
    return copy
  })
}

function resolvedOptions(field) {
  const value = resolveFieldValue(field.options)
  return Array.isArray(value) ? value : undefined
}

function fieldSnapshot(field) {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    editable: field.editable,
    options: resolvedOptions(field),
    validationRules: serializeValidationRules(field.validationRules),
    itemType: field.itemType,
    addOnly: field.addOnly,
    editOnly: field.editOnly,
    description: field.description
  }
}

function fieldInputSchema(field) {
  const configured = resolveFieldValue(field.inputSchema)
  const schema = configured ? { ...configured } : { type: field.type }
  if (!schema.description) schema.description = field.description || field.label
  const options = resolvedOptions(field)
  const optionValues = Array.isArray(options)
    ? options
      .map(option => option && typeof option === 'object' ? option.value : option)
      .filter(value => ['string', 'number', 'boolean'].includes(typeof value))
    : []
  if (schema.type === 'array') {
    if (!schema.items) schema.items = { type: field.itemType || 'string' }
    if (optionValues.length && !schema.items.enum) schema.items.enum = optionValues
  } else if (!schema.enum && optionValues.length) {
    schema.enum = optionValues
  }
  const rules = serializeValidationRules(field.validationRules) || []
  for (const rule of rules) {
    if (schema.type === 'string' && rule?.min != null && schema.minLength == null) schema.minLength = rule.min
    if (schema.type === 'string' && rule?.max != null && schema.maxLength == null) schema.maxLength = rule.max
    if (schema.type === 'string' && rule?.pattern && schema.pattern == null) schema.pattern = rule.pattern
    if (schema.type === 'string' && rule?.type === 'email' && schema.format == null) schema.format = 'email'
  }
  return schema
}

function pickDeclaredArgs(args, fields) {
  const allowed = new Set(fields.map(field => field.key))
  return Object.fromEntries(Object.entries(args || {}).filter(([key]) => allowed.has(key)))
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
      inputSchema: () => objectSchema(
        Object.fromEntries(queryFields.map(field => [field.key, fieldInputSchema(field)]))
      ),
      handler: async args => {
        const safeArgs = pickDeclaredArgs(args, queryFields)
        await options.query.apply?.(safeArgs)
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
      inputSchema: () => objectSchema(),
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
        inputSchema: () => objectSchema(),
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
        inputSchema: () => objectSchema({
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
      const editableFields = formFields.filter(item => item.editable)
      const addFields = editableFields.filter(item => !item.editOnly)
      const editFields = editableFields.filter(item => !item.addOnly)
      if (form.openAdd) {
        tools.push({
          name: `${prefix}_add_set_fields`,
          requiredPermission: form.addPermission,
          description: `填写当前已打开的${options.pageName || '页面'}新增表单字段，但不保存`,
          inputSchema: () => objectSchema(
            Object.fromEntries(addFields.map(field => [field.key, fieldInputSchema(field)]))
          ),
          handler: args => form.setFields(pickDeclaredArgs(args, addFields), 'add')
        })
      }
      if (form.openEdit) {
        tools.push({
          name: `${prefix}_edit_set_fields`,
          requiredPermission: form.editPermission,
          description: `修改当前已打开的${options.pageName || '页面'}编辑表单字段，但不保存`,
          inputSchema: () => objectSchema(
            Object.fromEntries(editFields.map(field => [field.key, fieldInputSchema(field)]))
          ),
          handler: args => form.setFields(pickDeclaredArgs(args, editFields), 'edit')
        })
      }
    }

    if (form.submit) {
      if (form.openAdd) {
        tools.push({
          name: `${prefix}_add_submit`,
          requiredPermission: form.addPermission,
          description: `提交当前${options.pageName || '页面'}新增表单并真实写入系统`,
          inputSchema: () => objectSchema(),
          handler: () => form.submit('add')
        })
      }
      if (form.openEdit) {
        tools.push({
          name: `${prefix}_edit_submit`,
          requiredPermission: form.editPermission,
          description: `提交当前${options.pageName || '页面'}编辑表单并真实写入系统`,
          inputSchema: () => objectSchema(),
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
      inputSchema: typeof action.inputSchema === 'function'
        ? action.inputSchema
        : () => (action.inputSchema || objectSchema()),
      handler: args => action.handler(args || {})
    })
  }

  function getContext() {
    const base = options.getContext?.() || {}
    return {
      pageName: options.pageName,
      capabilityProtocol: 'ruoyi-semantic-page-v1',
      queryFields: queryFields.map(fieldSnapshot),
      formFields: formFields.map(fieldSnapshot),
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
