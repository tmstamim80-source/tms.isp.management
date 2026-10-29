import { Customer, Reseller, ResellerTransaction, ResellerBalanceRequest, ISPPackage, SearchOperator } from '../types';

/**
 * Strict Multi-Tenant Reseller Data Isolation
 * Enforces that a reseller can ONLY view, search, and manage their own assigned records.
 * Resellers are completely blocked from viewing records of other resellers or main office direct clients.
 */

export function doesCustomerBelongToReseller(
  customer: Customer | null | undefined,
  reseller: { id?: string; code?: string; username?: string; name?: string } | null | undefined
): boolean {
  if (!customer || !reseller) return false;

  const cResId = (customer.resellerId || '').trim().toLowerCase();
  const cResCode = (customer.resellerCode || '').trim().toLowerCase();
  const cResName = (customer.resellerName || '').trim().toLowerCase();

  // If customer has no reseller assignment at all, it belongs to Main Office, never to any reseller
  if (!cResId && !cResCode && !cResName) {
    return false;
  }

  const rId = (reseller.id || '').trim().toLowerCase();
  const rCode = (reseller.code || '').trim().toLowerCase();
  const rUsername = (reseller.username || '').trim().toLowerCase();
  const rName = (reseller.name || '').trim().toLowerCase();

  // 1. Direct ID match
  if (rId && cResId === rId) return true;

  // 2. Code match (e.g. RES-01)
  if (rCode && (cResId === rCode || cResCode === rCode)) return true;

  // 3. Username match
  if (rUsername && (cResId === rUsername || cResCode === rUsername)) return true;

  // 4. Name match (exact or substring)
  if (rName && cResName && (cResName === rName || cResName.includes(rName) || rName.includes(cResName))) return true;

  return false;
}

export function filterCustomersForReseller(
  customers: Customer[],
  reseller: { id?: string; code?: string; username?: string; name?: string } | null | undefined
): Customer[] {
  if (!reseller) return [];
  return customers.filter((c) => doesCustomerBelongToReseller(c, reseller));
}

export function filterTransactionsForReseller(
  transactions: ResellerTransaction[],
  reseller: { id?: string; code?: string; username?: string; name?: string } | null | undefined
): ResellerTransaction[] {
  if (!reseller) return [];
  const rId = (reseller.id || '').trim().toLowerCase();
  const rCode = (reseller.code || '').trim().toLowerCase();
  const rName = (reseller.name || '').trim().toLowerCase();

  return transactions.filter((t) => {
    const tResId = (t.resellerId || '').trim().toLowerCase();
    const tResName = (t.resellerName || '').trim().toLowerCase();
    return (
      (rId && tResId === rId) ||
      (rCode && tResId === rCode) ||
      (rName && tResName === rName)
    );
  });
}

export function filterRequestsForReseller(
  requests: ResellerBalanceRequest[],
  reseller: { id?: string; code?: string; username?: string; name?: string } | null | undefined
): ResellerBalanceRequest[] {
  if (!reseller) return [];
  const rId = (reseller.id || '').trim().toLowerCase();
  const rCode = (reseller.code || '').trim().toLowerCase();
  const rName = (reseller.name || '').trim().toLowerCase();

  return requests.filter((req) => {
    const reqResId = (req.resellerId || '').trim().toLowerCase();
    const reqResName = (req.resellerName || '').trim().toLowerCase();
    return (
      (rId && reqResId === rId) ||
      (rCode && reqResId === rCode) ||
      (rName && reqResName === rName)
    );
  });
}

/**
 * Strict Package Isolation:
 * Checks whether an internet package was created by and belongs to a specific reseller.
 */
export function doesPackageBelongToReseller(
  pkg: ISPPackage | null | undefined,
  reseller: { id?: string; code?: string; username?: string; name?: string } | null | undefined
): boolean {
  if (!pkg || !reseller) return false;

  const pResId = (pkg.resellerId || '').trim().toLowerCase();
  const pResCode = (pkg.resellerCode || '').trim().toLowerCase();
  const pResName = (pkg.resellerName || '').trim().toLowerCase();

  // If package has no reseller ID/code/name, it's a global ISP package, not owned by a specific reseller
  if (!pResId && !pResCode && !pResName) {
    return false;
  }

  const rId = (reseller.id || '').trim().toLowerCase();
  const rCode = (reseller.code || '').trim().toLowerCase();
  const rUsername = (reseller.username || '').trim().toLowerCase();
  const rName = (reseller.name || '').trim().toLowerCase();

  if (rId && (pResId === rId || pResCode === rId)) return true;
  if (rCode && (pResId === rCode || pResCode === rCode)) return true;
  if (rUsername && (pResId === rUsername || pResCode === rUsername)) return true;
  if (rName && pResName && (pResName === rName || pResName.includes(rName) || rName.includes(pResName))) return true;

  return false;
}

/**
 * Filter packages for a reseller:
 * - Packages owned by this reseller: INCLUDED
 * - Global ISP packages (no reseller ID): INCLUDED if includeGlobal is true
 * - Packages owned by ANOTHER reseller: STRICTLY EXCLUDED! (Zero cross-reseller leakage)
 */
export function filterPackagesForReseller(
  packages: ISPPackage[],
  reseller: { id?: string; code?: string; username?: string; name?: string } | null | undefined,
  includeGlobal: boolean = true
): ISPPackage[] {
  if (!reseller) {
    // If not a reseller, return global packages
    return packages.filter((p) => !p.resellerId && !p.resellerCode);
  }

  return packages.filter((pkg) => {
    // If owned by this reseller -> allow
    if (doesPackageBelongToReseller(pkg, reseller)) {
      return true;
    }

    // If it's a global ISP baseline package without any reseller assignment -> allow if includeGlobal
    if (includeGlobal && !pkg.resellerId && !pkg.resellerCode) {
      return true;
    }

    // If it belongs to ANY OTHER reseller -> STRICTLY HIDE!
    return false;
  });
}

/**
 * Strict Search Operator Company Authorization:
 * Checks whether a customer record is allowed to be viewed/searched by a specific search operator
 * based on the operator's allowedCompanies permissions set by the CEO.
 * 
 * Rules:
 * 1. If operator is suspended or not provided -> blocked.
 * 2. If operator has no allowedCompanies or empty list -> blocked from all customer records.
 * 3. If operator has 'ALL' -> permitted for all companies.
 * 4. Central company customers (no resellerId/resellerCode): only allowed if operator has 'central' / 'central_isp' / 'main' or company name.
 * 5. Reseller company customers (has resellerId/resellerCode): only allowed if operator has that specific reseller's ID or code.
 */
export function isCustomerAllowedForSearchOperator(
  customer: Customer | null | undefined,
  operator: SearchOperator | null | undefined,
  ispCompanyName?: string
): boolean {
  if (!customer || !operator) return false;

  // Suspended operators cannot view any data
  if (operator.status !== 'Active') return false;

  const allowed = operator.permissions?.allowedCompanies || [];

  // If no company permissions are configured, deny all access
  if (!allowed || allowed.length === 0) {
    return false;
  }

  // Master all-company access
  if (allowed.includes('ALL') || allowed.includes('*')) {
    return true;
  }

  const cResId = (customer.resellerId || '').trim().toLowerCase();
  const cResCode = (customer.resellerCode || '').trim().toLowerCase();
  const cResName = (customer.resellerName || '').trim().toLowerCase();

  const isCentralCustomer = !cResId && !cResCode && !cResName;

  if (isCentralCustomer) {
    const ispNameLower = (ispCompanyName || '').trim().toLowerCase();
    return allowed.some((perm) => {
      const p = perm.trim().toLowerCase();
      return (
        p === 'central' ||
        p === 'central_isp' ||
        p === 'main' ||
        (ispNameLower && p === ispNameLower)
      );
    });
  }

  // Reseller customer
  return allowed.some((perm) => {
    const p = perm.trim().toLowerCase();
    if (!p) return false;
    if (cResId && cResId === p) return true;
    if (cResCode && cResCode === p) return true;
    if (cResName && (cResName === p || cResName.includes(p) || p.includes(cResName))) return true;
    return false;
  });
}

export function filterCustomersForSearchOperator(
  customers: Customer[],
  operator: SearchOperator | null | undefined,
  ispCompanyName?: string
): Customer[] {
  if (!operator) return [];
  return customers.filter((c) => isCustomerAllowedForSearchOperator(c, operator, ispCompanyName));
}


