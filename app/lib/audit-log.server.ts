export interface AuditEvent {
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export function logAuditEvent(event: AuditEvent): void {
  const entry = {
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    entityName: event.entityName,
    timestamp: event.timestamp.toISOString(),
    ...(event.metadata ? { metadata: event.metadata } : {}),
  };

  console.info(`[AUDIT] ${JSON.stringify(entry)}`);
}
