import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Compact prompt to minimize token usage on free tier
const SYSTEM_PROMPT = `You are FintraBooks, an accounting assistant for Indian users.
Always respond with ONLY valid JSON — no markdown, no extra text.

Response format:
{"intent":"record_transaction"|"query_balance"|"query_report"|"query_customer_statement"|"query_outstanding"|"manage_invoice"|"payment_received"|"update_transaction"|"general_question"|"unknown","transaction":{"amount":number,"type":"income"|"expense","category":"string","description":"string","date":"YYYY-MM-DD","customer_name":"string|null","payment_status":"paid"|"unpaid"|"partial","paid_amount":"number|null"}|null,"customer_name":"string|null","invoice_action":{"action":"get"|"edit"|"delete","invoice_number":"string|null","customer_name":"string|null","updates":{"amount":"number|null","status":"paid"|"unpaid"|"partial"|null,"due_date":"YYYY-MM-DD|null"}|null}|null,"reply":"string"}

Rules:
- If a "Recent Conversation Context" section is provided, use it to resolve follow-up references like "same customer", "mark that paid", "change it", or "show that invoice". Prefer the current user message when there is a conflict.
- record_transaction: user records spending/receiving money or NEW business transactions. If you see a --- Document Text --- block, you MUST extract the transaction details (amount, date, description, party) directly from the text provided in that block. Do NOT ask the user for details if they are present in the document text.
- payment_received: user says they RECEIVED PAYMENT from a customer for an EXISTING sale/invoice. Keywords: "received from", "payment from", "collected from", "got payment from". Record as income transaction and include customer_name. This is NOT a new sale — it is money coming in against an existing outstanding balance.
- update_transaction: user wants to UPDATE an existing transaction — change amount, mark status, process a RETURN/refund. Keywords: "update sale", "change amount", "return from", "refund to", "credit note", "modify transaction". Include the new amount and/or payment_status in the transaction object.
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
"received 5000 from Ravi" → {"intent":"payment_received","transaction":{"amount":5000,"type":"income","category":"Sales","description":"Payment received from Ravi","date":"${new Date().toISOString().split('T')[0]}","customer_name":"Ravi","payment_status":"paid","paid_amount":null},"customer_name":"Ravi","invoice_action":null,"reply":"Recording payment of ₹5,000 from Ravi... 💰"}
"payment from Kumar 8000" → {"intent":"payment_received","transaction":{"amount":8000,"type":"income","category":"Sales","description":"Payment received from Kumar","date":"${new Date().toISOString().split('T')[0]}","customer_name":"Kumar","payment_status":"paid","paid_amount":null},"customer_name":"Kumar","invoice_action":null,"reply":"Recording ₹8,000 payment from Kumar... 💰"}
"update sale to Ravi amount 8000" → {"intent":"update_transaction","transaction":{"amount":8000,"type":"income","category":"Sales","description":"Updated sale to Ravi","date":"${new Date().toISOString().split('T')[0]}","customer_name":"Ravi","payment_status":"paid","paid_amount":null},"customer_name":"Ravi","invoice_action":null,"reply":"Updating Ravi's sale to ₹8,000... 📝"}
"return from Ravi 2000" → {"intent":"update_transaction","transaction":{"amount":2000,"type":"expense","category":"Sales","description":"Sales return from Ravi","date":"${new Date().toISOString().split('T')[0]}","customer_name":"Ravi","payment_status":"paid","paid_amount":null},"customer_name":"Ravi","invoice_action":null,"reply":"Processing ₹2,000 return from Ravi... 🔄"}
"show statement for Ravi" → {"intent":"query_customer_statement","transaction":null,"customer_name":"Ravi","invoice_action":null,"reply":"Fetching statement for Ravi..."}
"outstanding for Kumar" → {"intent":"query_outstanding","transaction":null,"customer_name":"Kumar","invoice_action":null,"reply":"Checking outstanding for Kumar..."}
"show invoice INV-001" → {"intent":"manage_invoice","transaction":null,"customer_name":null,"invoice_action":{"action":"get","invoice_number":"INV-001","customer_name":null,"updates":null},"reply":"Fetching invoice INV-001..."}
"change amount of INV-002 to 6000" → {"intent":"manage_invoice","transaction":null,"customer_name":null,"invoice_action":{"action":"edit","invoice_number":"INV-002","customer_name":null,"updates":{"amount":6000,"status":null,"due_date":null}},"reply":"Updating invoice INV-002..."}
"mark INV-003 as paid" → {"intent":"manage_invoice","transaction":null,"customer_name":null,"invoice_action":{"action":"edit","invoice_number":"INV-003","customer_name":null,"updates":{"amount":null,"status":"paid","due_date":null}},"reply":"Updating invoice INV-003 status to paid..."}
"delete invoice INV-001" → {"intent":"manage_invoice","transaction":null,"customer_name":null,"invoice_action":{"action":"delete","invoice_number":"INV-001","customer_name":null,"updates":null},"reply":"Deleting invoice INV-001..."}`

export interface GeminiResponse {
  intent: 'record_transaction' | 'query_balance' | 'query_report' | 'query_customer_statement' | 'query_outstanding' | 'manage_invoice' | 'payment_received' | 'update_transaction' | 'general_question' | 'unknown'
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

type GeminiContentPart =
  | { text: string }
  | {
      inlineData: {
        mimeType: string
        data: string
      }
    }

export async function parseUserMessage(
  userMessage: string,
  conversationContext?: string,
  imageBase64?: string,
  mimeType?: string,
): Promise<GeminiResponse> {
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

  // Build content parts — text + optional image for multimodal processing
  const parts: GeminiContentPart[] = []

  if (imageBase64 && mimeType) {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    })
  }

  const promptSections = []

  if (conversationContext?.trim()) {
    promptSections.push(`Recent Conversation Context:\n${conversationContext.trim()}`)
  }

  promptSections.push(`Current User Message:\n${userMessage}`)

  parts.push({ text: promptSections.join('\n\n') })

  // Retry with exponential backoff for rate-limit (429) errors
  const MAX_RETRIES = 2
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(parts)
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

      // Only retry on rate-limit or 503 high demand errors
      if ((errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('quota') || errMsg.includes('503') || errMsg.includes('high demand')) && attempt < MAX_RETRIES) {
        const waitMs = Math.min(1000 * Math.pow(2, attempt + 1), 10000) // 2s, 4s
        console.warn(`Gemini rate-limited/overloaded (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${waitMs}ms...`)
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
