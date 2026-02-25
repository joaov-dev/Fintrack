/**
 * Translates API/network errors into user-friendly Portuguese messages.
 *
 * Usage:
 *   import { getApiErrorMessage } from '@/lib/apiError'
 *
 *   catch (err) {
 *     toast({ title: getApiErrorMessage(err, 'Erro ao salvar'), variant: 'destructive' })
 *   }
 */

interface AxiosLikeError {
  response?: {
    status: number
    data?: { error?: string; message?: string }
  }
  request?: unknown
  message?: string
}

function isAxiosError(err: unknown): err is AxiosLikeError {
  return (
    typeof err === 'object' &&
    err !== null &&
    ('response' in err || 'request' in err)
  )
}

/** HTTP status → default user-facing message */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Dados inválidos. Verifique as informações e tente novamente.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Sem permissão para realizar esta ação.',
  404: 'Recurso não encontrado.',
  409: 'Conflito de dados. O item já existe ou está em uso.',
  413: 'Arquivo muito grande. Reduza o tamanho e tente novamente.',
  422: 'Dados inválidos. Verifique os campos e tente novamente.',
  429: 'Muitas tentativas seguidas. Aguarde um momento antes de tentar novamente.',
  500: 'Erro interno no servidor. Tente novamente mais tarde.',
  502: 'Servidor temporariamente indisponível. Tente novamente em breve.',
  503: 'Serviço temporariamente indisponível. Tente novamente em breve.',
}

/**
 * Returns a user-friendly Portuguese error message.
 *
 * Priority:
 *  1. Network error (no response) → connectivity message
 *  2. HTTP 401 / 413 → always use our standard message (security + clarity)
 *  3. Backend-provided `error` or `message` field in the response body
 *  4. Status-code default message
 *  5. `fallback` parameter
 */
export function getApiErrorMessage(err: unknown, fallback = 'Ocorreu um erro inesperado. Tente novamente.'): string {
  if (!isAxiosError(err)) {
    // Plain JS error — return its message or the fallback
    if (err instanceof Error) return err.message || fallback
    return fallback
  }

  // Network / timeout — no response received
  if (!err.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'
  }

  const { status, data } = err.response

  // Always use our message for these statuses (security / UX)
  if (status === 401) return STATUS_MESSAGES[401]
  if (status === 413) return STATUS_MESSAGES[413]

  // Use the message returned by the backend if available
  const serverMsg = data?.error || data?.message
  if (serverMsg) return serverMsg

  // Fall back to status-based message or provided fallback
  return STATUS_MESSAGES[status] ?? fallback
}
