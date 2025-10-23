// src/navigation/sidebar/sidebar-items.ts
import {
  Home,
  ChartPie,
  Grid2X2,
  ChartLine,
  ShoppingBag,
  BookA,
  Forklift,
  Mail,
  MessageSquare,
  Calendar,
  Kanban,
  ReceiptText,
  Users,
  Lock,
  Fingerprint,
  SquareArrowUpRight,
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
  requiredAny?: PermKeys; // ANY permission must match
  requiredAll?: PermKeys; // ALL permissions must match
  public?: boolean; // show even if user has no role/permissions
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
  {
    id: 1,
    label: "Dashboards",
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
            icon: BookA,
            requiredAny: ["menu:dashboard", "menu:dashboard:customers"]
          },
          { title: "Transactions", url: "/dashboard/transactions", icon: Forklift, comingSoon: true },
        ],
      },
    ],
  },
  {
    id: 1.5,
    label: "Requisitions",
    items: [
      {
        title: "Requisitions",
        url: "/dashboard",
        icon: Grid2X2,
        requiredAny: ["menu:dashboard", "menu:dashboard:requisitions"],
        subItems: [
          { title: "Requisitions", url: "/dashboard/requisitions", icon: Grid2X2, requiredAny: ["menu:dashboard", "menu:dashboard:requisitions"] },
          { title: "New Requisition", url: "/dashboard/requisitions/new", icon: Grid2X2, requiredAny: ["menu:dashboard", "menu:dashboard:requisitions"] },
          { title: "View All Requisitions", url: "/dashboard/requisitions/all", icon: Grid2X2, requiredAny: ["menu:dashboard", "menu:dashboard:requisitions"] },
        ],
      },
    ],
  },
  {
    id: 1.7,
    label: "Tally Card Manager",
    items: [
      {
        title: "Tally Card Manager",
        url: "/forms/tally-cards",
        icon: Grid2X2,
        requiredAny: ["menu:forms:tally_cards", "menu:forms:stock_adjustments", "menu:forms:user_tally_card_entries"],
        subItems: [
          {
            title: "Tally Cards",
            url: "/forms/tally-cards",
            icon: Grid2X2,
            requiredAny: ["menu:forms:tally_cards"],
          },
          {
            title: "Tally Cards (Current)",
            url: "/forms/tally-cards-current",
            icon: Grid2X2,
            requiredAny: ["menu:forms:tally_cards_current"],
          },
          { 
            title: "Stock Adjustments", 
            url: "/forms/stock-adjustments", 
            icon: Grid2X2,
            requiredAny: ["menu:forms:stock_adjustments"]
          },
          {
            title: "User Tally Card Entries",
            url: "/forms/user-tally-card-entries",
            icon: Grid2X2,
            requiredAny: ["menu:forms:user_tally_card_entries"],
          },
          {
            title: "Compare Stock Adjustments",
            url: "/forms/compare-stock-adjustments",
            icon: Grid2X2,
            requiredAny: ["menu:forms:stock_adjustments"], // Using same permission as stock adjustments
          },
        ],
      },
    ],
  },
  {
    id: 1.8,
    label: "Administration",
    items: [
      {
        title: "Administration",
        url: "/forms/users",
        icon: Users,
        requiredAny: ["menu:forms:users", "menu:forms:roles", "menu:forms:role_warehouse_rules", "menu:forms:warehouses"],
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
          {
            title: "Warehouses",
            url: "/forms/warehouses",
            icon: Grid2X2,
            requiredAny: ["menu:forms:warehouses"],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Pages",
    items: [
      {
        title: "Authentication",
        url: "/auth",
        icon: Fingerprint,
        public: true,
        subItems: [
          { title: "Login", url: "/auth/login", newTab: true, public: true },
          { title: "Register", url: "/auth/register", newTab: true, public: true },
          { title: "Login v1 (Legacy)", url: "/auth/v1/login", newTab: true, public: true },
          { title: "Register v1 (Legacy)", url: "/auth/v1/register", newTab: true, public: true },
        ],
      },
      { title: "Email", url: "/mail", icon: Mail, comingSoon: true },
      { title: "Chat", url: "/chat", icon: MessageSquare, comingSoon: true },
      { title: "Calendar", url: "/calendar", icon: Calendar, comingSoon: true },
      { title: "Kanban", url: "/kanban", icon: Kanban, comingSoon: true },
      { title: "Invoice", url: "/invoice", icon: ReceiptText, comingSoon: true },
      { title: "Users", url: "/users", icon: Users, comingSoon: true },
      { title: "Roles", url: "/roles", icon: Lock, comingSoon: true },
    ],
  },
  {
    id: 3,
    label: "Misc",
    items: [
      {
        title: "Others",
        url: "/others",
        icon: SquareArrowUpRight,
        comingSoon: true,
      },
    ],
  },
];
