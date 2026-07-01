import { PropertyCard } from '@soyre/ui';
import { Bath, BedDouble, Ruler, Sparkles } from 'lucide-react';

export function Venta() {
  return (
    <div style={{ maxWidth: 340 }}>
      <PropertyCard
        operation="sale"
        operationLabel="Venta"
        title="PH Costa Norte 1402"
        location="Costa del Este, Ciudad de Panamá"
        price={{ amount: 420000, rangeMin: 405000, rangeMax: 438000 }}
        insight="Precio 4% bajo el comparable de la torre."
        chips={[
          { label: '3 rec.', icon: BedDouble },
          { label: '2 baños', icon: Bath },
          { label: '142 m²', icon: Ruler },
        ]}
        matchBadge={{ label: '92% match', icon: Sparkles }}
      />
    </div>
  );
}

export function Alquiler() {
  return (
    <div style={{ maxWidth: 340 }}>
      <PropertyCard
        operation="rent"
        operationLabel="Alquiler"
        title="Local Vía Brasil"
        location="Bella Vista, Ciudad de Panamá"
        price={{ amount: 6800 }}
        priceFormatter={(amount) =>
          `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)} / mes`
        }
        insight="Disponible para visita técnica esta semana."
        chips={[{ label: '180 m²', icon: Ruler }, { label: 'Esquina' }]}
        matchBadge={{ label: 'Verificado', tone: 'success' }}
      />
    </div>
  );
}

export function Destacada() {
  return (
    <div style={{ maxWidth: 340 }}>
      <PropertyCard
        operation="featured"
        operationLabel="Destacada"
        title="Lote Altos del Lago"
        location="Panamá Oeste"
        price={{ amount: 310000, rangeMin: 290000, rangeMax: 330000 }}
        insight="Oportunidad de desarrollo con plano aprobado."
        chips={[{ label: '1,200 m²', icon: Ruler }, { label: 'Uso mixto' }]}
        matchBadge={{ label: 'Exclusiva', tone: 'featured' }}
      />
    </div>
  );
}
