export type IssueType = string // made dynamic to support config-driven keys

export function getIssues(row: Record<string, any>, rules: any[] = []): IssueType[] {
  const issues: IssueType[] = []

  for (const rule of rules) {
    const { key, column, type, value, pattern } = rule
    const field = row[column]

    switch (type) {
      case 'is_null':
        if (field === null || field === undefined || field === '') issues.push(key)
        break
      case 'is_not_null':
        if (field !== null && field !== undefined && field !== '') continue
        issues.push(key)
        break
      case 'regex':
        if (typeof field === 'string' && !new RegExp(pattern).test(field)) issues.push(key)
        break
      case 'equals':
        if (field !== value) issues.push(key)
        break
      case 'not_equals':
        if (field === value) issues.push(key)
        break
      case 'gt':
        if (field <= value) issues.push(key)
        break
      case 'lt':
        if (field >= value) issues.push(key)
        break
      case 'gte':
        if (field < value) issues.push(key)
        break
      case 'lte':
        if (field > value) issues.push(key)
        break
      case 'in':
        if (!Array.isArray(value) || !value.includes(field)) issues.push(key)
        break
      case 'not_in':
        if (Array.isArray(value) && value.includes(field)) issues.push(key)
        break
      case 'contains':
        if (typeof field === 'string' && !field.includes(value)) issues.push(key)
        break
      case 'not_contains':
        if (typeof field === 'string' && field.includes(value)) issues.push(key)
        break
    }
  }

  return issues
}
