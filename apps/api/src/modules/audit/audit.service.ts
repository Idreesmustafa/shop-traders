import mongoose from 'mongoose';
import { AuditLogModel } from './auditLogs.model.js';

export type AuditActorRef =
  | { type: 'platform_user'; id: string; email: string }
  | { type: 'shop_user'; id: string; email: string }
  | { type: 'system' };

export type AuditParams = {
  actor: AuditActorRef;
  action: string;
  resourceType: string;
  resourceId?: string | mongoose.Types.ObjectId;
  shopId?: string | mongoose.Types.ObjectId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

const toObjectId = (
  v: string | mongoose.Types.ObjectId | undefined,
): mongoose.Types.ObjectId | undefined => {
  if (v === undefined) return undefined;
  return typeof v === 'string' ? new mongoose.Types.ObjectId(v) : v;
};

export const writeAudit = async (
  params: AuditParams,
  session?: mongoose.ClientSession,
): Promise<void> => {
  const doc: Record<string, unknown> = {
    actorType: params.actor.type,
    action: params.action,
    resourceType: params.resourceType,
  };
  if (params.actor.type !== 'system') {
    doc['actorId'] = new mongoose.Types.ObjectId(params.actor.id);
    doc['actorEmail'] = params.actor.email;
  }
  const resourceId = toObjectId(params.resourceId);
  if (resourceId !== undefined) doc['resourceId'] = resourceId;
  const shopId = toObjectId(params.shopId);
  if (shopId !== undefined) doc['shopId'] = shopId;
  if (params.before !== undefined) doc['before'] = params.before;
  if (params.after !== undefined) doc['after'] = params.after;
  if (params.metadata !== undefined) doc['metadata'] = params.metadata;

  await AuditLogModel.create([doc], session === undefined ? undefined : { session });
};
