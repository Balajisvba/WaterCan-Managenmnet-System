export interface Customer {
  id: string;
  name: string;
  mobile: string;
  alternateMobile: string;
  address: string;
  area: string;
  depositAmount: number;
  /**
   * The can balance that existed before this application's delivery history.
   * It is persisted separately so the derived outstanding balance is never
   * written back as a new opening balance.
   */
  openingOutstandingCans?: number;
  outstandingCan: number;
  totalDelivered: number;
  totalReturned: number;
  pendingAmount?: number;
  balanceDue?: number;
  advanceAmount?: number;
  status: 'Active' | 'Inactive' | 'Pending';
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  age: number;
  mobile: string;
  address: string;
  joiningDate: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  cashCollected?: number;
}

export interface DriverCashSettlement {
  id: string;
  driverId: string;
  driverName: string;
  settlementDate: string;
  amount: number;
}

export type DeliveryStatus = 'Pending' | 'Delivered' | 'Cancelled';

export interface Delivery {
  id: string;
  customerId: string;
  customerName: string;
  filledCans: number;
  emptyCans: number;
  ratePerCan: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  driverName: string;
  remarks: string;
  deliveryDate: string;
  status: DeliveryStatus;
  orderedCans?: number;
  orderDate?: string;
  driverId?: string;
  paymentMode?: 'Cash' | 'GPay' | 'Account';
  cashCollected?: boolean;
  cashSettled?: boolean;
}

export type InventoryTransactionType = 'Opening Stock' | 'New Load' | 'Delivery' | 'Return' | 'Adjustment';

export interface InventoryTransaction {
  id: string;
  transactionDate: string;
  type: InventoryTransactionType;
  description: string;
  stockIn: number;
  stockOut: number;
  previousStock: number;
  balance: number;
  referenceId?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  remarks: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  remarks: string;
}

export interface MissingCan {
  id: string;
  customerId: string;
  customerName: string;
  missingQuantity: number;
  recoveredQuantity: number;
  lostQuantity: number;
  costPerCan: number;
  lossAmount: number;
  status: 'Open' | 'Recovered' | 'Closed';
  createdAt: string;
}

export interface Settings {
  id: string;
  companyName: string;
  companyLogo: string;
  canPrice: number;
  depositAmount: number;
  theme: 'light' | 'dark';
  darkMode: boolean;
  backupDate: string;
  lowStockThreshold: number;
}

export interface DashboardSummary {
  todayRevenue: number;
  todayDeliveries: number;
  todayExpenses: number;
  todayProfit: number;
  outstandingCans: number;
  missingCans: number;
  activeCustomers: number;
  monthlyRevenue: number;
  revenueTrend: Array<{ label: string; value: number }>;
  expenseTrend: Array<{ label: string; value: number }>;
  profitTrend: Array<{ label: string; value: number }>;
  missingTrend: Array<{ label: string; value: number }>;
  recentDeliveries: Delivery[];
}

export interface ReportSummary {
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  profit: number;
  expenses: number;
  customerOutstanding: number;
  missingCanLoss: number;
}
