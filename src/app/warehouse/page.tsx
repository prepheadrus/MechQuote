import { Metadata } from 'next';
import { WarehouseClientPage } from './warehouse-client-page';

export const metadata: Metadata = {
  title: 'Depo ve Stok Yönetimi',
};

export default function WarehousePage() {
  return <WarehouseClientPage />;
}
