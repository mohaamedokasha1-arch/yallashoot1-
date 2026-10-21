import type { DataError, DataErrorKind } from "./types";

export class ProviderError extends Error {
  readonly kind: DataErrorKind;
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(kind: DataErrorKind, message: string, options?: { status?: number | null; cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "ProviderError";
    this.kind = kind;
    this.status = options?.status ?? null;
    this.retryable = kind === "server" || kind === "network" || kind === "timeout";
  }
}

/** Visitor-facing Arabic explanation for each error kind (no internals leaked). */
export const ERROR_MESSAGES_AR: Record<DataErrorKind, string> = {
  not_configured:
    "لم يتم ربط مصدر بيانات المباريات بعد. يحتاج مدير الموقع إلى إضافة مفتاح مزود البيانات حتى تظهر المباريات الحقيقية.",
  auth: "تعذّر التحقق من حساب مزود البيانات. تم إبلاغ الإدارة عبر لوحة المتابعة.",
  plan_restricted: "هذه البيانات غير متاحة ضمن الباقة الحالية لمزود البيانات.",
  rate_limited: "تم بلوغ حد الطلبات المؤقت لدى مزود البيانات. سيتم التحديث تلقائيًا بعد قليل.",
  quota_exceeded: "تم استهلاك الحصة اليومية لطلبات مزود البيانات. تتجدد الحصة يوميًا عند منتصف الليل بتوقيت جرينتش.",
  server: "مزود البيانات يواجه مشكلة مؤقتة. يرجى المحاولة لاحقًا.",
  network: "تعذّر الاتصال بمزود البيانات حاليًا.",
  timeout: "استغرق مزود البيانات وقتًا أطول من المسموح للرد.",
  invalid_response: "وصلت استجابة غير متوقعة من مزود البيانات وتم تجاهلها حفاظًا على دقة المعلومات.",
  not_found: "لم يتم العثور على البيانات المطلوبة لدى مزود البيانات.",
  budget_guard: "تم تأجيل التحديث مؤقتًا للحفاظ على حصة الطلبات اليومية للمباريات الجارية.",
  circuit_open: "تم إيقاف الطلبات مؤقتًا بعد أعطال متتالية لدى مزود البيانات، وستُستأنف تلقائيًا.",
  suspicious_empty: "وصلت استجابة فارغة بشكل غير متوقع، لذلك تم الإبقاء على آخر نسخة صحيحة.",
  unknown: "حدث خطأ غير متوقع أثناء جلب البيانات.",
};

export function toDataError(err: unknown): DataError {
  if (err instanceof ProviderError) {
    return { kind: err.kind, message: ERROR_MESSAGES_AR[err.kind] };
  }
  return { kind: "unknown", message: ERROR_MESSAGES_AR.unknown };
}

export function dataError(kind: DataErrorKind): DataError {
  return { kind, message: ERROR_MESSAGES_AR[kind] };
}
