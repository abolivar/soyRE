import { BusinessDocumentWorkspace } from '../../../../../components/business-document-workspace';

export default async function BusinessDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const { businessId } = await params;
  const { organizationId } = await searchParams;
  return (
    <BusinessDocumentWorkspace
      businessId={businessId}
      preferredOrganizationId={organizationId}
    />
  );
}
