import { SupplierItem, CarrierItem } from '../../types/masterRate';
import { 
  fetchSuppliers, 
  saveSupplier as repoSaveSupplier, 
  deleteSupplier as repoDeleteSupplier,
  fetchCarriers, 
  saveCarrier as repoSaveCarrier, 
  deleteCarrier as repoDeleteCarrier 
} from '../repository/supplierRepository';

/**
 * Load all Suppliers (100% Cloud-First via Firestore)
 */
export async function loadSuppliers(): Promise<SupplierItem[]> {
  return fetchSuppliers();
}

/**
 * Save single Supplier to Firestore
 */
export async function saveSupplier(supplier: SupplierItem): Promise<void> {
  await repoSaveSupplier(supplier);
}

/**
 * Delete Supplier from Firestore
 */
export async function removeSupplier(id: string): Promise<void> {
  await repoDeleteSupplier(id);
}

/**
 * Load all Carriers (100% Cloud-First via Firestore)
 */
export async function loadCarriers(): Promise<CarrierItem[]> {
  return fetchCarriers();
}

/**
 * Save single Carrier to Firestore
 */
export async function saveCarrier(carrier: CarrierItem): Promise<void> {
  await repoSaveCarrier(carrier);
}

/**
 * Delete Carrier from Firestore
 */
export async function removeCarrier(id: string): Promise<void> {
  await repoDeleteCarrier(id);
}

