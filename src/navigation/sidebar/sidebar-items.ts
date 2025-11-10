// src/navigation/sidebar/sidebar-items.ts
import {
  Home,
  ChartPie,
  ChartLine,
  ShoppingBag,
  Users,
  Mail,
  MessageSquare,
  Calendar,
  Kanban,
  ReceiptText,
  Lock,
  Fingerprint,
  SquareArrowUpRight,
  ListChecks,
  FilePlus,
  List,
  IdCard,
  Clock,
  ArrowLeftRight,
  GitCompare,
  Building2,
  LogIn,
  UserPlus,
  Grid2x2,
  MapPin,
  Package,
  type LucideIcon,
} from "lucide-react";

type PermKeys = string[];

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  subItems?: NavSubItem[];
  requiredAny?: PermKeys;
  requiredAll?: PermKeys;
  public?: boolean;
}

export interface NavMainItem extends Omit<NavSubItem, "subItems"> {
  subItems?: NavSubItem[];
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  // Dashboards
  {
    id: 1,
    items: [
      {
        title: "Dashboards",
        url: "/dashboard",
        icon: Home,
        requiredAny: ["menu:dashboard"],
        subItems: [
          { title: "Default", url: "/dashboard/default", icon: ChartPie, requiredAny: ["menu:dashboard"] },
          {
            title: "Purchase Orders",
            url: "/dashboard/purchase-orders",
            icon: ChartLine,
            requiredAny: ["menu:dashboard", "menu:dashboard:purchase_orders"]
          },
          {
            title: "Inventory",
            url: "/dashboard/inventory",
            icon: ShoppingBag,
            requiredAny: ["menu:dashboard", "menu:dashboard:inventory"]
          },
          {
            title: "Customers",
            url: "/dashboard/customers",
            icon: Users,
            requiredAny: ["menu:dashboard", "menu:dashboard:customers"]
          },
          { title: "Transactions", url: "/dashboard/transactions", icon: ArrowLeftRight, comingSoon: true },
        ],
      },
    ],
  },

  // Requisitions
  {
    id: 2,
    items: [
      {
        title: "Requisitions",
        url: "/dashboard/requisitions",
        icon: ListChecks,
        requiredAny: ["menu:dashboard", "menu:dashboard:requisitions"],
        subItems: [
          { title: "Requisitions", url: "/dashboard/requisitions", icon: ListChecks, requiredAny: ["menu:dashboard", "menu:dashboard:requisitions"] },
          { title: "New Requisition", url: "/dashboard/requisitions/new", icon: FilePlus, requiredAny: ["menu:dashboard", "menu:dashboard:requisitions"] },
          { title: "View All Requisitions", url: "/dashboard/requisitions/all", icon: List, requiredAny: ["menu:dashboard", "menu:dashboard:requisitions"] },
        ],
      },
    ],
  },

  // Inventory Manager
  {
    id: 3,
    items: [
      {
        title: "Unique Items",
        url: "/forms/unique-items",
        icon: Package,
        requiredAny: ["menu:forms:unique_items"],
        subItems: [
          {
            title: "Warehouses",
            url: "/forms/warehouses",
            icon: Building2,
            requiredAny: ["menu:forms:warehouses"],
          },
          {
            title: "Locations",
            url: "/forms/locations",
            icon: MapPin,
            requiredAny: ["menu:forms:locations"],
          },
          {
            title: "Compare Stock",
            url: "/forms/compare-stock",
            icon: GitCompare,
            requiredAny: ["menu:forms:compare_stock"],
          },
        ],
      },
    ],
  },

  // Tally Card Manager
  {
    id: 4,
    items: [
      {
        title: "Tally Card Manager",
        url: "/forms/tally-cards",
        icon: Grid2x2,
        requiredAny: ["menu:forms:tally_cards", "menu:forms:stock_adjustments", "menu:forms:user_tally_card_entries"],
        subItems: [
          {
            title: "Tally Cards",
            url: "/forms/tally-cards",
            icon: Grid2x2,
            requiredAny: ["menu:forms:tally_cards"],
          },
          {
            title: "Stock Adjustments",
            url: "/forms/stock-adjustments",
            icon: ArrowLeftRight,
            requiredAny: ["menu:forms:stock_adjustments"],
          },
          {
            title: "Compare Stock",
            url: "/forms/compare-stock-adjustments",
            icon: GitCompare,
            requiredAny: ["menu:forms:stock_adjustments"],
          },
        ],
      },
    ],
  },

  // Administration
  {
    id: 5,
    items: [
      {
        title: "Administration",
        url: "/forms/users",
        icon: Users,
        requiredAny: ["menu:forms:users", "menu:forms:roles", "menu:forms:role_warehouse_rules"],
        subItems: [
          {
            title: "Users",
            url: "/forms/users",
            icon: Users,
            requiredAny: ["menu:forms:users"],
          },
          {
            title: "Roles",
            url: "/forms/roles",
            icon: Lock,
            requiredAny: ["menu:forms:roles"],
          },
          {
            title: "Role-Warehouse Rules",
            url: "/forms/role-warehouse-rules",
            icon: Lock,
            requiredAny: ["menu:forms:role_warehouse_rules"],
          },
        ],
      },
    ],
  },

  // Authentication (public)
  {
    id: 6,
    items: [
      {
        title: "Authentication",
        url: "/auth",
        icon: Fingerprint,
        public: true,
        subItems: [
          { title: "Login", url: "/auth/login", icon: LogIn, newTab: true, public: true },
          { title: "Register", url: "/auth/register", icon: UserPlus, newTab: true, public: true },
          { title: "Login v1 (Legacy)", url: "/auth/v1/login", icon: LogIn, newTab: true, public: true },
          { title: "Register v1 (Legacy)", url: "/auth/v1/register", icon: UserPlus, newTab: true, public: true },
        ],
      },
    ],
  },

  // Coming Soon Features
  {
    id: 7,
    items: [
      { title: "Email", url: "/mail", icon: Mail, comingSoon: true },
      { title: "Chat", url: "/chat", icon: MessageSquare, comingSoon: true },
      { title: "Calendar", url: "/calendar", icon: Calendar, comingSoon: true },
      { title: "Kanban", url: "/kanban", icon: Kanban, comingSoon: true },
      { title: "Invoice", url: "/invoice", icon: ReceiptText, comingSoon: true },
      {
        title: "Others",
        url: "/others",
        icon: SquareArrowUpRight,
        comingSoon: true,
      },
    ],
  },
];