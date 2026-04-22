import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Compact prompt to minimize token usage on free tier
const SYSTEM_PROMPT = `You are FintraBooks, an accounting assistant for Indian users.
Always respond with ONLY valid JSON — no markdown, no extra text.

Response format:
{"intent":"record_transaction"|"query_balance"|"query_report"|"query_customer_statement"|"query_outstanding"|"manage_invoice"|"general_question"|"unknown","transaction":{"amount":number,"type":"income"|"expense","category":"string","description":"string","date":"YYYY-MM-DD","customer_name":"string|null","payment_status":"paid"|"unpaid"|"partial","paid_amount":"number|null"}|null,"customer_name":"string|null","invoice_action":{"action":"get"|"edit"|"delete","invoice_number":"string|null","customer_name":"string|null","updates":{"amount":"number|null","status":"paid"|"unpaid"|"partial"|null,"due_date":"YYYY-MM-DD|null"}|null}|null,"reply":"string"}

Rules:
- record_transaction: user records spending/receiving money or business transactions
- query_balance: user asks about balance/net worth
- query_report: user asks for summary/report/breakdown
- query_customer_statement: user asks for statement/ledger of a specific customer/party. Extract customer_name.
- query_outstanding: user asks about outstanding/due/pending amount for a customer. Extract customer_name.
- manage_invoice: user wants to view, edit, or delete an existing invoice. Extract action, invoice_number, customer_name, and updates if editing.
- Amount: positive number, strip ₹/Rs
- Type: expense=spending/buying/purchase, income=receiving/earning/sales
- Category: one of [Sales,Purchase,Groceries,Food & Dining,Transport,Salary,Freelance,Shopping,Utilities,Healthcare,Entertainment,Education,Rent,Investment,Transfer,Other]
- Date: today=${new Date().toISOString().split('T')[0]} unless specified
- customer_name: For Sales/Purchase, extract the party/customer name (e.g. "sales to ABC" → customer_name="ABC", "purchase from XYZ" → customer_name="XYZ"). Set null if no party name mentioned.
- payment_status: For Sales/Purchase, extract if the transaction is "paid", "unpaid", or "partial". Default to "paid" if not specified.
- paid_amount: If payment_status is 'partial', extract the amount paid so far. Else null.
- Reply: friendly, short, use emojis

Examples:
"spent ₹500 groceries" → {"intent":"record_transaction","transaction":{"amount":500,"type":"expense","category":"Groceries","description":"Spent on groceries","date":"${new Date().toISOString().split('T')[0]}","customer_name":null,"payment_status":"paid","paid_amount":null},"customer_name":null,"invoice_action":null,"reply":"Got it! ₹500 expense under Groceries recorded. 🛒"}
"sales to Ravi 10000 rs unpaid" → {"intent":"record_transaction","transaction":{"amount":10000,"type":"income","category":"Sales","description":"Sales to Ravi","date":"${new Date().toISOString().split('T')[0]}","customer_name":"Ravi","payment_status":"unpaid","paid_amount":null},"customer_name":"Ravi","invoice_action":null,"reply":"Got it! ₹10,000 unpaid sales to Ravi recorded. 📈"}
"purchase from ABC 5000 rs paid 2000" → {"intent":"record_transaction","transaction":{"amount":5000,"type":"expense","category":"Purchase","description":"Purchase from ABC","date":"${new Date().toISOString().split('T')[0]}","customer_name":"ABC","payment_status":"partial","paid_amount":2000},"customer_name":"ABC","invoice_action":null,"reply":"Got it! ₹5,000 purchase from ABC recorded (₹2,000 paid). 🛒"}
"show statement for Ravi" → {"intent":"query_customer_statement","transaction":null,"customer_name":"Ravi","invoice_action":null,"reply":"Fetching statement for Ravi..."}
"outstanding for Kumar" → {"intent":"query_outstanding","transaction":null,"customer_name":"Kumar","invoice_action":null,"reply":"Checking outstanding for Kumar..."}
"show invoice INV-001" → {"intent":"manage_invoice","transaction":null,"customer_name":null,"invoice_action":{"action":"get","invoice_number":"INV-001","customer_name":null,"updates":null},"reply":"Fetching invoice INV-001..."}
"change amount of INV-002 to 6000" → {"intent":"manage_invoice","transaction":null,"customer_name":null,"invoice_action":{"action":"edit","invoice_number":"INV-002","customer_name":null,"updates":{"amount":6000,"status":null,"due_date":null}},"reply":"Updating invoice INV-002..."}
"mark INV-003 as paid" → {"intent":"manage_invoice","transaction":null,"customer_name":null,"invoice_action":{"action":"edit","invoice_number":"INV-003","customer_name":null,"updates":{"amount":null,"status":"paid","due_date":null}},"reply":"Updating invoice INV-003 status to paid..."}
"delete invoice INV-001" → {"intent":"manage_invoice","transaction":null,"customer_name":null,"invoice_action":{"action":"delete","invoice_number":"INV-001","customer_name":null,"updates":null},"reply":"Deleting invoice INV-001..."}`

export interface GeminiResponse {
  intent: 'record_transaction' | 'query_balance' | 'query_report' | 'query_customer_statement' | 'query_outstanding' | 'manage_invoice' | 'general_question' | 'unknown'
  transaction: {
    amount: number
    type: 'income' | 'expense'
    category: string
    description: string
    date: string
    customer_name?: string | null
    payment_status?: 'paid' | 'unpaid' | 'partial'
    paid_amount?: number | null
  } | null
  customer_name?: string | null
  invoice_action?: {
    action: 'get' | 'edit' | 'delete'
    invoice_number: string | null
    customer_name: string | null
    updates: {
      amount: number | null
      status: 'paid' | 'unpaid' | 'partial' | null
      due_date: string | null
    } | null
  } | null
  reply: string
}

export async function parseUserMessage(userMessage: string): Promise<GeminiResponse> {
  // gemini-2.5-flash = current fast model (replaces deprecated 2.0-flash)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 512,
    },
  })

  // Retry with exponential backoff for rate-limit (429) errors
  const MAX_RETRIES = 2
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(userMessage)
      const text = result.response.text()

      try {
        const parsed = JSON.parse(text) as GeminiResponse
        // Validate required fields
        if (!parsed.intent || !parsed.reply) throw new Error('Invalid response shape')
        return parsed
      } catch {
        return {
          intent: 'unknown',
          transaction: null,
          reply: "Sorry, I didn't understand that. Try: \"I spent ₹200 on lunch\" or \"Show my balance\".",
        }
      }
    } catch (error: unknown) {
      lastError = error
      const errMsg = error instanceof Error ? error.message : String(error)

      // Only retry on rate-limit errors
      if ((errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('quota')) && attempt < MAX_RETRIES) {
        const waitMs = Math.min(1000 * Math.pow(2, attempt + 1), 10000) // 2s, 4s
        console.warn(`Gemini rate-limited (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${waitMs}ms...`)
        await new Promise((resolve) => setTimeout(resolve, waitMs))
        continue
      }

      // Non-retryable error or exhausted retries — rethrow
      throw error
    }
  }

  // Should not reach here, but just in case
  throw lastError
}
