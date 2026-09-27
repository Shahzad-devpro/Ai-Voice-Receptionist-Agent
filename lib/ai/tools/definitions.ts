import {
  Type,
  type FunctionDeclaration,
  type Tool,
} from "@google/genai";

const getBusinessInformation: FunctionDeclaration = {
  name: "getBusinessInformation",
  description:
    "Get authoritative information about the current business, including name, industry, contact information, address, timezone, currency, locale, service area, and business hours.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const getServices: FunctionDeclaration = {
  name: "getServices",
  description:
    "REQUIRED TOOL: Retrieve the current active services offered by the business represented by this receptionist. ALWAYS call this tool when the customer asks what services are offered, what services are available, which services the business provides, or asks about a specific service. Do not answer service-list questions from the system prompt or memory. The returned database data is the authoritative source.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const searchKnowledgeBase: FunctionDeclaration = {
  name: "searchKnowledgeBase",
  description:
    "Search the current business knowledge base for information needed to answer a customer question.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "The customer's question or keywords.",
      },
    },
    required: ["query"],
  },
};

const findCustomer: FunctionDeclaration = {
  name: "findCustomer",
  description:
    "Find an existing customer belonging to the current business using their phone number.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      phone: {
        type: Type.STRING,
        description:
          "Customer phone number. Provide the complete phone number supplied by the caller.",
      },
    },
    required: ["phone"],
  },
};

const createCustomer: FunctionDeclaration = {
  name: "createCustomer",
  description:
    "Create a new customer for the current business. For HVAC and CLEANING businesses, the customer's service address MUST be collected and provided before calling this tool. For DENTAL businesses, address is not required.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description:
          "Customer full name.",
      },
      phone: {
        type: Type.STRING,
        description:
          "Customer phone number.",
      },
      email: {
        type: Type.STRING,
        description:
          "Customer email address if provided.",
      },
      address: {
        type: Type.STRING,
        description:
          "Customer service address. REQUIRED for HVAC and CLEANING businesses.",
      },
    },
    required: ["name", "phone"],
  },
};

const updateCustomer: FunctionDeclaration = {
  name: "updateCustomer",
  description:
    "Update an existing customer belonging to the current business. Use this when an existing customer is missing information needed for the requested operation. For HVAC and CLEANING businesses, use this tool to save the customer's service address before booking an appointment. Never update a customer belonging to another business.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerId: {
        type: Type.STRING,
        description:
          "ID of the current-business customer returned by findCustomer or createCustomer.",
      },
      name: {
        type: Type.STRING,
        description:
          "Updated customer full name, if needed.",
      },
      phone: {
        type: Type.STRING,
        description:
          "Updated customer phone number, if needed.",
      },
      email: {
        type: Type.STRING,
        description:
          "Updated customer email address, if provided.",
      },
      address: {
        type: Type.STRING,
        description:
          "Customer service address. REQUIRED for HVAC and CLEANING businesses before booking.",
      },
    },
    required: ["customerId"],
  },
};

const createLead: FunctionDeclaration = {
  name: "createLead",
  description:
    "Create a lead for the current business.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerId: {
        type: Type.STRING,
        description:
          "ID of the current-business customer.",
      },
      serviceRequested: {
        type: Type.STRING,
        description:
          "Requested service.",
      },
      description: {
        type: Type.STRING,
        description:
          "Description of the customer's request.",
      },
    },
    required: [
      "customerId",
      "serviceRequested",
    ],
  },
};

const checkAvailability: FunctionDeclaration = {
  name: "checkAvailability",
  description:
    "Check whether a requested appointment slot is available. The server is the source of truth.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      serviceId: {
        type: Type.STRING,
        description:
          "ID of the requested service.",
      },
      requestedDate: {
        type: Type.STRING,
        description:
          "Date in YYYY-MM-DD format.",
      },
      requestedTime: {
        type: Type.STRING,
        description:
          "Time in HH:mm format using the business timezone.",
      },
    },
    required: [
      "serviceId",
      "requestedDate",
      "requestedTime",
    ],
  },
};

const bookAppointment: FunctionDeclaration = {
  name: "bookAppointment",
  description:
    "Book an appointment after the customer selects a slot. The server performs a final availability and customer-information check.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      serviceId: {
        type: Type.STRING,
        description:
          "ID of the requested service.",
      },
      customerId: {
        type: Type.STRING,
        description:
          "ID of the current-business customer.",
      },
      startTime: {
        type: Type.STRING,
        description:
          "Appointment start time as an ISO datetime in the business timezone.",
      },
    },
    required: [
      "serviceId",
      "customerId",
      "startTime",
    ],
  },
};

const saveCall: FunctionDeclaration = {
  name: "saveCall",
  description:
    "Save a completed customer call for the current business, including caller information, transcript, summary, outcome, duration, and related customer, lead, or appointment.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      callerPhone: {
        type: Type.STRING,
        description:
          "Caller phone number.",
      },
      customerId: {
        type: Type.STRING,
        description:
          "ID of the current-business customer, if known.",
      },
      transcript: {
        type: Type.STRING,
        description:
          "Full conversation transcript.",
      },
      summary: {
        type: Type.STRING,
        description:
          "Concise summary of the call.",
      },
      outcome: {
        type: Type.STRING,
        description:
          "Outcome of the call, such as information provided, lead created, appointment booked, or no action.",
      },
      appointmentId: {
        type: Type.STRING,
        description:
          "ID of the appointment created during the call, if applicable.",
      },
      leadId: {
        type: Type.STRING,
        description:
          "ID of the lead created during the call, if applicable.",
      },
      durationSeconds: {
        type: Type.NUMBER,
        description:
          "Call duration in seconds.",
      },
      startedAt: {
        type: Type.STRING,
        description:
          "Call start timestamp as an ISO datetime.",
      },
      endedAt: {
        type: Type.STRING,
        description:
          "Call end timestamp as an ISO datetime.",
      },
    },
  },
};

export const aiToolDefinitions: Tool[] = [
  {
    functionDeclarations: [
      getBusinessInformation,
      getServices,
      searchKnowledgeBase,
      findCustomer,
      createCustomer,
      updateCustomer,
      createLead,
      checkAvailability,
      bookAppointment,
      saveCall,
    ],
  },
];

