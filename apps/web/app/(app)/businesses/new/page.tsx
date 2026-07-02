import { Suspense } from 'react';
import { BusinessWizard } from '../../../../components/business-wizard';

export default function NewBusinessPage() {
  return (
    <Suspense
      fallback={
        <div className="state-panel">
          <h2>Cargando flujo</h2>
          <p>Preparando el borrador del negocio.</p>
        </div>
      }
    >
      <BusinessWizard />
    </Suspense>
  );
}
