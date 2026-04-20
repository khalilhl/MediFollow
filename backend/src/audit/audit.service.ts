import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

export interface AuditLogInput {
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  category?: string;
  severity?: 'info' | 'warning' | 'critical';
  suspicious?: boolean;
  statusCode?: number;
  method?: string;
  path?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>) {}

  /** Supprime les journaux issus de l’ancien jeu de démo (emails @demo.local, ids demo*). */
  async onModuleInit() {
    try {
      const r = await this.auditLogModel
        .deleteMany({
          $or: [
            { actorEmail: { $regex: /@demo\.local$/i } },
            { actorId: { $regex: /^demo\d+$/i } },
          ],
        })
        .exec();
      if (r.deletedCount > 0) {
        this.logger.log(`Audit : ${r.deletedCount} entrée(s) de démo (legacy) supprimée(s).`);
      }
    } catch (e) {
      this.logger.warn(`Audit cleanup legacy : ${String(e)}`);
    }
  }

  async log(entry: AuditLogInput): Promise<void> {
    try {
      await this.auditLogModel.create({
        ...entry,
        category: entry.category || 'system',
        severity: entry.severity || 'info',
        suspicious: entry.suspicious ?? false,
      });
    } catch (e) {
      this.logger.warn(`Audit log insert failed: ${String(e)}`);
    }
  }

  async getDashboard() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last14days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    /** Stats centrées sur l’activité métier : hors auditeur et super admin. */
    const notAuditorNorSuperAdmin = { actorRole: { $nin: ['auditor', 'superadmin'] } };

    const [
      logsToday,
      activeUsersAgg,
      totalActions,
      suspiciousCount,
      activitySeries,
      distribution,
      recent,
    ] = await Promise.all([
      this.auditLogModel
        .countDocuments({ createdAt: { $gte: startOfToday }, ...notAuditorNorSuperAdmin })
        .exec(),
      this.auditLogModel.distinct('actorId', {
        createdAt: { $gte: last24h },
        actorId: { $exists: true, $nin: [null, ''] },
        ...notAuditorNorSuperAdmin,
      }),
      this.auditLogModel
        .countDocuments({ createdAt: { $gte: last30days }, ...notAuditorNorSuperAdmin })
        .exec(),
      this.auditLogModel
        .countDocuments({
          suspicious: true,
          createdAt: { $gte: last30days },
          ...notAuditorNorSuperAdmin,
        })
        .exec(),
      this.auditLogModel
        .aggregate([
          { $match: { createdAt: { $gte: last14days }, ...notAuditorNorSuperAdmin } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec(),
      this.auditLogModel
        .aggregate([
          { $match: { createdAt: { $gte: last14days }, ...notAuditorNorSuperAdmin } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .exec(),
      this.auditLogModel
        .find({ createdAt: { $gte: last14days }, ...notAuditorNorSuperAdmin })
        .sort({ createdAt: -1 })
        .limit(25)
        .select(
          'actorEmail actorRole action category severity suspicious statusCode method path createdAt',
        )
        .lean()
        .exec(),
    ]);

    return {
      kpis: {
        logsToday,
        activeUsers: activeUsersAgg.length,
        totalActions,
        suspiciousActions: suspiciousCount,
      },
      charts: {
        activityOverTime: activitySeries.map((r: { _id: string; count: number }) => ({
          date: r._id,
          count: r.count,
        })),
        actionsDistribution: distribution.map((r: { _id: string; count: number }) => ({
          category: r._id || 'other',
          count: r.count,
        })),
      },
      recentLogs: recent.map((r: Record<string, unknown>) => ({
        id: String(r._id),
        actorEmail: r.actorEmail,
        actorRole: r.actorRole,
        action: r.action,
        category: r.category,
        severity: r.severity,
        suspicious: r.suspicious,
        statusCode: r.statusCode,
        method: r.method,
        path: r.path,
        createdAt: r.createdAt,
      })),
    };
  }
}
