import RolesForm from "./roles-form";

export default async function Page({ searchParams }: { searchParams?: { id?: string } }) {
  const resolvedSearchParams = await searchParams;
  const initialRoleId = resolvedSearchParams?.id ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {" "}
      {/* تحسين الخلفية لتكون تدريجية وجذابة */}
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        {" "}
        {/* زيادة المسافات وزيادة العرض للحداثة */}
        {/* Page Header */}
        <NewRolePageHeader />
        {/* Toolbar */}
        <NewRoleToolbar />
        {/* Main Form */}
        <div className="rounded-xl bg-white shadow-md dark:bg-gray-800 dark:shadow-lg">
          {" "}
          {/* حواف مستديرة أكبر وشادو أقوى */}
          <RolesForm initialRoleId={initialRoleId} />
        </div>
      </div>
    </div>
  );
}

// Custom Page Header for New Role (عدلت الألوان والأيقونة)
function NewRolePageHeader() {
  return (
    <div className="rounded-xl bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <svg className="h-14 w-14 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
            {" "}
            {/* غيرت اللون لأزرق حديث */}
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21ZM14 10V12H16V10H14ZM16 14H14V16H16V14ZM20.5 18.5L19.09 17.09L15.5 20.68L13.91 19.09L12.5 20.5L15.5 23.5L20.5 18.5Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {" "}
            {/* زيادة حجم الخط للجاذبية */}
            Create New Role
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Add a new role with detailed permissions and warehouse assignments
          </p>
        </div>
      </div>
    </div>
  );
}

// Custom Toolbar for New Role (عدلت الألوان والتخطيط)
function NewRoleToolbar() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-md dark:bg-gray-800">
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        {" "}
        {/* زيادة المسافات */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-md bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
            {" "}
            {/* لون حديث */}
            New Role Form
          </div>
          <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            {" "}
            {/* إضافة لون أخضر جذاب */}
            Ready to Save
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-base text-gray-600 dark:text-gray-400">
            {" "}
            {/* زيادة حجم النص */}
            Fill in the required fields to create the role
          </div>
        </div>
      </div>
    </div>
  );
}
