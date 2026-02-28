type QueryResult = {
  data?: unknown
  error?: unknown
  count?: number | null
}

type Operation =
  | 'select'
  | 'selectSingle'
  | 'insert'
  | 'insertSingle'
  | 'update'
  | 'upsert'
  | 'delete'

type FilterCall =
  | { type: 'eq'; column: string; value: unknown }
  | { type: 'or'; expression: string }
  | { type: 'like'; column: string; value: string }
  | { type: 'in'; column: string; values: unknown[] }
  | { type: 'order'; column: string; options?: unknown }
  | { type: 'limit'; value: number }

export type QueryContext = {
  table: string
  operation: Operation
  payload?: unknown
  selectArgs?: unknown[]
  upsertOptions?: unknown
  filters: FilterCall[]
}

type ScriptEntry =
  | QueryResult
  | ((ctx: QueryContext) => QueryResult | Promise<QueryResult>)

type TableScripts = Partial<Record<Operation, ScriptEntry[]>>
type ScriptMap = Record<string, TableScripts>

type StorageSignedUrlResult = { data: { signedUrl: string } | null; error: unknown }

class MockQueryBuilder {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: unknown
  private upsertOptions: unknown
  private selectArgs: unknown[] | undefined
  private readonly filters: FilterCall[] = []

  constructor(
    private readonly client: SupabaseQueryMock,
    private readonly table: string
  ) {}

  select(...args: unknown[]) {
    this.selectArgs = args
    if (this.action !== 'insert') {
      this.action = 'select'
    }
    return this
  }

  insert(payload: unknown) {
    this.action = 'insert'
    this.payload = payload
    return this
  }

  update(payload: unknown) {
    this.action = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  upsert(payload: unknown, options?: unknown) {
    this.payload = payload
    this.upsertOptions = options
    return this.execute('upsert')
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  or(expression: string) {
    this.filters.push({ type: 'or', expression })
    return this
  }

  like(column: string, value: string) {
    this.filters.push({ type: 'like', column, value })
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ type: 'in', column, values })
    return this
  }

  order(column: string, options?: unknown) {
    this.filters.push({ type: 'order', column, options })
    return this
  }

  limit(value: number) {
    this.filters.push({ type: 'limit', value })
    return this
  }

  single() {
    return this.execute(this.action === 'insert' ? 'insertSingle' : 'selectSingle')
  }

  maybeSingle() {
    return this.single()
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    let operation: Operation = 'select'
    if (this.action === 'insert') operation = 'insert'
    if (this.action === 'update') operation = 'update'
    if (this.action === 'delete') operation = 'delete'
    return this.execute(operation).then(onfulfilled, onrejected)
  }

  private async execute(operation: Operation): Promise<QueryResult> {
    const ctx: QueryContext = {
      table: this.table,
      operation,
      payload: this.payload,
      selectArgs: this.selectArgs,
      upsertOptions: this.upsertOptions,
      filters: [...this.filters],
    }

    return this.client.resolve(ctx)
  }
}

export class SupabaseQueryMock {
  public calls: QueryContext[] = []
  private readonly scripts: ScriptMap
  private signedUrlFactory: (bucket: string, path: string) => StorageSignedUrlResult =
    () => ({ data: { signedUrl: 'https://signed.example/file' }, error: null })

  constructor(scripts: ScriptMap = {}) {
    this.scripts = scripts
  }

  from(table: string) {
    return new MockQueryBuilder(this, table)
  }

  storage = {
    from: (bucket: string) => ({
      createSignedUrl: async (path: string) => this.signedUrlFactory(bucket, path),
    }),
  }

  setSignedUrlFactory(factory: (bucket: string, path: string) => StorageSignedUrlResult) {
    this.signedUrlFactory = factory
  }

  async resolve(ctx: QueryContext): Promise<QueryResult> {
    this.calls.push(ctx)

    const tableScripts = this.scripts[ctx.table]
    const opQueue = tableScripts?.[ctx.operation]
    const entry = opQueue?.shift()

    if (!entry) {
      return { data: null, error: null }
    }

    const result = typeof entry === 'function' ? await entry(ctx) : entry
    return {
      data: result.data ?? null,
      error: result.error ?? null,
      count: result.count ?? null,
    }
  }
}
