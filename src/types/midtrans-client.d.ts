declare module 'midtrans-client' {
  interface SnapConfig {
    isProduction: boolean
    serverKey: string
    clientKey?: string
  }

  interface TransactionApi {
    status(orderIdOrTransactionId: string): Promise<Record<string, unknown>>
    expire(orderIdOrTransactionId: string): Promise<Record<string, unknown>>
  }

  interface SnapInstance {
    transaction: TransactionApi
    createTransaction(parameter: Record<string, unknown>): Promise<Record<string, unknown>>
    createTransactionRedirectUrl(parameter: Record<string, unknown>): Promise<string>
  }

  const midtransClient: {
    Snap: new (config: SnapConfig) => SnapInstance
  }

  export = midtransClient
}
