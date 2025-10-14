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

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  subItems?: NavSubItem[];
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
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
        subItems: [
          { title: "Default", url: "/dashboard/default", icon: ChartPie },
          { title: "Purchase Orders", url: "/dashboard/purchase-orders", icon: ChartLine },
          { title: "Inventory", url: "/dashboard/inventory", icon: ShoppingBag },
          { title: "Customers", url: "/dashboard/customers", icon: BookA },
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
        subItems: [
          { title: "Requisitions", url: "/dashboard/requisitions", icon: Grid2X2 },
          { title: "New Requisition", url: "/dashboard/requisitions/new", icon: Grid2X2 },
          { title: "View All Requisitions", url: "/dashboard/requisitions/all", icon: Grid2X2 },
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
        subItems: [
          { title: "Tally Cards", url: "/forms/tally-cards", icon: Grid2X2 },
          { title: "Stock Adjustments", url: "/forms/stock-adjustments", icon: Grid2X2 },
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
        subItems: [
          { title: "Login v1", url: "/auth/v1/login", newTab: true },
          { title: "Register v1", url: "/auth/v1/register", newTab: true },
        ],
      },
      {
        title: "Email",
        url: "/mail",
        icon: Mail,
        comingSoon: true,
      },
      {
        title: "Chat",
        url: "/chat",
        icon: MessageSquare,
        comingSoon: true,
      },
      {
        title: "Calendar",
        url: "/calendar",
        icon: Calendar,
        comingSoon: true,
      },
      {
        title: "Kanban",
        url: "/kanban",
        icon: Kanban,
        comingSoon: true,
      },
      {
        title: "Invoice",
        url: "/invoice",
        icon: ReceiptText,
        comingSoon: true,
      },
      {
        title: "Users",
        url: "/users",
        icon: Users,
        comingSoon: true,
      },
      {
        title: "Roles",
        url: "/roles",
        icon: Lock,
        comingSoon: true,
      },
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
