
import { Metadata } from 'next';
import { PersonnelPageContent } from './personnel-client-page';

export const metadata: Metadata = {
  title: 'Ekipler | MechQuote',
  description: 'Ekip ve personel yönetimi.',
};

export default function PersonnelPage() {
  return <PersonnelPageContent />;
}