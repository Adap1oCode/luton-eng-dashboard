// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally-cards/edit/[id]/config.tsx
// TYPE: Configuration
// PURPOSE: Configuration for Edit Tally Card page
// -----------------------------------------------------------------------------

export const editTallyCardConfig = {
  title: "Edit Tally Card",
  description: "Edit existing Tally Card data",

  fields: {
    tally_card_number: {
      label: "Tally Card Number",
      type: "text",
      required: true,
      placeholder: "Enter Tally Card number",
    },
    description: {
      label: "Description",
      type: "textarea",
      required: false,
      placeholder: "Enter Tally Card description",
    },
    status: {
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "pending", label: "Pending" },
      ],
    },
  },

  validation: {
    tally_card_number: {
      minLength: 1,
      maxLength: 50,
      pattern: /^[A-Za-z0-9-_]+$/,
    },
    description: {
      maxLength: 500,
    },
  },
};
