import { z } from 'zod';
import { MemberGovernanceMetrics } from '@/domain/member/MemberGovernanceMetrics';
import { Address, zExtended } from '@/domain/primitives';

const MemberGovernanceMetricsSchema = z.object({
  id: z.string(),
  chainId: z.number(),
  pluginAddress: zExtended.hexString(),
  memberAddress: zExtended.hexString(),
  firstActivityTimestamp: z.string(),
  lastActivityTimestamp: z.string(),
});

/**
 * Slice of the `FindMembers` response owned by this mapper: the
 * governance-metrics rows for the plugin. Other top-level lists in the
 * response are ignored.
 */
const ResponseSchema = z.object({
  MemberGovernanceMetrics: z.array(MemberGovernanceMetricsSchema),
});

export type MemberGovernanceMetricsDTO = z.infer<
  typeof MemberGovernanceMetricsSchema
>;

export function mapDTOToDomain(raw: unknown): MemberGovernanceMetrics[] {
  const data = ResponseSchema.parse(raw);

  return data.MemberGovernanceMetrics.map((metrics) =>
    MemberGovernanceMetrics.create({
      memberAddress: Address.fromHexString(metrics.memberAddress),
      firstActivityTimestamp: Number(metrics.firstActivityTimestamp),
      lastActivityTimestamp: Number(metrics.lastActivityTimestamp),
    }),
  );
}
