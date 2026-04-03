/**
 * Proposals Server Actions
 *
 * Bu dosya, proposals klasöründeki tüm action'ları export eder
 */

// Export types
export type { ProposalStatus } from './proposals';

// Export functions
export {
  getProposalList,
  getProposalsWithAnalytics,
  getProposal,
  getProposalForPrint,
  createProposal,
  updateProposal,
  deleteProposal,
  updateProposalStatus,
  updateProposalItems,
  updateProposalItemCosts,
  createProposalVersion,
  getProposalVersions,
  getProposalDiff,
  copyProposalToCustomer,
  createProposalVersionFromData
} from './proposals';
