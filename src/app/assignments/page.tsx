import { Metadata } from 'next';
import { AssignmentsPageContent } from './assignments-client-page';
import { getJobAssignments } from '@/actions/job-assignments';
import { getPersonnel } from '@/actions/personnel';
import { getProposalList } from '@/actions/proposals';

export const metadata: Metadata = {
  title: 'İş Atamaları',
  description: 'Atanan işleri ve ödeme durumlarını takip edin.',
};

export default async function AssignmentsPage() {
  const [assignmentsRes, personnelRes, proposalsRes] = await Promise.all([
    getJobAssignments(),
    getPersonnel(),
    getProposalList()
  ]);

  const initialAssignments = assignmentsRes.success ? assignmentsRes.data || [] : [];
  const initialPersonnel = personnelRes.success ? personnelRes.data || [] : [];
  const initialProposals = proposalsRes.success ? proposalsRes.data || [] : [];

  return (
    <AssignmentsPageContent
      initialAssignments={initialAssignments}
      initialPersonnel={initialPersonnel}
      initialProposals={initialProposals}
    />
  );
}
